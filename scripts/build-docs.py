#!/usr/bin/env python3
"""build-docs.py — Antora documentation builder for OSx contracts.

Reads forge build artifacts (`out/<Contract>.sol/<Contract>.json`), expands the
`{{ContractName}}` placeholders in `src/{core,framework}/README.adoc`, and
writes:

    docs/modules/api/pages/<section>.adoc   (one per template)
    docs/modules/api/nav.adoc               (Antora convention: one level up)

Run via `just build-docs` (which invokes `forge build --ast` first). Stdlib only.
"""

from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "out"
DOCS_PAGES_DIR = ROOT / "docs" / "modules" / "api" / "pages"
TEMPLATES = [
    (ROOT / "src" / "core" / "README.adoc", "core"),
    (ROOT / "src" / "framework" / "README.adoc", "framework"),
]
GITHUB_REPO = "https://github.com/aragon/osx"
# Override with `GITHUB_REF=v1.4.0` (or any tag/commit) to pin source links
# to a specific release. Defaults to `main`.
GITHUB_REF = os.environ.get("GITHUB_REF", "main")

NAV_TITLE_OVERRIDES = {
    "metatx": "Meta Transactions",
    "common": "Common (Tokens)",
}

# ---------------------------------------------------------------------------
# AST + artifact loading


@dataclass
class Member:
    """One declared member (function, event, error, state var, modifier)."""

    kind: str  # 'function' | 'event' | 'error' | 'modifier' | 'state'
    name: str
    signature: str  # canonical like "execute(bytes32,uint256)"
    inputs: list[dict]  # ABI inputs
    outputs: list[dict]  # ABI outputs (for functions)
    notice: str = ""
    details: str = ""
    params: dict[str, str] = field(default_factory=dict)
    returns: dict[str, str] = field(default_factory=dict)
    state_mutability: str = ""
    visibility: str = ""  # external/public/internal/private
    var_type: str = ""  # for state vars
    declared_in: str = ""  # contract name where declared


@dataclass
class Contract:
    """One contract definition (resolved across artifacts)."""

    name: str
    source_path: str  # e.g. "src/core/dao/DAO.sol"
    kind: str  # 'contract' | 'interface' | 'library'
    notice: str = ""
    linearized_bases: list[str] = field(default_factory=list)  # ordered, includes self
    members: list[Member] = field(default_factory=list)


def load_all_contracts() -> dict[str, Contract]:
    """Walk out/ artifacts; for each contract, build a Contract object.

    The AST gives us per-contract member declarations + linearizedBaseContracts.
    We merge ABI/userdoc/devdoc to enrich each member with natspec.
    """
    by_id: dict[int, dict] = {}  # AST contract id -> {name, source, ...}
    contracts: dict[str, Contract] = {}

    if not OUT_DIR.exists():
        sys.stderr.write(f"out/ not found at {OUT_DIR}; run `forge build` first.\n")
        sys.exit(1)

    # First pass: collect every contract's AST node by id
    for sol_dir in OUT_DIR.iterdir():
        if not sol_dir.is_dir() or not sol_dir.name.endswith(".sol"):
            continue
        for jf in sol_dir.glob("*.json"):
            try:
                art = json.loads(jf.read_text())
            except Exception:
                continue
            ast = art.get("ast")
            if not ast:
                continue
            source_path = ast.get("absolutePath", "")
            for node in ast.get("nodes", []):
                if node.get("nodeType") != "ContractDefinition":
                    continue
                cid = node["id"]
                by_id[cid] = {
                    "name": node["name"],
                    "source": source_path,
                    "kind": node.get("contractKind", "contract"),
                    "linearized": node.get("linearizedBaseContracts", []),
                    "ast_node": node,
                    "artifact": art,
                    "artifact_file": str(jf),
                }

    # Second pass: build Contract objects, only for contracts with their own
    # artifact (i.e., where the artifact filename matches the contract name)
    for info in by_id.values():
        art_path = Path(info["artifact_file"])
        if art_path.stem != info["name"]:
            continue  # this artifact wasn't generated for this contract specifically

        metadata = json.loads(info["artifact"].get("rawMetadata") or "{}")
        out_md = metadata.get("output", {})
        userdoc = out_md.get("userdoc", {}) or {}
        devdoc = out_md.get("devdoc", {}) or {}

        # Contract description: prefer the @dev (devdoc.details) since that's
        # what solidity-docgen surfaces, falling back to the @notice. We
        # deliberately do NOT use devdoc.title — it's almost always just the
        # contract name, which is already shown in the heading.
        contract = Contract(
            name=info["name"],
            source_path=info["source"],
            kind=info["kind"],
            notice=devdoc.get("details") or userdoc.get("notice") or "",
            linearized_bases=[
                by_id[b]["name"] for b in info["linearized"] if b in by_id
            ],
        )

        # Resolve members from each contract in linearized chain
        for base_id in info["linearized"]:
            base = by_id.get(base_id)
            if not base:
                continue
            for m in extract_members(base, devdoc, userdoc):
                # Avoid duplicates (overrides) — keep first occurrence (most-derived)
                if not any(
                    e.signature == m.signature and e.kind == m.kind
                    for e in contract.members
                ):
                    contract.members.append(m)

        contracts[info["name"]] = contract

    return contracts


