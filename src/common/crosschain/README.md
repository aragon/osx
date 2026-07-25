# Cross-chain

Lets a DAO on one chain execute actions on a DAO on another chain.

```
origin chain                                 destination chain
------------                                 -----------------
DAO (proposal executes an action)
  └─ CrossChainController.forwardMessage
       └─ delegatecall CCIPAdapter.sendMessage
            └─ CCIP Router.ccipSend  ──────►  CCIP Router
                                                └─ CCIPAdapter.ccipReceive
                                                     └─ CrossChainController.receiveMessage
                                                          └─ DAO.execute(actions)
```

## Layout

| Path | Purpose |
|---|---|
| `CrossChainController.sol` | The entry and exit point. Owns lane config, message identity, and the delivery state machine. |
| `ICrossChainController.sol` | Interface and events. |
| `adapters/BaseAdapter.sol` | Shared adapter logic: trusted remotes, context guards. |
| `adapters/CCIP/CCIPAdapter.sol` | Chainlink CCIP implementation, including the chain-id ↔ selector table. |
| `lib/Transaction.sol` | The envelope carried across the bridge, and its id. |
| `lib/ChainIds.sol` | Standard chain ids. |
| `lib/Errors.sol` | Every revert reason. |

## Two things to know before reading the code

**The send path is `delegatecall`ed.** The controller delegatecalls the
adapter, so the bridge sees the *controller* as the message sender and the fee
is paid from the *controller's* balance. The destination adapter must therefore
trust the remote **controller**, never the remote adapter. Trusting the remote
adapter is the most likely wiring mistake and produces a lane where every
message is rejected.

**There are two independent retry layers.** `receiveMessage` wraps the DAO
execution in a `try/catch`:

| What failed | Bridge sees | Stored state | Recovery |
|---|---|---|---|
| The payload (an action reverted, bad encoding, missing permission) | success | `Delivered` | `retryMessage`, which is permissioned |
| The delivery itself (untrusted sender, cleared lane, too little gas) | failure | `None` — nothing stored | CCIP manual re-execution, permissionless |

Which layer catches a given failure depends on the gas limit chosen at send
time on the origin chain. See `test/integration/crosschain/GasLimits.t.sol`.

## Deployment order

`CCIPAdapter` takes its trusted remotes in the **constructor** and exposes no
setter, so a two-sided rollout has to deploy both controllers before either
adapter:

1. Both chains: `DAO`, then `CrossChainController`.
2. Both chains: `CCIPAdapter`, each naming the *other* chain's controller as
   its trusted remote.
3. Both chains: grant permissions, then `updateConfig` the lane.

Rotating a trusted remote later means redeploying the adapter.

## Permissions

| Permission | On | Held by |
|---|---|---|
| `EXECUTE_PERMISSION` | the DAO | the controller |
| `FORWARD_MESSAGE_PERMISSION` | the controller | the DAO (proposals produce sends) |
| `UPDATE_CONFIG_PERMISSION` | the controller | the DAO — effectively root over the cross-chain path |
| `SWEEP_PERMISSION` | the controller | the DAO |
| `RETRY_MESSAGE_PERMISSION` | the controller | **an ops multisig or EOA — not the DAO** |

The last row is not a style preference. `retryMessage` re-enters
`DAO.execute`, and a DAO can only act *by* executing a proposal, which already
holds the DAO's reentrancy lock. A DAO-held retry permission therefore cannot
be exercised, and failed messages can never be retried. See
`RetryAndFailures.t.sol::test_retry_daoCannotRetryThroughAProposal`.

## Funding

The **controller** is the fee payer, on every chain it sends from. It needs a
native (or fee-token) balance before any message can be sent; an empty
controller reverts with `INSUFFICIENT_FEE_BALANCE`. Multi-hop proposals
(A tells B to tell C) depend on the *second* chain's controller being funded,
which the origin DAO neither controls nor can see.

`sweep` returns pre-funding to the DAO.

---

# Running the tests

## Unit suites

Per-function tests against mocks.

```bash
forge test --match-path 'test/common/crosschain/**'
```

## E2E suite — no RPC needed

Two complete stacks in one process, wired through a simulated CCIP lane.
98 tests.

```bash
just test-crosschain
# or
forge test --match-path 'test/integration/crosschain/*' -vvv
```

The CCIP transport is `test/mocks/commons/crosschain/CCIPRelayRouterMock.sol`.
It models both halves of a lane *asynchronously*: `ccipSend` queues, and
delivery is a separate call made through `CallWithExactGas` with the gas limit
decoded from `extraArgs` — the same thing `Router.routeMessage` does. A failed
delivery returns `success == false` and stays queued rather than reverting,
which is what makes CCIP's "failed but manually executable" state testable.

Both stacks share one EVM; `block.chainid` is flipped between the send and
delivery phases so the origin/destination chain-id checks are real. Chain ids
and selectors are the production ones.

### Against a clean local anvil

Nothing needs to be pre-deployed — the suite deploys everything.

```bash
anvil                                     # terminal 1
just test-crosschain --fork-url http://127.0.0.1:8545
```

## Fork suite — real CCIP Router bytecode

Two real forks (Ethereum + Base). The origin half uses the real `ccipSend`;
the destination half pranks a **real registered OffRamp** into the real
`Router.routeMessage`, which is `onlyOffRamp` and applies `CallWithExactGas`.

Requires two endpoints, and **skips cleanly when they are unset**:

| Variable | Chain |
|---|---|
| `MAINNET_RPC_URL` (or `RPC_URL`) | Ethereum mainnet |
| `BASE_RPC_URL` | Base mainnet |

```bash
MAINNET_RPC_URL=https://ethereum-rpc.publicnode.com \
BASE_RPC_URL=https://base-rpc.publicnode.com \
just test-crosschain-fork
```

Those public endpoints need no API key. Takes a couple of seconds.

### Against a locally forked anvil

Point `MAINNET_RPC_URL` at a local fork to run against a pinned block:

```bash
anvil --port 8546 --fork-url https://ethereum-rpc.publicnode.com   # ~20s to warm up
MAINNET_RPC_URL=http://127.0.0.1:8546 \
BASE_RPC_URL=https://base-rpc.publicnode.com \
just test-crosschain-fork
```

The fork suite is excluded from CI via `--no-match-path '**/fork/**'`. It also
acts as a staleness guard: it re-checks that both Router addresses still answer
`typeAndVersion() == "Router 1.2.0"` and that every chain in the adapter's
hardcoded selector table is still a live lane from mainnet.

## What the E2E files cover

| File | Subject |
|---|---|
| `HappyPath.t.sol` | Both directions, multi-action payloads, ordering, fee accounting, bridge-level compatibility. |
| `RetryAndFailures.t.sol` | Both retry layers, and every way a delivered payload can fail. |
| `GasLimits.t.sol` | The three gas regimes and the boundaries between them. |
| `ReplayAndIdentity.t.sol` | Transaction identity, same-lane and cross-chain replay. |
| `Authorization.t.sol` | Who may send, deliver and reconfigure, against a real `PermissionManager`. |
| `Reentrancy.t.sol` | What a payload can do while executing; legitimate multi-hop chaining. |
| `FeesAndOps.t.sol` | Native and ERC20 fees, starvation, broken lanes, sweeps. |
| `fork/CCIPRealRouter.t.sol` | All of the above that survives contact with production bytecode. |

The gas constants in `GasLimits.t.sol` have wide margins but are compiler- and
optimiser-sensitive. If one fails after a toolchain bump, re-measure the
boundary rather than deleting the test — the three regimes are real.
