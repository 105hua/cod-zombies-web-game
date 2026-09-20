#!/usr/bin/env bash
set -Eeuo pipefail

# Required: APP_IMAGE, CI_IMAGE (already built on this Docker daemon), RELEASE_ID
# (unique lowercase letters/digits/hyphens), ORIGIN (public http(s) origin).
# Optional: DEPLOY_PROJECT=dead-signal, PROXY_NETWORK=npm_proxy,
# REPORT_DIR=reports/deploy. Requires Bash, Docker CLI, mkdir, and sleep; no host
# Node, browser, workspace bind mounts, NPM credentials, or privileged containers.
# NPM forwards to ${DEPLOY_PROJECT}-gateway:3000 on PROXY_NETWORK. Never publish
# gateway/app ports on the host. The existing manual compose service is untouched.
#
# Recovery: the stopped ${DEPLOY_PROJECT}-deploy-lock container is an atomic lock,
# not a liveness indicator. Remove it only after confirming no deployment job or
# script still runs AND no abandoned Docker exec/daemon operation is still
# mutating routing. Inspect the retained deploy-helper container's processes
# (docker top) and the gateway before recovery; a disconnected Docker CLI does
# not stop remote exec. Never automatically expire the lock. An unconfirmed
# mutation retains the lock and helper even if /deploy/pending is absent.
# A surviving /deploy/pending means traffic/state may differ: after all abandoned
# operations have stopped, inspect gateway logs and /deploy/releases/*/state,
# select a known-good release with an atomic replacement of /deploy/current,
# nginx -t, gracefully reload, and verify the release header through a fresh HTTP
# connection before removing pending and the lock and retrying deployment.
# Use a temporary nginx container with the config volume mounted to repair files;
# the live gateway mounts it read-only. Do not delete a possibly-serving release.
#
# Every old release/container and immutable asset is deliberately retained. A
# verified switch does NOT prove all old workers/connections have drained. Manual
# container/image cleanup must exclude active/previous releases and any release
# used by a draining nginx worker; wait for those workers to exit first. Asset
# cleanup additionally requires accepting that old browser tabs can no longer
# lazy-load their original chunks. Budget disk space; do not blindly prune volumes.

fail() { printf 'Deployment error: %s\n' "$*" >&2; exit 1; }
log() { printf '%s\n' "$*"; }

: "${APP_IMAGE:?APP_IMAGE is required}"
: "${CI_IMAGE:?CI_IMAGE is required}"
: "${RELEASE_ID:?RELEASE_ID is required}"
: "${ORIGIN:?ORIGIN is required}"
DEPLOY_PROJECT=${DEPLOY_PROJECT:-dead-signal}
PROXY_NETWORK=${PROXY_NETWORK:-npm_proxy}
REPORT_DIR=${REPORT_DIR:-reports/deploy}
NGINX_IMAGE=nginx:1.28.0-alpine

