#!/usr/bin/env bash

set -euo pipefail
# shopt -s globstar

PACKAGE_NAME="@aragon/osx-commons-configs"
PACKAGE_PATH=$(node -p "require.resolve('$PACKAGE_NAME')")
TEMPLATES_PATH=$(dirname "$PACKAGE_PATH")/docs/templates

cp -r "$TEMPLATES_PATH" "./docs"

OUTDIR="$(node -p 'require("./docs/config.js").outputDir')"

if [ ! -d node_modules ]; then
  npm ci
fi

rm -rf "$OUTDIR"

echo $OUTDIR

hardhat docgen

node scripts/gen-nav.js "$OUTDIR" > "$OUTDIR/../nav.adoc"

rm -rf ./docs/templates