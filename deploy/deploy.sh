#!/usr/bin/env bash
set -euo pipefail
umask 077
sha=${1:-}
[[ $sha =~ ^[a-f0-9]{40}$ ]] || exit 64
base=/opt/linkinbio
compose=/docker/linkinbio
image="linkinbio:$sha-$(date +%s)"
candidate="linkinbio-check-${sha:0:12}"
config=$(mktemp "$compose/.candidate.XXXXXX")
previous=$(mktemp "$compose/.previous.XXXXXX")
cutover=0
success=0
run_compose() { docker compose --project-directory "$compose" --env-file "$1" -f "$compose/docker-compose.yml" "${@:2}"; }
cleanup() {
  result=$?
  trap - EXIT
  docker rm -f "$candidate" >/dev/null 2>&1 || true
  if [[ $success == 0 && $cutover == 1 && -s $previous ]]; then
    run_compose "$previous" up -d --wait --wait-timeout 90
  fi
  rm -f "$config" "$previous"
  exit "$result"
}
trap cleanup EXIT
if [[ -f $compose/.env ]]; then cp "$compose/.env" "$previous"; fi
printf 'APP_IMAGE=%s\n' "$image" > "$config"
docker build -t "$image" "$base/releases/$sha"
docker run -d --name "$candidate" --env-file "$base/secrets/runtime.env" --init "$image" >/dev/null
healthy=0
for ((i=0;i<40;i++)); do
  if [[ $(docker inspect -f '{{.State.Health.Status}}' "$candidate") == healthy ]]; then healthy=1; break; fi
  sleep 2
done
[[ $healthy == 1 ]]
docker exec "$candidate" node -e "fetch('http://localhost:3000/liens/').then(async r=>{if(r.status!==200||!(await r.text()).includes('</html>'))process.exit(1)}).catch(()=>process.exit(1))"
cutover=1
run_compose "$config" up -d --wait --wait-timeout 90
curl --fail --silent http://127.0.0.1:3101/healthz >/dev/null
if [[ -s $previous ]]; then cp "$previous" "$compose/.env.previous"; fi
mv "$config" "$compose/.env"
success=1
printf 'Deployment healthy: %s\n' "$sha"
