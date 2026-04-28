default: help

import 'lib/just-foundry/justfile'

# Build Asciidoc documentation from forge build artifacts (placeholder; see scripts/build-docs.py)
[group('documentation')]
build-docs:
    python3 scripts/build-docs.py