def extract_members(base: dict, devdoc: dict, userdoc: dict) -> list[Member]:
    """Extract member declarations from a contract's AST node."""
    out: list[Member] = []
    base_name = base["name"]

    for n in base["ast_node"].get("nodes", []):
        nt = n.get("nodeType")
        if nt == "FunctionDefinition":
            # Match solidity-docgen: skip private functions (they're not part
            # of the contract's documented API). Constructors / receive / fallback
            # share the function render path; only their `name` differs (taken
            # from `kind` when there's no explicit name).
            if n.get("visibility") == "private":
                continue
            name = n.get("name") or n.get("kind") or "function"
            inputs = ast_params(n.get("parameters", {}).get("parameters", []))
            outputs = ast_params(n.get("returnParameters", {}).get("parameters", []))
            sig = canonical_sig(name, inputs)
            ndev = devdoc.get("methods", {}).get(sig, {}) if devdoc else {}
            nuser = userdoc.get("methods", {}).get(sig, {}) if userdoc else {}
            out.append(
                Member(
                    kind="function",
                    name=name,
                    signature=sig,
                    inputs=inputs,
                    outputs=outputs,
                    notice=nuser.get("notice", "") if isinstance(nuser, dict) else "",
                    details=ndev.get("details", "") if isinstance(ndev, dict) else "",
                    params=ndev.get("params", {}) if isinstance(ndev, dict) else {},
                    returns=ndev.get("returns", {}) if isinstance(ndev, dict) else {},
                    state_mutability=n.get("stateMutability", ""),
                    visibility=n.get("visibility", ""),
                    declared_in=base_name,
                )
            )
        elif nt == "EventDefinition":
            inputs = ast_params(n.get("parameters", {}).get("parameters", []))
            sig = canonical_sig(n["name"], inputs)
            nev_user = userdoc.get("events", {}).get(sig, {}) if userdoc else {}
            nev_dev = devdoc.get("events", {}).get(sig, {}) if devdoc else {}
            out.append(
                Member(
                    kind="event",
                    name=n["name"],
                    signature=sig,
                    inputs=inputs,
                    outputs=[],
                    notice=nev_user.get("notice", "")
                    if isinstance(nev_user, dict)
                    else "",
                    details=nev_dev.get("details", "")
                    if isinstance(nev_dev, dict)
                    else "",
                    params=nev_dev.get("params", {})
                    if isinstance(nev_dev, dict)
                    else {},
                    declared_in=base_name,
                )
            )
        elif nt == "ErrorDefinition":
            inputs = ast_params(n.get("parameters", {}).get("parameters", []))
            sig = canonical_sig(n["name"], inputs)
            ner_user = userdoc.get("errors", {}).get(sig, [{}])[0] if userdoc else {}
            ner_dev = devdoc.get("errors", {}).get(sig, [{}])[0] if devdoc else {}
            out.append(
                Member(
                    kind="error",
                    name=n["name"],
                    signature=sig,
                    inputs=inputs,
                    outputs=[],
                    notice=ner_user.get("notice", "")
                    if isinstance(ner_user, dict)
                    else "",
                    details=ner_dev.get("details", "")
                    if isinstance(ner_dev, dict)
                    else "",
                    params=ner_dev.get("params", {})
                    if isinstance(ner_dev, dict)
                    else {},
                    declared_in=base_name,
                )
            )
        elif nt == "ModifierDefinition":
            inputs = ast_params(n.get("parameters", {}).get("parameters", []))
            sig = canonical_sig(n["name"], inputs)
            out.append(
                Member(
                    kind="modifier",
                    name=n["name"],
                    signature=sig,
                    inputs=inputs,
                    outputs=[],
                    visibility=n.get("visibility", ""),
                    declared_in=base_name,
                )
            )
        elif nt == "VariableDeclaration":
            # State variable. Skip non-state vars and private state (matches
            # solidity-docgen, which omits private storage slots from the API
            # docs since they aren't part of the contract's external surface).
            if not n.get("stateVariable", False):
                continue
            if n.get("visibility") == "private":
                continue
            t = n.get("typeDescriptions", {}).get("typeString", "")
            out.append(
                Member(
                    kind="state",
                    name=n["name"],
                    signature=f"{n['name']}-{t}",
                    inputs=[],
                    outputs=[],
                    var_type=t,
                    visibility=n.get("visibility", "internal"),
                    state_mutability="constant"
                    if n.get("constant")
                    else ("immutable" if n.get("mutability") == "immutable" else ""),
                    declared_in=base_name,
                )
            )
    return out


