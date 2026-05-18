# Contributing to Aragon OSx

Issues, pull requests, and discussion are welcome. For non-trivial changes, please open an issue first so we can align on direction before code.

## Security

**Do not open a public issue for security vulnerabilities.** Email **sirt@aragon.org** instead.

You're likely dealing with a security issue if either is true:

- You can access or alter something that isn't yours, or that you shouldn't have access to.
- You can disable something for other users.

If unsure, err on the side of emailing.

## Issues

Use the [issue tracker](https://github.com/aragon/osx/issues). Include the network, contract version, and a transaction hash if applicable.

## Pull requests

- Tests are required for any behavioral change. Storage layout changes additionally require regression tests and a fork-based integration test.
- If a change affects downstream consumers (subgraph, SDK, App), coordinate or flag the dependency.
- Bump the protocol version per the SemVer classification below when relevant.
- API docs at `docs/modules/api/` are auto-generated from natspec. After changing a contract's public surface, run `just build-docs` and commit the regenerated `.adoc` files. CI fails if they're out of date.

---

## SemVer classification of contract changes

OSx uses [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`). Smart contracts have specific upgrade and storage-layout constraints, so the classification rules below take precedence over generic library conventions.

### Quick rule

- **MAJOR** — incompatible changes: storage layout shifts, external function header changes, event header changes, function/event removal, enum reordering or removal.
- **MINOR** — backwards-compatible additions: new external functions, new events, storage appended at the end, enum values appended.
- **PATCH** — backwards-compatible fixes: internal function changes, custom error tweaks, constant/immutable adjustments, compiler-version bumps where the ABI is unaffected.

### Classification table

| Change | SemVer | Notes |
|---|---|---|
| Storage layout change (existing slots) | MAJOR | Storage corruption risk, potential exploits |
| Inheritance change (add/change/remove parent) | MAJOR | Storage corruption in upgradeables |
| Event header change or removal | MAJOR | Subgraph + SDK + App must adapt |
| External function header change or removal | MAJOR | Breaks `interfaceId`; downstream contracts must adapt |
| Enum reorder or removal | MAJOR | Wrong values, potential exploits |
| Storage addition (strictly appended) | MINOR | Reduce storage gap; bump initializer version |
| Event addition | MINOR | Subgraph adaptation needed |
| External function addition | MINOR | Public constants/immutables also change `interfaceId` |
| Enum addition (appended) | MINOR / PATCH | Downstream may need to handle the new value |
| External function body change | MAJOR / MINOR / PATCH | Depends on observable behavior (see below) |
| Internal function change | MINOR / PATCH | Depends on whether observable behavior changes |
| Custom error (any) | PATCH | Adapt SDK/App if it handles them |
| Constant / immutable change | PATCH | Public ones change `interfaceId` |
| Compiler version | depends | Investigate vulnerability impact and pragma effects |
| File path change | PATCH | Inheriting contracts and downstream consumers must adapt |

### Detailed guidance

**Storage**

- Append new slots strictly at the end. For structs in mappings, append at the end of the struct. Arrays may break storage — investigate.
- Reduce the upgradeable contract's storage gap when adding slots.
- Storage **change** of an existing slot should be avoided; allowed only via controlled re-initialization (`initializeFrom` / `upgradeToAndCall`).
- Storage **removal** must never happen — it shifts the layout. Exception: explicit deprecation.
- Required tests: unit (slot is set + initialized), regression (no corruption on upgrade), fork-based integration (apply update on the management DAO).

**Inheritance**

Adding/changing a base class is rarely safe in upgradeable contracts because the base usually introduces storage and needs its own gap. New contracts must inherit the previous implementation; affected methods must be `virtual`; avoid double-initialization. See OpenZeppelin's [multiple inheritance notes](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance).

**External function body change**

Classification follows observable behavior:

- MAJOR — additional reverting checks; different external/internal calls; changed storage logic.
- MINOR — storing new values without breaking existing flows.
- PATCH — gas optimizations or pure simplification with no observable change.

**Events**

- Addition: adapt subgraph handler + tests.
- Change (add fields): downstream code must tolerate absent fields on old events. Non-upgradeable contracts: deploy a new contract; subgraph listens to both.
- Renaming: adapt subgraph and SDK to the new ABI.

**Enums**

Don't affect the ABI / `interfaceId`, but reordering or removing values silently changes semantics where the enum is used as a key, value, or condition. Treat reorder/remove as MAJOR.

**Compiler version**

Driven by either a [known vulnerability](https://docs.soliditylang.org/en/latest/bugs.html) in the current pragma, or new features. Affected contracts must be redeployed; some pragma jumps create incompatibilities with internal/external dependents.
