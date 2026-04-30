# Aragon OSx artifacts

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v1.5.0

### Added

- ABI for `MemberRegistry` (`MemberRegistryABI`) — the new ENS-subdomain member registry.
- New top-level address keys: `managementDao`, `managementDaoMultisig`. Currently populated for the 13 chiains where the data was available at release time; other chains will fill in via subsequent deploy PRs.
- Coverage for `chiliz` and `katana` across the legacy address keys (`dao`, `daoFactory`, `daoRegistry`, `pluginRepoFactory`, `pluginRepoRegistry`, `pluginSetupProcessor`). `executor.{chiliz,katana}` is intentionally an empty string — the singleton has no on-chain getter, address must come from the protocol-factory deploy log.

### Changed

- Build pipeline migrated to `just` + `bun` + `forge`.
- `npm`/`yarn` are no longer used.
- Run `just abi` to regenerate `src/abi.ts` from forge artifacts at the repo root; `just build` chains that + `tsc`.
- **`src/addresses.json` is now hand-curated** — this package is the source of truth for OSx-core deployed addresses. The previous auto-sync from `lib/just-foundry/networks/*.env` is gone (`sync-addresses.sh` removed). To add a chain or update an address, edit the JSON directly. Long-term, protocol-factory will fan-out updates to this repo + each plugin repo + just-foundry as part of its deploy ceremony — see `PLAN.md` "Pending cross-team actions".

### Breaking

- **Dropped legacy `<Contract>` class wrappers** (deprecated since v1.4.0). Each contract previously exposed both a `<Contract>ABI` const and a `<Contract>` class wrapping the ABI + bytecode; only the ABI const is exported now. Migrate via `import { DAOABI } from "@aragon/osx-artifacts"` and feed it to your tooling (viem/wagmi/ethers) directly.
- **Dropped `bytecode` field**. The package no longer ships compiled bytecode. If you need bytecode, build the contracts from source (this repo) — `forge build` produces it under `out/`. The artifacts package is now ABI + addresses only.

## v1.4.5

- Added Avalanche
- Added Base Sepolia

## v1.4.4

- Added Avalance Testnet
- Added Corn

## v1.4.3

- Added Optimism

## v1.4.2

- Added Celo

## v1.4.1

## v1.4.0

### Changed

- Shipping the ABI and addresses for OSx v1.4
- Marking `ContractName.abi` and `ContractName.bytecode` as deprecated
- Note: certain contracts that were previously exported and were not really related to OSx are no longer present.

## v1.3.0

### Added

- Shipping the artifacts for OSx v1.3
