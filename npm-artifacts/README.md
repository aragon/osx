# Aragon OSx artifacts

This package contains the ABI definitions of the OSx contracts, as well as the address of the protocol instances deployed on each network.

Install it with:

```sh
bun add @aragon/osx-artifacts
# or: pnpm add @aragon/osx-artifacts
```

## Usage

```typescript
// ABI definitions
import {
    DAOABI,
    IDAOABI,
    DAOFactoryABI,
    DAORegistryABI,
    PluginRepoABI,
    PluginRepoFactoryABI,
    PluginRepoRegistryABI,
    PluginSetupProcessorABI,
    PermissionManagerABI,
    MemberRegistryABI
} from "@aragon/osx-artifacts";

console.log("DAO ABI", DAOABI);

// Protocol addresses per-network
import { addresses } from "@aragon/osx-artifacts";

console.log(addresses.daoFactory.mainnet);
```

You can also open [addresses.json](./src/addresses.json) directly.

## Development

This package is built with [`just`](https://github.com/casey/just) and [`bun`](https://bun.sh).

### Refresh ABIs

```sh
just abi   # regenerate src/abi.ts from forge build artifacts at the repo root
```

`src/abi.ts` is populated by `bash prepare-abi.sh`, which runs `forge build` at the repo root and emits one `export const <Contract>ABI = [...] as const` per `src/` contract with a non-empty ABI. Bytecode and the legacy `<Contract>` class wrappers (deprecated since 1.4.x) are not emitted — use the ABI const + the address from `addresses.json` directly.

### Address curation

`src/addresses.json` is **hand-curated**. This package is the source of truth for OSx-core deployed addresses. Each plugin publishes its own addresses in its own `@aragon/<plugin>-plugin-artifacts` package; OSx-core only ships the keys listed here.

To add a chain or update an address, edit the JSON directly in your PR and document the rationale in the commit/PR message.

The intended long-term flow (proposed; not yet automated — see `PLAN.md` "Pending cross-team actions"):

```
protocol-factory deploys to chain X (producer; single writer)
    ↓ writes new addresses to each affected source-of-truth package:
    ├── aragon/osx              → npm-artifacts/src/addresses.json   (OSx-core)
    └── aragon/<plugin>-X (×N)  → npm-artifacts/src/addresses.json   (per affected plugin)

aragon/just-foundry (consumer; pulls)
    └─▶ syncs *_ADDRESS lines in networks/<chain>.env from each upstream addresses.json.
        Operator-curated chain runtime (RPC_URL, CHAIN_ID, VERIFIER, EVM version) is
        untouched — that data isn't a deploy output.
```

`protocol-factory` is producer-only; every other store derives from the per-protocol artifacts package. Until protocol-factory ships the fan-out and just-foundry ships the pull-sync, deploy authors update each store manually.

### Build

```sh
just build
```

Regenerates `src/abi.ts`, installs dependencies via `bun`, then runs `tsc` to produce `dist/`.

### Publishing flow

```
deployment lands → addresses.json patched (PR) + ABIs in sync (just abi if src/ contracts changed)
    ↓
cd npm-artifacts && just build
    ↓
bun publish
```

CI (`.github/workflows/publish-artifacts.yml`) automates the build + publish on `vX.Y.Z` tag push (or via `workflow_dispatch` for re-publishing an existing tag).

## Documentation

[Aragon's developer portal](https://docs.aragon.org).

## Contributing

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) in the main repository.

## Security

If you believe you've found a security issue, please email **sirt@aragon.org**. Don't use the public issue tracker.
