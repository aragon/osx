default: help

import 'lib/just-foundry/justfile'

# Build Asciidoc documentation from forge build artifacts.
[group('documentation')]
build-docs:
    forge build --ast
    GITHUB_REF="${GITHUB_REF:-main}" python3 scripts/build-docs.py
