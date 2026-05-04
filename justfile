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