def ast_params(params: list[dict]) -> list[dict]:
    """Convert AST parameter list to a uniform dict shape."""
    out = []
    for p in params:
        td = p.get("typeDescriptions", {})
        out.append(
            {
                "name": p.get("name", ""),
                "type": td.get("typeString", ""),
                "internalType": td.get("typeIdentifier", ""),
            }
        )
    return out


def canonical_sig(name: str, inputs: list[dict]) -> str:
    """Canonical signature like solc emits: execute(bytes32,uint256)."""

    def to_canon(t: str) -> str:
        # Strip 'struct ', 'contract ', 'enum ' prefixes used by typeString
        t = re.sub(r"^(struct|contract|enum)\s+", "", t)
        # Drop storage location qualifiers
        t = re.sub(r"\s+(memory|calldata|storage|payable)\b", "", t)
        return t.strip()

    types = ",".join(to_canon(p.get("type", "")) for p in inputs)
    return f"{name}({types})"


# ---------------------------------------------------------------------------
# Asciidoc rendering


def slugify_id(contract: str, member: Member) -> str:
    """Anchor ID for a member.

    Always keyed by the contract that DECLARED the member (`member.declared_in`),
    not the contract currently being documented. Solidity-docgen does the same:
    inherited members keep their original contract's anchor so links are stable
    across pages, and the same anchor doesn't collide when an inherited member
    appears in the index of a child contract and the body of its parent.
    The `contract` argument is used only as a fallback when `declared_in` is unset.
    """
    base_contract = member.declared_in or contract
    base = f"{base_contract}-{member.name}"
    if member.kind == "state":
        return f"{base}-{slug_type(member.var_type)}"
    if not member.inputs:
        return f"{base}--"
    parts = "-".join(slug_type(p["type"]) for p in member.inputs)
    return f"{base}-{parts}-"


