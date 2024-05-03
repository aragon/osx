#!/bin/bash

# Copy schema.graphql to a temporary file
cp schema.graphql schema.tmp.graphql

# Add lines at the end of the file
cat <<EOF  >> schema.tmp.graphql
" Byte array, represented as a hexadecimal string. Commonly used for Ethereum hashes and addresses. "
scalar Bytes
" Large integers. Used for Ethereum's uint32, int64, uint64, ..., uint256 types. Note: Everything below uint32, such as int32, uint24 or int8 is represented as i32. "
scalar BigInt
" Query type, required to generate introspection query. "
type Query @entity {
  id: ID!
}
EOF

# Run graphql-codegen
graphql-codegen

# Navigate to the docs directory
cd docs || exit

# Run prettier on schema-introspection-partial.json
prettier schema-introspection-partial.json --write

# Remove the temporary file
cd ..
rm schema.tmp.graphql
