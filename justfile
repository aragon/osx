default: help

import 'lib/just-foundry/justfile'

# Deploy MemberRegistry to the currently active network.
[group('deploy')]
deploy-member-registry *args:
    just run scripts/DeployMemberRegistry.s.sol:DeployMemberRegistry {{ args }}

# Simulate the MemberRegistry deployment without broadcasting.
[group('deploy')]
simulate-member-registry:
    just simulate scripts/DeployMemberRegistry.s.sol:DeployMemberRegistry

# Build Asciidoc documentation from forge build artifacts.
[group('documentation')]
build-docs:
    forge build --ast
    GITHUB_REF="${GITHUB_REF:-main}" python3 scripts/build-docs.py

# ABI generation and addresses sync live in `npm-artifacts/justfile`.
# Run them from there: `cd npm-artifacts && just sources` (or `just build`).