def slug_type(t: str) -> str:
    """Encode a type string into URL-safe slug parts.

    Matches solidity-docgen's convention: strip storage-location qualifiers,
    then replace every non-alphanumeric character (incl. spaces, brackets,
    parens, commas, dots, `=>`) with `-`. Examples:
      `uint8[3]`                       -> `uint8-3-`
      `struct Action[]`                -> `struct-Action--`
      `mapping(bytes4 => bytes4)`      -> `mapping-bytes4----bytes4-`
      `struct PermissionLib.X[]`       -> `struct-PermissionLib-X--`
    """
    t = re.sub(r"\s+(memory|calldata|storage|payable)\b", "", t).strip()
    return re.sub(r"[^a-zA-Z0-9]", "-", t)


def fmt_pretty_inputs(inputs: list[dict]) -> str:
    """Pretty input list for Asciidoc display: 'bytes _metadata, uint256 _x'."""
    return ", ".join(f"{strip_loc(p['type'])} {p['name']}".strip() for p in inputs)


def fmt_pretty_outputs(outputs: list[dict]) -> str:
    if not outputs:
        return ""
    parts = []
    for p in outputs:
        if p.get("name"):
            parts.append(f"{strip_loc(p['type'])} {p['name']}")
        else:
            parts.append(strip_loc(p["type"]))
    return ", ".join(parts)


def strip_loc(t: str) -> str:
    return re.sub(r"\s+(memory|calldata|storage|payable)\b", "", t).strip()


def fmt_index_entry(contract: str, m: Member) -> str:
    """One bullet in the index, written as an Asciidoc attribute reference.

    Uses `{xref-<sid>}` which expands (via the `:xref-...:` attribute
    definitions emitted at the top of each file) to a fully-qualified
    `xref:<section>.adoc#<sid>` macro. Critical for cross-file links
    (e.g., a link in framework.adoc pointing at a DAO member in core.adoc):
    a same-file-only `xref:#<sid>` would silently fail across pages.
    """
    sid = slugify_id(contract, m)
    if m.kind == "state":
        label = f"{strip_loc(m.var_type)} {m.name}"
        if m.state_mutability == "constant":
            label = f"{strip_loc(m.var_type)} constant {m.name}"
        return f"* {{xref-{sid}}}[`++{label}++`]"
    name_args = f"{m.name}({format_arg_names(m.inputs)})"
    return f"* {{xref-{sid}}}[`++{name_args}++`]"


def format_arg_names(inputs: list[dict]) -> str:
    return ", ".join(p["name"] for p in inputs if p.get("name"))


def render_index_block(
    contract: Contract,
    kinds: list[str],
    heading: str,
    contracts: dict[str, Contract],
) -> list[str]:
    """Render a `[.contract-index] .Heading` block.

    Solidity-docgen quirks we replicate:
    - Modifiers section shows only the contract's own modifiers; inherited
      modifiers are not listed (they aren't part of the contract's API surface
      from the user's perspective — the contract's own functions might apply
      them, but the modifier itself belongs to its declaring contract's docs).
    - For inherited members from contracts whose source lives outside `src/`
      (i.e., in `lib/`: OpenZeppelin, ENS, etc.), emit only the
      `.contract-subindex-inherited .ParentName` heading without member items.
      Their natspec isn't in our build context anyway.
    """
    is_modifier_section = kinds == ["modifier"]

    members = [m for m in contract.members if m.kind in kinds]
    if not members:
        return []
    out = ["[.contract-index]", f".{heading}", "--"]

    # Members declared in THIS contract
    own = [m for m in members if m.declared_in == contract.name]
    for m in own:
        out.append(fmt_index_entry(contract.name, m))

    # Inherited members are not listed in the Modifiers section.
    if not is_modifier_section:
        for parent in (b for b in contract.linearized_bases if b != contract.name):
            parent_is_external = _is_external_contract(parent, contracts)
            inherited = [m for m in members if m.declared_in == parent]

            if parent_is_external:
                # Heading-only block: we know about the inheritance but don't
                # have natspec for the parent's members in our build context.
                out.append("")
                out.append("[.contract-subindex-inherited]")
                out.append(f".{parent}")
                continue

            if not inherited:
                continue
            out.append("")
            out.append("[.contract-subindex-inherited]")
            out.append(f".{parent}")
            for m in inherited:
                out.append(fmt_index_entry(contract.name, m))

    out.append("--")
    out.append("")
    return out


