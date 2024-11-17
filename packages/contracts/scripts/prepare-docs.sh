#!/usr/bin/env bash

set -euo pipefail
# shopt -s globstar

OUTDIR="$(node -p 'require("./docs/config.js").outputDir')"

if [ ! -d node_modules ]; then
  npm ci
fi

rm -rf "$OUTDIR"

hardhat docgen

echo $OUTDIR

node scripts/gen-nav.js "$OUTDIR" > "$OUTDIR/../nav.adoc"