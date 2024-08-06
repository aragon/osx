#!/bin/bash

export ALCHEMY_API_KEY=QB4I_ky2fb3xjimxqlW24kNYmZJA999S

CLONE_DIR="gio"
# rm -rf $CLONE_DIR
# mkdir -p $CLONE_DIR
# cd $CLONE_DIR

# REPOS=$(cat <<EOF
# https://github.com/aragon/token-voting-plugin=develop&artifacts/src&hardhat,
# https://github.com/aragon/multisig-plugin=develop&artifacts/src&hardhat
# https://github.com/novaknole/multibody=develop&out&forge,
# EOF
# )

REPOS=$(cat <<EOF
https://github.com/novaknole/multibody=develop&out&forge,
EOF
)

# Process each line
while IFS=',' read -r line; do
    IFS='=' read -r repoUrl data <<< "$line"

    IFS='&' read -r branch artifactSource projectType <<< "$data"

    REPO_NAME=$(basename $repoUrl .git)

    # git clone -b ${branch} $repoUrl $REPO_NAME

    cd $REPO_NAME
    
    yarn install
    
    yarn add -D @wagmi/cli

    if [ "$projectType" = "hardhat" ]; then
npx hardhat compile
cat > wagmi.config.ts << EOF
    import {defineConfig} from '@wagmi/cli';
    import {hardhat} from '@wagmi/cli/plugins';

    export default defineConfig({
        // using abi instead of generated to avoid being ignored by git
        out: "generated/abis.ts",
        plugins: [
            hardhat({
                artifacts: "${artifactSource}",
                exclude: ["**/test"],
                project: "../contracts",
            }),
        ],
    });
EOF
    elif [ "$projectType" = "forge" ]; then
        # yarn remove forge-std
        git add -A
        git commit -m "Removed foundry-rs/forge-std"

        forge install foundry-rs/forge-std@v1.7.6
        git add -A
        git commit -m "Removed foundry-rs/forge-std"

        file="remappings.txt"
        search="forge-std/=node_modules/forge-std/src/"
        replace="forge-std/=lib/forge-std/src/"

        if grep -q "$search" "$file"; then
            sed -i "s|$search|$replace|g" "$file"
            echo "Replacement complete."
        else
            echo "Search string not found in the file."
        fi

        forge remappings
        forge compile
cat > wagmi.config.ts << EOF
    import {defineConfig} from '@wagmi/cli';
    import { foundry } from '@wagmi/cli/plugins'

    export default defineConfig({
        // using abi instead of generated to avoid being ignored by git
        out: "generated/abis.ts",
        plugins: [
            foundry({
                artifacts: "${artifactSource}",
                exclude: ["**/test"],
            }),
        ],
    });
EOF
    else 
        echo "either hardhat or forge project is required"
        exit 1
    fi
        
    yarn wagmi generate
    
    mv generated/abis.ts ../../../../${REPO_NAME}-abis.ts

    cd ../../..

done <<< "$REPOS"
