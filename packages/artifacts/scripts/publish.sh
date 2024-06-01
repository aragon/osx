#!/bin/bash
## Semantic versioning regex with alphar, beta ando other tags
VERSION_REGEX='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-(0|[1-9A-Za-z-][0-9A-Za-z-]*)(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'
while true; do
echo "ABI publish script."
echo "Please input the version that you want to publish following the semantic versioning standard: "
read version
if [[ "$version" =~ $VERSION_REGEX ]]; then
    echo "You are about to publish version $version, please confirm by writing 'confirm':"
    read confirm
    if [[ $confirm == "confirm" ]]; then
        echo "Publishing version $version"
        yarn publish --new-version $version
        echo "Version $version published successfully"
        break
    else
        echo "Publishing version $version aborted, exiting..."
    fi
  break
fi
done;