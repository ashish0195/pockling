#!/bin/sh
# Deploys the web version to https://bitfold.9io.ai/pockling/: runs the tests, then copies web/ to
# /var/www/bitfold/pockling on the 9io web server. It touches nothing else in the Bitfold site. The Nginx
# site is sites/_deploy/bitfold.9io.ai.conf in the stocks-bot repo. Extra ssh options can go in SSH_OPTS.
set -e
cd "$(dirname "$0")/.."
HOST=ubuntu@65.2.134.249
KEY="$HOME/Desktop/key/io.pem"

npm test >/dev/null || { echo "tests failed; not deploying" >&2; exit 1; }

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
cp -R web/. "$STAGE/"
# mktemp makes the folder private, and rsync -a would carry that over to the server.
chmod -R u=rwX,go=rX "$STAGE"
# braces matter: zsh would read "$HOST:/var" as a history modifier
rsync -az --delete -e "ssh -i $KEY $SSH_OPTS" "$STAGE/" "${HOST}:/var/www/bitfold/pockling/"

for path in "" privacy/ support/ src/app.js; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://bitfold.9io.ai/pockling/$path")
  [ "$code" = 200 ] || { echo "live check failed ($code): /pockling/$path" >&2; exit 1; }
done
echo "live  https://bitfold.9io.ai/pockling/"
