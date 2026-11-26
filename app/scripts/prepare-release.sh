#!/bin/sh
set -eu

cd "$(git rev-parse --show-toplevel)"
git fetch --no-tags origin main
base=$(git rev-parse FETCH_HEAD)
head=$(git rev-parse HEAD)

scratch=$(mktemp -d)
trap 'rm -f "$scratch/base.json" "$scratch/commits.raw"; rmdir "$scratch"' EXIT
git show "$base:app/package.json" > "$scratch/base.json"
git log -z --format=%B "$base..$head" > "$scratch/commits.raw"

docker run --rm --pull=never --network=none --user "$(id -u):$(id -g)" \
  --mount "type=bind,src=$scratch,dst=/release-input,readonly" \
  --mount "type=bind,src=$PWD/app/package.json,dst=/release/package.json" \
  --mount "type=bind,src=$PWD/app/package-lock.json,dst=/release/package-lock.json" \
  --mount "type=bind,src=$PWD/Dockerfile,dst=/release/Dockerfile" \
  --mount "type=bind,src=$PWD/app/scripts/release-version.js,dst=/release/release-version.mjs,readonly" \
  -e BASE_PACKAGE_JSON=/release-input/base.json \
  -e COMMIT_MESSAGES_FILE=/tmp/commits.json \
  -e PACKAGE_JSON=/release/package.json \
  -e PACKAGE_LOCK_JSON=/release/package-lock.json \
  -e DOCKERFILE=/release/Dockerfile \
  marcelo-munhoz-tests-test sh -ec '
    node -e '"'"'const fs = require("node:fs"); const messages = fs.readFileSync("/release-input/commits.raw", "utf8").split("\0").filter(Boolean); fs.writeFileSync(process.env.COMMIT_MESSAGES_FILE, JSON.stringify(messages));'"'"'
    node /release/release-version.mjs
  '
