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
# Run them from there: `cd npm-artifacts && just abi` (or `just build`).

# Bump npm-artifacts version, commit, tag vX.Y.Z, push. CI publishes on tag push. Example: just release 1.4.6
[group('release')]
release version:
    #!/usr/bin/env bash
    set -euo pipefail
    [[ "{{version}}" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9]+(\.[0-9]+)?)?$ ]] || { echo "Bad semver: {{version}}"; exit 1; }
    [[ -z $(git status --porcelain) ]] || { echo "Working tree is dirty — commit or stash first"; exit 1; }
    tag="v{{version}}"
    if git rev-parse "$tag" >/dev/null 2>&1; then echo "Tag $tag already exists"; exit 1; fi
    (cd npm-artifacts && just build)
    jq --arg v "{{version}}" '.version = $v' npm-artifacts/package.json > npm-artifacts/package.json.tmp \
        && mv npm-artifacts/package.json.tmp npm-artifacts/package.json
    git add npm-artifacts/package.json
    git commit -m "release v{{version}}"
    git tag "$tag"
    git push origin HEAD "$tag"
