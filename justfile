default: help
import 'lib/just-foundry/justfile'

# Shadow the inherited `deploy` / `predeploy` recipes — this repo has no canonical single-deploy script
[private]
deploy *args:
    @echo "This repo has no canonical deploy. Use 'just deploy-<component>' (e.g. 'just deploy-member-registry')." >&2
    @exit 1

[private]
predeploy:
    @echo "This repo has no canonical deploy. Use 'just predeploy-<component>' (e.g. 'just predeploy-member-registry')." >&2
    @exit 1

# Deploy MemberRegistry to the currently active network.
[group('deploy')]
deploy-member-registry *args:
    just run scripts/DeployMemberRegistry.s.sol:DeployMemberRegistry {{ args }}

# Dry-run the MemberRegistry deployment without broadcasting.
[group('deploy')]
predeploy-member-registry:
    just dry-run scripts/DeployMemberRegistry.s.sol:DeployMemberRegistry

# Deploy a CrossChainController + CCIPAdapter pair to the currently active network.
[group('deploy')]
deploy-crosschain *args:
    just run scripts/crosschain/DeployCrossChain.s.sol:DeployCrossChain {{ args }}

# Dry-run the CrossChainController + CCIPAdapter deployment without broadcasting.
[group('deploy')]
predeploy-crosschain:
    just dry-run scripts/crosschain/DeployCrossChain.s.sol:DeployCrossChain

# Read-only wiring check of an already-deployed CrossChainController + CCIPAdapter pair (see CrossChainWiringCheck).
[group('deploy')]
verify-crosschain:
    just dry-run scripts/crosschain/VerifyCrossChain.s.sol:VerifyCrossChain

# Run the cross-chain fork tests against the real CCIP Routers.
# Requires MAINNET_RPC_URL (or RPC_URL); BASE_RPC_URL additionally enables the
# destination half. Tests skip cleanly when a variable is unset.
[group('test')]
test-fork-crosschain *args:
    forge test --match-path "test/integration/crosschain/fork/*" -vvv {{ args }}

# Build Asciidoc documentation. Override `ref` for tagged-release re-runs (e.g. `just build-docs v1.4.0`).
[group('documentation')]
build-docs ref="main":
    forge build --ast
    GITHUB_REF="{{ ref }}" python3 scripts/build-docs.py

# Run the DAO upgrade test (v1.0.0 → v1.3.0 → v1.4.0)
[group('test')]
test-upgrade *args: test-upgrade-setup
    FOUNDRY_PROFILE=upgrade forge test -vvv {{ args }}

# Set up the historical-source worktrees needed for the upgrade test.
[group('test')]
test-upgrade-setup:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -d lib/osx-v1.0.0 ]; then
      git worktree add lib/osx-v1.0.0 c2b9d23a96654e81f22fbf91e6f334ef26a370af
    else
      echo "lib/osx-v1.0.0 already exists, skipping."
    fi
    if [ ! -d lib/osx-v1.3.0 ]; then
      git worktree add lib/osx-v1.3.0 6f35a85f6159ae62c68776c5cff57d4e8cfe1549
    else
      echo "lib/osx-v1.3.0 already exists, skipping."
    fi