def _is_external_contract(name: str, contracts: dict[str, Contract]) -> bool:
    """Whether a contract lives outside our project source (i.e., in lib/).

    External contracts get heading-only treatment in inheritance index blocks.
    """
    c = contracts.get(name)
    if c is None:
        # Unknown contract — assume external (safer; avoids emitting bogus xrefs).
        return True
    return c.source_path.startswith("lib/")


def render_member_detail(contract: Contract, m: Member) -> list[str]:
    """Detailed item block for one member."""
    sid = slugify_id(contract.name, m)
    out = ["[.contract-item]", f"[[{sid}]]"]

    if m.kind == "state":
        label = f"{strip_loc(m.var_type)} {m.name}"
        if m.state_mutability == "constant":
            label = f"{strip_loc(m.var_type)} constant {m.name}"
        out.append(
            f"==== `[.contract-item-name]#++{m.name}++#++() → {strip_loc(m.var_type)}++` "
            f"[.item-kind]#{m.visibility}#"
        )
    else:
        inputs = fmt_pretty_inputs(m.inputs)
        outputs = fmt_pretty_outputs(m.outputs)
        arrow = f" → {outputs}" if outputs else ""
        kind_label = {
            "function": m.state_mutability or m.visibility or "function",
            "modifier": "modifier",
            "event": "event",
            "error": "error",
        }.get(m.kind, m.kind)
        # Functions: kind label is visibility/state-mutability per solidity-docgen
        if m.kind == "function":
            kind_label = m.visibility or "external"
            if m.state_mutability in ("view", "pure", "payable"):
                # solidity-docgen shows visibility primarily; keep simple
                kind_label = m.visibility or kind_label
        out.append(
            f"==== `[.contract-item-name]#++{m.name}++#++({inputs}){arrow}++` "
            f"[.item-kind]#{kind_label}#"
        )

    out.append("")
    if m.notice:
        out.append(m.notice)
        out.append("")
    if m.details:
        out.append(m.details)
        out.append("")
    return out


def render_contract(contract: Contract, contracts: dict[str, Contract]) -> list[str]:
    """Render one contract's section (header + indices + per-item details)."""
    out = []
    src = contract.source_path
    out.append("[.contract]")
    out.append(f"[[{contract.name}]]")
    out.append(
        f"=== `++{contract.name}++` "
        f"link:{GITHUB_REPO}/blob/{GITHUB_REF}/{src}[{{github-icon}},role=heading-link]"
    )
    out.append("")
    if contract.notice:
        out.append(contract.notice)
        out.append("")

    out.extend(render_index_block(contract, ["modifier"], "Modifiers", contracts))
    out.extend(render_index_block(contract, ["function"], "Functions", contracts))
    out.extend(render_index_block(contract, ["event"], "Events", contracts))
    out.extend(render_index_block(contract, ["error"], "Errors", contracts))
    out.extend(render_index_block(contract, ["state"], "Internal Variables", contracts))

    # Per-item details — only members declared in THIS contract. Inherited
    # members appear in the indexes (with xrefs to their parent's section)
    # but don't get duplicate detail blocks, matching solidity-docgen.
    for m in contract.members:
        if m.declared_in != contract.name:
            continue
        out.extend(render_member_detail(contract, m))

    return out


# Order in which xref attribute definitions appear at the top of each output file.
# Matches solidity-docgen's emission order so URL-prefixed xrefs are grouped by kind.
XREF_KIND_ORDER = ["modifier", "function", "state", "event", "error"]


