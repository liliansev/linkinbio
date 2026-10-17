#!/usr/bin/env bash
set -euo pipefail
umask 077
[[ ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([a-f0-9]{40})$ ]] || exit 64
sha=${BASH_REMATCH[1]}
exec 9>/opt/linkinbio/deploy.lock
flock -w 1200 9
incoming=$(mktemp -d /opt/linkinbio/releases/.incoming.XXXXXX)
trap 'rm -rf "$incoming"' EXIT
tar -xf - -C "$incoming" --no-same-owner --no-same-permissions
test -f "$incoming/Dockerfile"
release=/opt/linkinbio/releases/$sha
if [[ ! -d $release ]]; then mv "$incoming" "$release"; fi
/opt/linkinbio/bin/deploy.sh "$sha"
