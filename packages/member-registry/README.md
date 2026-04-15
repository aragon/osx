# MemberRegistry

Permissionless member self-registration via ENS subdomain claims.

Members claim a subdomain under a configurable parent domain (e.g., `alice.aragonx.eth`), manage their own resolver records (text, avatar, etc.), and can release or rename at any time. Governance can forcibly revoke a member's subdomain.

## How it works

### The contract

One contract: `MemberRegistry`. It is an approved ENS operator on the parent domain (e.g., `aragonx.eth`). The domain owner retains full ownership and can revoke the registry's access at any time.

When a user calls `register("alice")`, the registry:
1. Validates the subdomain (`[0-9a-z-]`, max 50 chars)
2. Creates the ENS subnode `alice.aragonx.eth`, owned by the registry
3. Sets the resolver and the addr record (points to the member's address)
4. Grants the member **per-node resolver approval** so they can manage their own records

After registration, the member can call the PublicResolver directly to set text records, contenthash, etc. The registry doesn't proxy these calls -- the member talks to the resolver as an approved delegate.

### ENS ownership model

```
aragonx.eth            -- owned by the domain holder (e.g., a multisig)
  alice.aragonx.eth    -- owned by the MemberRegistry contract
  bob.aragonx.eth      -- owned by the MemberRegistry contract
```

The registry is **not** the owner of the parent domain. It operates as an approved ENS operator via `setApprovalForAll`. The parent owner keeps full control.

Each subnode (e.g., `alice.aragonx.eth`) is owned by the registry contract. This prevents members from transferring or selling their subdomains. Members get resolver record management via per-node `approve()`, not ENS ownership.

### Per-node resolver approval

The ENS PublicResolver has three authorization levels:
```
1. owner == msg.sender                         -- direct node owner
2. isApprovedForAll(owner, msg.sender)          -- global operator
3. isApprovedFor(owner, node, msg.sender)       -- per-node delegate  <-- members use this
```

After registration, the member is a per-node delegate on their subnode. They can call any resolver record function (`setText`, `setAddr`, `setContenthash`, etc.) directly on the PublicResolver. They cannot transfer the node, manage other members' records, or approve other delegates.

### Important UX note for the frontend

The official ENS app (app.ens.domains) does **not** show edit controls for per-node delegates. It only shows controls if `ens.owner(subnode) == connectedWallet`. Since the registry owns all subnodes, the ENS app won't show record management UI to members.

**The frontend must call the PublicResolver directly.** The resolver will accept the call because `isApprovedFor(registry, subnode, member)` is true. This is a protocol-level feature that the ENS frontend hasn't built UI for.

## Contract interface

```solidity
struct TextRecord {
    string key;
    string value;
}

struct Records {
    TextRecord[] textRecords;   // avatar, description, url, com.twitter, etc.
    address addr;               // address(0) = default to msg.sender
    bytes contenthash;          // empty = don't set
}

// Permissionless -- any address can call
function register(string calldata subdomain) external;
function register(string calldata subdomain, Records calldata records) external;
function release() external;
function rename(string calldata newSubdomain) external;
function rename(string calldata newSubdomain, Records calldata records) external;

// Governed -- requires REVOKE_MEMBER_PERMISSION
function revoke(address member) external;
```

The `Records` overloads allow setting resolver records (text, addr, contenthash) atomically during registration or rename. This is how delegates carry their profile over when renaming.

### Events

```solidity
event MemberRegistered(address indexed member, string subdomain);
event MemberReleased(address indexed member, string subdomain);
event MemberRevoked(address indexed member, address indexed revoker, string subdomain);
event MemberRenamed(address indexed member, string oldSubdomain, string newSubdomain);
```

### View functions

```solidity
function isRegistered(address member) external view returns (bool);
function memberLabel(address member) external view returns (bytes32);     // labelhash, 0 = not registered
function memberSubdomain(address member) external view returns (string);  // "alice"
function labelOwner(bytes32 label) external view returns (address);       // reverse lookup
```

### Errors

```solidity
error InvalidSubdomain(string subdomain);       // empty, >50 chars, or invalid chars
error AlreadyRegistered(address member);         // address already has a subdomain
error NotRegistered(address member);             // address has no subdomain
error SubdomainAlreadyTaken(string subdomain);   // label already claimed by someone else
```

## Frontend integration guide

### Reading member state

```typescript
// Check if an address is registered
const registered = await registry.isRegistered(address);

// Get the subdomain string
const subdomain = await registry.memberSubdomain(address);
// => "alice"

// Full domain = subdomain + "." + parentDomain
// => "alice.aragonx.eth"

// Check if a subdomain is available
const label = keccak256(toUtf8Bytes(subdomain));
const owner = await registry.labelOwner(label);
// owner == address(0) means available
```

### Registering and renaming with records

`register` and `rename` have two overloads each: a simple one and one that accepts a `Records` struct to set text records, a custom addr, and/or a contenthash atomically in the same transaction.

**viem** resolves overloads automatically by argument count:

```typescript
import { registryAbi } from "./artifacts/MemberRegistry";

// Simple register -- no records
await walletClient.writeContract({
  abi: registryAbi,
  address: registryAddress,
  functionName: "register",
  args: ["alice"],
});

// Register with records -- viem picks the 2-arg overload
await walletClient.writeContract({
  abi: registryAbi,
  address: registryAddress,
  functionName: "register",
  args: [
    "alice",
    {
      textRecords: [
        { key: "avatar", value: "https://example.com/alice.png" },
        { key: "description", value: "Aragon delegate" },
      ],
      addr: zeroAddress,         // address(0) = default to msg.sender
      contenthash: "0x",         // empty = don't set
    },
  ],
});

// Simple rename
await walletClient.writeContract({
  abi: registryAbi,
  address: registryAddress,
  functionName: "rename",
  args: ["alice2"],
});

// Rename carrying records to the new subdomain
await walletClient.writeContract({
  abi: registryAbi,
  address: registryAddress,
  functionName: "rename",
  args: [
    "alice2",
    {
      textRecords: [
        { key: "avatar", value: "https://example.com/alice.png" },
        { key: "description", value: "Updated bio" },
      ],
      addr: zeroAddress,
      contenthash: "0x",
    },
  ],
});
```

The `Records` struct fields:
- `textRecords` -- array of `{ key, value }` pairs (avatar, description, url, com.twitter, etc.)
- `addr` -- the ENS address record. `address(0)` keeps the default (msg.sender). Set to a different address if the delegate uses a cold wallet or multisig.
- `contenthash` -- IPFS/Swarm contenthash bytes. Empty bytes (`"0x"`) means don't set.

### Writing member records after registration (setText, setAddr, etc.)

Members do NOT go through the registry for post-registration record management. They call the PublicResolver directly. The resolver accepts their calls because they have per-node approval.

```typescript
// The subnode hash is needed for all resolver calls
const parentNode = namehash("aragonx.eth");
const label = keccak256(toUtf8Bytes("alice"));
const subnode = keccak256(solidityPacked(["bytes32", "bytes32"], [parentNode, label]));

// Member sets their avatar (calls PublicResolver directly)
const resolver = new Contract(resolverAddress, resolverAbi, memberSigner);
await resolver.setText(subnode, "avatar", "https://example.com/avatar.png");
await resolver.setText(subnode, "description", "Aragon delegate");
await resolver.setText(subnode, "url", "https://alice.xyz");
await resolver.setContenthash(subnode, ipfsContenthash);
```

### Reading member records

```typescript
// Anyone can read -- these are standard ENS resolver calls
const avatar = await resolver.text(subnode, "avatar");
const description = await resolver.text(subnode, "description");
const addr = await resolver.addr(subnode);
```

### Listening for events

```typescript
// New registrations
registry.on("MemberRegistered", (member, subdomain) => { ... });

// All membership changes
registry.on("MemberReleased", (member, subdomain) => { ... });
registry.on("MemberRevoked", (member, revoker, subdomain) => { ... });
registry.on("MemberRenamed", (member, oldSubdomain, newSubdomain) => { ... });
```

### Building a member list

The registry does not store a member list on-chain. Enumerate members by indexing events:

```typescript
// Get all registrations, then subtract releases/revokes
const registered = await registry.queryFilter(registry.filters.MemberRegistered());
const released = await registry.queryFilter(registry.filters.MemberReleased());
const revoked = await registry.queryFilter(registry.filters.MemberRevoked());
const renamed = await registry.queryFilter(registry.filters.MemberRenamed());
```

Or use a subgraph / indexer for efficient querying.

## ENS requirements

The parent domain must be **unwrapped** (not managed by the ENS NameWrapper). The domain owner must approve the registry as an ENS operator:

```solidity
// Domain owner calls this on the ENS registry
ENSRegistry.setApprovalForAll(registryAddress, true)
```

The deploy script (`just predeploy`) detects wrapped names and prints unwrap instructions.

## Development

```sh
just switch <network>   # select network (e.g., mainnet, sepolia)
just test               # run unit tests
just test-fork          # run fork tests (requires RPC_URL)
just predeploy          # simulate deployment
just deploy             # deploy (broadcast)
```

## Permissions

| Permission | On | Granted to | Purpose |
|---|---|---|---|
| `REVOKE_MEMBER_PERMISSION` | Registry | Management DAO | Forcibly revoke a member's subdomain |
| `UPGRADE_REGISTRY_PERMISSION` | Registry | Management DAO | Authorize UUPS upgrades |

Registration, release, and rename are permissionless.