def render_template(
    template_path: Path, contracts: dict[str, Contract], section: str
) -> str:
    """Read a template, expand {{ContractName}} placeholders.

    `section` is the output filename stem (e.g. "core" -> "core.adoc"); it's used
    to qualify xref attribute values so cross-file references resolve correctly.
    """
    text = template_path.read_text()

    def repl(match: re.Match) -> str:
        name = match.group(1)
        if name not in contracts:
            return f"// Contract {name} not found in artifacts\n"
        return "\n".join(render_contract(contracts[name], contracts))

    body = re.sub(r"\{\{(\w+)\}\}", repl, text)

    # Prepend xref attribute definitions, grouped by kind in the same order
    # solidity-docgen emits: modifiers, functions, state vars, events, errors.
    # Each member's xref is keyed by `declared_in` (so inherited members get
    # their parent contract's anchor, not the documenting contract's), and we
    # de-dup since the same inherited member appears across multiple
    # documenting contracts in the same file.
    referenced = re.findall(r"\{\{(\w+)\}\}", text)
    seen: set[str] = set()
    xrefs = []
    for name in referenced:
        if name not in contracts:
            continue
        for kind in XREF_KIND_ORDER:
            for m in contracts[name].members:
                if m.kind != kind:
                    continue
                # Match the index-block filters: no inherited modifiers, and
                # no members from external (lib/) parents.
                if m.declared_in != name:
                    if m.kind == "modifier":
                        continue
                    if _is_external_contract(m.declared_in, contracts):
                        continue
                sid = slugify_id(name, m)
                if sid in seen:
                    continue
                seen.add(sid)
                xrefs.append(f":xref-{sid}: xref:{section}.adoc#{sid}")
    header = ':github-icon: pass:[<svg class="icon"><use href="#github-icon"/></svg>]'
    if xrefs:
        return header + "\n" + "\n".join(xrefs) + "\n" + body
    return header + "\n" + body


# ---------------------------------------------------------------------------
# Nav generation


def build_nav(pages_dir: Path) -> str:
    """Walk pages_dir for *.adoc files and produce a nav.adoc index."""
    if not pages_dir.exists():
        return ".API\n"

    entries = []
    for adoc in sorted(pages_dir.glob("**/*.adoc"), key=lambda p: p.name.lower()):
        if adoc.name == "nav.adoc":
            continue
        rel = adoc.relative_to(pages_dir).as_posix()
        title_key = adoc.stem
        title = NAV_TITLE_OVERRIDES.get(title_key, title_key.replace("-", " ").title())
        entries.append((title.lower(), f"* xref:{rel}[{title}]"))
    entries.sort(key=lambda x: x[0])
    return ".API\n" + "\n".join(line for _, line in entries) + "\n"


# ---------------------------------------------------------------------------
# Main


def main() -> int:
    if not OUT_DIR.exists():
        sys.stderr.write("ERROR: out/ not found. Run `forge build` first.\n")
        return 1

    sys.stderr.write("Loading artifacts...\n")
    contracts = load_all_contracts()
    sys.stderr.write(f"  {len(contracts)} contracts loaded\n")

    DOCS_PAGES_DIR.mkdir(parents=True, exist_ok=True)

    for tmpl, section in TEMPLATES:
        if not tmpl.exists():
            sys.stderr.write(f"  skipping missing template {tmpl}\n")
            continue
        sys.stderr.write(f"  rendering {section}.adoc from {tmpl.name}...\n")
        rendered = render_template(tmpl, contracts, section)
        target = DOCS_PAGES_DIR / f"{section}.adoc"
        target.write_text(rendered)

    sys.stderr.write("Generating nav.adoc...\n")
    nav = build_nav(DOCS_PAGES_DIR)
    # nav.adoc lives one level up from pages/ — Antora convention
    (DOCS_PAGES_DIR.parent / "nav.adoc").write_text(nav)

    sys.stderr.write(f"Done. Output at {DOCS_PAGES_DIR}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
