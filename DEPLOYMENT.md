# Deployment

This repository hosts **component-level** deploy and upgrade scripts (e.g., `MemberRegistry`, future modernized registrars). Full OSx protocol bring-up on a new chain is handled by [`aragon/protocol-factory`](https://github.com/aragon/protocol-factory) — refer to its checklist for that flow.

## What lives where

| Concern | Repo |
|---|---|
| Initial protocol bring-up on a new chain (OSx core + plugins + ENS + Management DAO) | `aragon/protocol-factory` |
| Component-level deploys (MemberRegistry, future modernized registrars) | **here** (`scripts/Deploy<Component>.s.sol`) |
| Component-level upgrade choreography (print encoded actions for the Management DAO multisig) | **here** (`scripts/Upgrade<Component>.s.sol` — convention; not yet populated) |
| Source for the above (Solidity contracts, tests) | **here** (`src/`, `test/`) |

## Component deployment flow

All component deploys use the same shape: `forge script` via `just-foundry`'s `run`/`simulate` recipes, broadcast + verify, governance setup actions printed to stdout for the Management DAO multisig to execute.

### Pre-deployment checklist

- [ ] On `main`, no local changes, synchronized with origin
- [ ] `just switch <network>` activates the target network
- [ ] `just env` shows expected addresses (Management DAO, ENS registry, etc.) and parameters
- [ ] `.env` (or vars) populated with `DEPLOYER_KEY`, `ETHERSCAN_API_KEY`, and component-specific params (see `.env.example`)
- [ ] `just simulate-<component>` runs cleanly — review the printed setup actions before broadcasting
- [ ] Burner deployer wallet (never a primary key)
- [ ] Wallet funded with at least 15% above estimated cost
- [ ] `just test` passes
- [ ] (For mainnet/staging deploys) deployment ceremony coordinated with the Management DAO multisig signers

### Deployment

```bash
just deploy-<component>
# e.g.
just deploy-member-registry
```

The script broadcasts the deployment via the just-foundry `run` recipe (broadcast + verify), and prints:

- Deployed contract addresses
- Encoded governance actions for the Management DAO multisig (permission grants, ENS node transfer/approval, etc.)

### Post-deployment checklist

- [ ] Deployment artifact saved at `deployments/<network>-<timestamp>.json`
- [ ] Output log captured (stdout from `just deploy-<component>` includes the proposal calldata for the Management DAO multisig)
- [ ] Source verified on the block explorer (handled automatically by the verify flag in just-foundry's `run`)
- [ ] Artifact + proposal calldata shared with the multisig signers
- [ ] Multisig signers execute the governance proposal
- [ ] Post-execution: re-run a script or check on-chain state to confirm permissions / ENS state are as expected
- [ ] Refund the burner deployer wallet

## Upgrades

For upgrades of existing OSx contracts (component-level, not full protocol), the convention is:

```
scripts/Upgrade<Component>.s.sol
```

Same script shape as the deploy scripts: simulate first (`SIMULATION=true` skips the JSON write), print encoded `upgradeToAndCall` calldata for the Management DAO multisig to execute. Future Step 8 (modernized DAORegistry / PluginRepoRegistry) is the first context that will populate these.

### Storage-layout safety

`just-foundry` provides two recipes to validate storage compatibility before broadcasting an upgrade:

```bash
just storage-info <Contract>           # show the storage layout of a contract
just check-upgrade <FromContract> <ToContract>   # diff slot/offset/label; fails if any slot moved or got renamed
```

Run `check-upgrade` against the previous version's contract (typically pulled in via a `lib/osx-vX.Y.Z/` submodule for fork-test purposes) before any upgrade-script broadcast. A red exit is the canonical "do not deploy this" signal.

SemVer classification rules for upgrades (storage addition vs. change vs. removal, function/event changes, enum reordering, etc.) are documented in [CONTRIBUTING.md](./CONTRIBUTING.md#semver-classification-of-contract-changes).