[[ $DEPLOY_PROJECT =~ ^[a-z0-9][a-z0-9-]*$ ]] || fail 'Invalid DEPLOY_PROJECT; use lowercase letters, digits and hyphens.'
[[ $RELEASE_ID =~ ^[a-z0-9][a-z0-9-]*$ ]] || fail 'Invalid RELEASE_ID; use lowercase letters, digits and hyphens.'
[[ $PROXY_NETWORK =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]] || fail 'Invalid PROXY_NETWORK.'
[[ $ORIGIN =~ ^https?://[^[:space:]/?#@]+$ ]] || fail 'ORIGIN must be an http(s) origin without credentials, a path, query or fragment.'
[[ $APP_IMAGE != -* && $CI_IMAGE != -* ]] || fail 'Image references cannot start with a hyphen.'
[[ -n $REPORT_DIR && $REPORT_DIR != -* ]] || fail 'Invalid REPORT_DIR.'

candidate="${DEPLOY_PROJECT}-release-${RELEASE_ID}"
gateway="${DEPLOY_PROJECT}-gateway"
private_network="${DEPLOY_PROJECT}-internal"
config_volume="${DEPLOY_PROJECT}-gateway-config"
asset_volume="${DEPLOY_PROJECT}-immutable-assets"
lock="${DEPLOY_PROJECT}-deploy-lock"
helper="${DEPLOY_PROJECT}-deploy-helper-${RELEASE_ID}"
[[ ${#candidate} -le 63 ]] || fail 'DEPLOY_PROJECT + -release- + RELEASE_ID must fit in a 63-character DNS label.'
script_dir=${BASH_SOURCE[0]%/*}
[[ $script_dir != "${BASH_SOURCE[0]}" ]] || script_dir=.

app_image=$(docker image inspect --format '{{.Id}}' "$APP_IMAGE")
ci_image=$(docker image inspect --format '{{.Id}}' "$CI_IMAGE")
app_user=$(docker image inspect --format '{{.Config.User}}' "$app_image")
case ${app_user%%:*} in ''|root|0) fail 'APP_IMAGE must declare a non-root USER.' ;; esac
docker network inspect "$PROXY_NETWORK" >/dev/null
# URL parsing is performed inside the baked CI image, never with host Node.
docker run --rm --network none --entrypoint node --env ORIGIN "$ci_image" -e '
const value = new URL(process.env.ORIGIN);
if (!["http:", "https:"].includes(value.protocol) || !value.hostname || value.username || value.password || value.pathname !== "/" || value.search || value.hash) {
  throw new Error("ORIGIN must be an http(s) origin");
}
'
if ! nginx_image=$(docker image inspect --format '{{.Id}}' "$NGINX_IMAGE" 2>/dev/null); then
    docker pull "$NGINX_IMAGE"
    nginx_image=$(docker image inspect --format '{{.Id}}' "$NGINX_IMAGE")
fi

lock_id=
helper_id=
candidate_id=
smoke_id=
probe_id=
active=
previous=
reports_attempted=0
promotion_started=0
committed=0
candidate_may_serve=0
routing_mutation=

collect_reports() {
    [[ -n $smoke_id && $reports_attempted -eq 0 ]] || return 0
    reports_attempted=1
    local result=0
    mkdir -p "$REPORT_DIR/test-results" || return 1
    docker cp "$smoke_id:/app/reports/." "$REPORT_DIR/" || result=1
    docker cp "$smoke_id:/app/test-results/." "$REPORT_DIR/test-results/" || result=1
    return "$result"
}

# Docker CLI failure/abort does not prove the remote operation stopped. Clear
# this guard only on confirmed success; otherwise cleanup must not race it.
mutate_routing() {
    routing_mutation=$1
    shift
    if "$@"; then
        routing_mutation=
    else
        return "$?"
    fi
}

select_release() {
    mutate_routing "select release $1" docker exec "$helper_id" sh -eu -c '
        test -f "/deploy/releases/$1/nginx.conf"
        rm -f /deploy/current.next
        ln -s "releases/$1" /deploy/current.next
        mv -Tf /deploy/current.next /deploy/current
        sync
    ' sh "$1"
}

probe_release() {
    local expected=$1 result
    if [[ -n $probe_id ]]; then
        docker rm -f "$probe_id" >/dev/null || return 1
        probe_id=
    fi
    probe_id=$(docker create --name "${DEPLOY_PROJECT}-probe-${RELEASE_ID}" --init \
        --network "$private_network" --label "deploy.project=$DEPLOY_PROJECT" --label deploy.role=probe \
        --entrypoint node --env "EXPECTED_RELEASE=$expected" --env "GATEWAY_URL=http://${gateway}:3000" \
        "$ci_image" -e '
const deadline = Date.now() + 60000;
let lastError;
let consecutive = 0;
while (Date.now() < deadline) {
  try {
    const response = await fetch(`${process.env.GATEWAY_URL}/?deployment_probe=${Date.now()}`, {
      headers: { connection: "close", "cache-control": "no-cache" },
      signal: AbortSignal.timeout(4000)
    });
    await response.text();
    const release = response.headers.get("x-deployment-release");
    if (response.status !== 200 || release !== process.env.EXPECTED_RELEASE) {
      throw new Error(`Expected HTTP 200 / ${process.env.EXPECTED_RELEASE}; got ${response.status} / ${release}`);
    }
    if (++consecutive === 3) {
      console.log(`Verified gateway release ${release}`);
      process.exit(0);
    }
  } catch (error) {
    consecutive = 0;
    lastError = error;
  }
  await new Promise(resolve => setTimeout(resolve, 500));
}
console.error("Gateway verification failed:", lastError);
process.exit(1);
' --input-type=module) || return 1
    docker start --attach "$probe_id" || return 1
    result=$(docker inspect --format '{{.State.ExitCode}}' "$probe_id") || return 1
    [[ $result == 0 ]] || return 1
    docker rm "$probe_id" >/dev/null || return 1
    probe_id=
}

rollback() {
    [[ -n $active ]] || {
        log 'No previous release exists. Retaining gateway/candidate and pending journal for manual recovery.' >&2
        return 1
    }
    log "Restoring previous live release $active."
    select_release "$active" || return 1
    docker exec "$gateway" nginx -t -c /deploy/current/nginx.conf || return 1
    mutate_routing 'reload rollback configuration' docker exec "$gateway" nginx -s reload -c /deploy/current/nginx.conf || return 1
    probe_release "$active" || return 1
    mutate_routing 'clear rollback journal' docker exec "$helper_id" sh -eu -c 'rm -f /deploy/pending; sync' || return 1
    log "Rollback verified: $active. Candidate retained because draining workers may still use it."
}

cleanup() {
    local result=$? id
    trap - EXIT INT TERM
    set +e
    if [[ $result -ne 0 && $promotion_started -eq 1 && $committed -eq 0 && -z $routing_mutation ]]; then
        if ! rollback; then
            log 'ROLLBACK NOT VERIFIED. Retaining all release containers and pending journal; manual recovery is required.' >&2
        fi
    fi
    if ! collect_reports; then
        log "Could not copy all Playwright reports to $REPORT_DIR." >&2
        result=1
    fi
    if [[ -n $routing_mutation ]]; then
        log "UNCONFIRMED ROUTING MUTATION: $routing_mutation. No competing rollback or resource cleanup will run." >&2
        log "Retaining $lock, $helper, gateway and release containers. Inspect remote operations and routing before manual recovery; pending may be absent." >&2
        exit 1
    fi
    for id in "$probe_id" "$smoke_id" "$helper_id"; do
        if [[ -n $id ]] && ! docker rm -f "$id" >/dev/null; then
            log "Could not remove helper container $id." >&2
            result=1
        fi
    done
    if [[ -n $candidate_id && $candidate_may_serve -eq 0 ]]; then
        if ! docker rm -f "$candidate_id" >/dev/null; then
            log "Could not remove unpromoted candidate $candidate_id." >&2
            result=1
        fi
    fi
    if [[ -n $lock_id ]] && ! docker rm "$lock_id" >/dev/null; then
        log "Could not release lock $lock. Confirm no job is running before removing it manually." >&2
        result=1
    fi
    exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if ! lock_id=$(docker create --name "$lock" --network none \
    --label "deploy.project=$DEPLOY_PROJECT" --label deploy.role=lock --label "deploy.release=$RELEASE_ID" \
    --entrypoint true "$nginx_image"); then
    fail "Cannot acquire $lock. Another deployment may be running. Inspect the lock and confirm every deployment job has stopped before: docker rm $lock"
fi

# Labels prevent this script from adopting unrelated same-name Docker resources.
ensure_volume() {
    local name=$1 role=$2 owner
    if ! docker volume inspect "$name" >/dev/null 2>&1; then
        docker volume create --label "deploy.project=$DEPLOY_PROJECT" --label "deploy.role=$role" "$name" >/dev/null
    fi
    owner=$(docker volume inspect --format '{{index .Labels "deploy.project"}}/{{index .Labels "deploy.role"}}' "$name")
    [[ $owner == "$DEPLOY_PROJECT/$role" ]] || fail "Refusing unrelated volume $name."
}
ensure_volume "$config_volume" config
ensure_volume "$asset_volume" assets
if ! docker network inspect "$private_network" >/dev/null 2>&1; then
    docker network create --internal --label "deploy.project=$DEPLOY_PROJECT" --label deploy.role=internal "$private_network" >/dev/null
fi
network_owner=$(docker network inspect --format '{{index .Labels "deploy.project"}}/{{index .Labels "deploy.role"}}/{{.Internal}}' "$private_network")
[[ $network_owner == "$DEPLOY_PROJECT/internal/true" ]] || fail "Refusing unrelated or non-internal network $private_network."

helper_id=$(docker run --detach --name "$helper" --network "$private_network" \
    --label "deploy.project=$DEPLOY_PROJECT" --label deploy.role=helper \
    --mount "type=volume,source=$config_volume,target=/deploy" \
    --mount "type=volume,source=$asset_volume,target=/assets" \
    --entrypoint sleep "$nginx_image" 2147483647)
docker exec "$helper_id" sh -eu -c '
    if test -e /deploy/pending; then
        echo "Interrupted promotion detected in /deploy/pending; verify or restore routing manually before removing it." >&2
        cat /deploy/pending >&2
        exit 1
    fi
'
gateway_id=$(docker container ls --all --filter "name=^/${gateway}$" --format '{{.ID}}')
state=$(docker exec "$helper_id" sh -eu -c '
    if test -L /deploy/current; then
        cat /deploy/current/state
    elif test -e /deploy/current; then
        echo "Unexpected non-symlink /deploy/current" >&2
        exit 1
    fi
')
if [[ -n $gateway_id ]]; then
    gateway_owner=$(docker inspect --format '{{index .Config.Labels "deploy.project"}}/{{index .Config.Labels "deploy.role"}}/{{.State.Running}}' "$gateway")
    [[ $gateway_owner == "$DEPLOY_PROJECT/gateway/true" ]] || fail "Gateway $gateway is unrelated or not running; manual recovery is required."
    [[ -n $state ]] || fail 'Gateway exists without durable release state.'
    read -r active previous extra <<< "$state"
    [[ $active =~ ^[a-z0-9][a-z0-9-]*$ && ( $previous == - || $previous =~ ^[a-z0-9][a-z0-9-]*$ ) && -z $extra ]] || fail 'Invalid durable release state.'
    current_target=$(docker exec "$helper_id" readlink /deploy/current)
    [[ $current_target == "releases/$active" ]] || fail 'Release pointer/state mismatch; manual recovery required.'
    gateway_mounts=$(docker inspect --format '{{range .Mounts}}{{printf "%s:%s:%t\n" .Name .Destination .RW}}{{end}}' "$gateway")
    [[ $gateway_mounts == *"$config_volume:/deploy:false"* && $gateway_mounts == *"$asset_volume:/assets:false"* ]] || fail 'Gateway volumes do not match this deployment.'
    gateway_networks=$(docker inspect --format '{{range $name, $value := .NetworkSettings.Networks}}{{printf " %s " $name}}{{end}}' "$gateway")
    [[ $gateway_networks == *" $private_network "* && $gateway_networks == *" $PROXY_NETWORK "* ]] || fail 'Gateway network attachments do not match this deployment.'
    probe_release "$active"
else
    [[ -z $state ]] || fail 'Durable release state exists but the gateway is missing; manual recovery required.'
fi

docker exec "$helper_id" sh -eu -c 'test ! -e "/deploy/releases/$1"' sh "$RELEASE_ID" || fail 'RELEASE_ID has already been used; choose a new release ID.'
candidate_id=$(docker create --name "$candidate" --init --restart unless-stopped \
    --network "$private_network" --label "deploy.project=$DEPLOY_PROJECT" --label deploy.role=release \
    --label "deploy.release=$RELEASE_ID" --env "ORIGIN=$ORIGIN" "$app_image")
docker start "$candidate_id" >/dev/null
health_deadline=$((SECONDS + 120))
while :; do
    health=$(docker inspect --format '{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$candidate_id")
    case $health in
        running/healthy) break ;;
        running/starting|running/unhealthy) ;;
        *) docker logs "$candidate_id" >&2; fail "Candidate is not healthy: $health" ;;
    esac
    if (( SECONDS >= health_deadline )); then
        docker logs "$candidate_id" >&2
        fail "Candidate health timeout: $health"
    fi
    sleep 2
done

# Only append assets. A path collision with different bytes is an invalid release,
# not permission to break already-open browser tabs. No host-side asset staging.
docker cp "$candidate_id:/app/build/client/_app/immutable/." - | \
    docker exec -i "$helper_id" sh -eu -c '
        mkdir -p /tmp/immutable /assets/_app/immutable
        tar -xf - -C /tmp/immutable
        cd /tmp/immutable
        test -z "$(find . ! -type d ! -type f -print)" || { echo "Unsupported immutable asset type" >&2; exit 1; }
        find . -type f -print0 > /tmp/asset-files
        while IFS= read -r -d "" file; do
            target="/assets/_app/immutable/$file"
            if test -e "$target"; then
                cmp -s "$file" "$target" || { echo "Immutable asset collision: $file" >&2; exit 1; }
            else
                mkdir -p "${target%/*}"
                cp "$file" "$target.new"
                chmod 644 "$target.new"
                mv "$target.new" "$target"
            fi
        done < /tmp/asset-files
    '

smoke_id=$(docker create --name "${DEPLOY_PROJECT}-deploy-smoke-${RELEASE_ID}" --init --shm-size=1g \
    --network "$private_network" --label "deploy.project=$DEPLOY_PROJECT" --label deploy.role=smoke \
    --env CI=true --env "PLAYWRIGHT_BASE_URL=http://${candidate}:3000" \
    "$ci_image" bun x playwright test)
smoke_start_failed=0
docker start --attach "$smoke_id" || smoke_start_failed=1
smoke_exit=$(docker inspect --format '{{.State.ExitCode}}' "$smoke_id")
collect_reports || fail 'Could not preserve candidate Playwright reports.'
[[ $smoke_start_failed -eq 0 && $smoke_exit == 0 ]] || fail "Candidate Playwright smoke failed (exit $smoke_exit)."
[[ -f $REPORT_DIR/playwright.xml ]] || fail 'Candidate smoke did not produce its JUnit report.'

docker cp "$script_dir/nginx.conf" "$helper_id:/tmp/nginx.conf"
docker exec "$helper_id" sh -eu -c '
    mkdir -p "/deploy/releases/$1"
    sed -e "s/__RELEASE_ID__/$1/g" -e "s/__CANDIDATE__/$2/g" /tmp/nginx.conf > "/deploy/releases/$1/nginx.conf"
    printf "%s %s\n" "$1" "$3" > "/deploy/releases/$1/state"
    sync
' sh "$RELEASE_ID" "$candidate" "${active:--}"
docker exec "$helper_id" nginx -t -c "/deploy/releases/$RELEASE_ID/nginx.conf"

# Journal first; even SIGKILL/power loss must make the next deploy stop and ask
# for recovery, rather than guessing whether nginx accepted a previous reload.
promotion_started=1
candidate_may_serve=1
mutate_routing 'write promotion journal' docker exec "$helper_id" sh -eu -c 'printf "candidate=%s previous=%s\n" "$1" "$2" > /deploy/pending; sync' sh "$RELEASE_ID" "${active:--}"
select_release "$RELEASE_ID"
if [[ -n $gateway_id ]]; then
    docker exec "$gateway" nginx -t -c /deploy/current/nginx.conf
    mutate_routing 'reload candidate configuration' docker exec "$gateway" nginx -s reload -c /deploy/current/nginx.conf
else
    routing_mutation='create first gateway'
    gateway_id=$(docker create --name "$gateway" --restart unless-stopped \
        --network "$private_network" --label "deploy.project=$DEPLOY_PROJECT" --label deploy.role=gateway \
        --mount "type=volume,source=$config_volume,target=/deploy,readonly" \
        --mount "type=volume,source=$asset_volume,target=/assets,readonly" \
        --entrypoint nginx "$nginx_image" -c /deploy/current/nginx.conf -g 'daemon off;')
    routing_mutation=
    mutate_routing 'connect first gateway' docker network connect "$PROXY_NETWORK" "$gateway_id"
    mutate_routing 'start first gateway' docker start "$gateway_id" >/dev/null
fi
probe_release "$RELEASE_ID"
# Routing is committed once verified. A journal-cleanup failure must not undo a
# confirmed deployment without first establishing a new rollback journal.
committed=1
mutate_routing 'clear promotion journal' docker exec "$helper_id" sh -eu -c 'rm /deploy/pending; sync'
log "Deployed $RELEASE_ID through $gateway:3000; previous=${active:--}. Old releases and immutable assets are retained."
