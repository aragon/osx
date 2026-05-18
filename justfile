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

# Build Asciidoc documentation. Override `ref` for tagged-release re-runs (e.g. `just build-docs v1.4.0`).
[group('documentation')]
build-docs ref="main":
    forge build --ast
    GITHUB_REF="{{ ref }}" python3 scripts/build-docs.py

