# MemberRegistry

Permissionless member self-registration via ENS subdomain claims. Members claim a subdomain under a configurable parent domain (e.g., `alice.aragonx.eth`), manage their own resolver records (text, avatar, etc.) via per-node approval, and can release or rename their subdomain at any time.

## Setup

```sh
just switch <network>   # select network (e.g., mainnet, sepolia)
just test               # run unit tests
just test-fork          # run fork tests (requires RPC_URL)
just predeploy          # simulate deployment
just deploy             # deploy (broadcast)
```

Copy `.env.example` to `.env` and fill in secrets, or use `vars` for encrypted secret management.

## Architecture

A single `MemberRegistry` contract (UUPS upgradeable) that:

- Validates subdomain input (`[0-9a-z-]`, max 50 chars)
- Manages internal state (member-to-label mappings, label-to-owner reverse lookups)
- Operates ENS directly: creates subnodes, sets resolver records, grants per-node resolver approval
- Emits events for off-chain indexing

The registry does not own the parent ENS node. Instead, the domain owner approves the registry as an ENS operator (`setApprovalForAll`). The domain owner retains full control and can revoke access at any time.

## ENS Requirements

The registry calls the ENS registry directly via `setSubnodeOwner`. This requires the registry to be an approved operator of the parent node owner.

**The parent ENS domain must be unwrapped.** Wrapped names (managed by the ENS NameWrapper) cannot delegate `setSubnodeOwner` to external contracts. The NameWrapper does not propagate `setApprovalForAll` to the ENS registry. If the domain is wrapped, the domain holder must unwrap it first:

```solidity
NameWrapper.unwrapETH2LD(labelhash, holder, holder)
```

After unwrapping, the holder becomes the direct ENS owner and can approve the registry:

```solidity
ENSRegistry.setApprovalForAll(registryAddress, true)
```

The deploy script (`just predeploy`) detects wrapped names and prints the unwrap instructions with all parameters.

## Deployment

The deploy script handles deployment and prints the required governance actions:

1. **Deploy** -- `just deploy` deploys the implementation + UUPS proxy
2. **DAO action** -- grant `REVOKE_MEMBER_PERMISSION` on the registry (governance proposal)
3. **ENS action** -- domain holder approves registry as ENS operator

For new domains that don't exist yet, the script also prints the `setSubnodeRecord` action to create the node.

## Permissions

| Permission | On | Granted to | Purpose |
|---|---|---|---|
| `REVOKE_MEMBER_PERMISSION` | Registry | Management DAO | Forcibly revoke a member's subdomain |
| `UPGRADE_REGISTRY_PERMISSION` | Registry | Management DAO | Authorize UUPS upgrades |

Registration, release, and rename are permissionless.

## Testing

- **Unit tests** (`test/MemberRegistry.t.sol`) -- 39 tests with mocked ENS/resolver
- **Fork tests** (`test/fork/`) -- mainnet fork tests verifying the full flow including ENS integration, NameWrapper unwrap, and resolver approval
- Run unit tests: `just test`
- Run fork tests: `just test-fork`
