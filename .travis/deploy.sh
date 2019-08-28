#!/bin/bash

 yarn build

 cd "$(dirname "${BASH_SOURCE[0]}")/.." \
    || exit 1

 # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

 prepare_site_dir() {
    declare -r files=(
        kcd-open-api-processor
        dist
        redoc
        redoc-static.html
        extensions.csproj
        host.json
        package.json
        proxies.json
    )

     for file in "${files[@]}"; do
        cp -R "$file" "$TMP_DIR"
    done
}

 update_website() {
    cd "$TMP_DIR"

     {
        git config --global user.email "$GIT_USER_EMAIL" \
          && git config --global user.name "$GIT_USER_NAME" \
          && git init \
          && git add -A \
          && git commit --message "$TRAVIS_COMMIT_MESSAGE" \
          && git push --quiet --force --set-upstream "https://$GIT_USER_NAME:$GIT_PASSWORD@$GIT_DESTINATION" master
    } || {
        exit 1
    }
}

 # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

 # Skip deployment for pull requests
if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
    exit 0
fi

 # Only execute the following if the commit is made to the `master` or `develop` branches
if [ "$TRAVIS_BRANCH" == "master" ]; then
    GIT_DESTINATION=$GIT_DESTINATION_MASTER
elif [ "$TRAVIS_BRANCH" == "develop" ]; then
    GIT_DESTINATION=$GIT_DESTINATION_DEVELOP
else
    exit 0
fi

 # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

 main () {
    declare -r TMP_DIR="$(mktemp -d XXXXX)"

     prepare_site_dir \
        && update_website

     rm -rf "$TMP_DIR"
}

 main "$@"
