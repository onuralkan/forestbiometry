#!/usr/bin/env bash
# Upload the site through the cPanel API over HTTPS (port 2083). Used by .github/workflows/deploy.yml.
# Env: CP_HOST, CP_USER, CP_TOKEN (cPanel API token), DIR (document root of onuralkan.com.tr), DRY_RUN=1 to only list.
# - Only git-tracked files, minus development folders; data/ and files/ are never uploaded or deleted.
# - Only files changed since the last deployed commit (kept in DIR/.deploy-commit) are sent; first run sends all.
# - Nothing on the server is deleted.
# - Refuses to upload unless DIR already holds this site (inc/paper.php): protects the other domain on the account.
set -euo pipefail
API="https://$CP_HOST:2083"
AUTH="Authorization: cpanel $CP_USER:$CP_TOKEN"
DIR="${DIR%/}"
uapi() { curl -sS --max-time 120 -H "$AUTH" "$@"; }
ok() { jq -e '.status == 1' >/dev/null; }

# 1. safety check: the target folder must already be this site
info=$(uapi -G "$API/execute/Fileman/get_file_information" --data-urlencode "path=$DIR/inc/paper.php")
if ! echo "$info" | ok; then
  echo "::error::$DIR/inc/paper.php not found through the cPanel API (wrong folder, user or token). Nothing was uploaded."
  echo "$info" | jq -c '{status, errors}' || echo "$info" | head -c 300
  exit 1
fi

# 2. what to send
filter() { grep -Ev '^(\.github/|data/|files/|docs/|tests/|scripts/|\.gitignore$|README\.md$|CLAUDE\.md$|check\.php$)' || true; }
last=$(uapi -G "$API/execute/Fileman/get_file_content" --data-urlencode "dir=$DIR" --data-urlencode "file=.deploy-commit" | jq -r 'if .status == 1 then .data.content else "" end' | tr -d '[:space:]')
if [ -n "$last" ] && git cat-file -e "$last^{commit}" 2>/dev/null; then
  git diff --name-only --diff-filter=ACMRT "$last" HEAD | filter > "$RUNNER_TEMP/list.txt"
  echo "Changes since ${last:0:7}: $(wc -l < "$RUNNER_TEMP/list.txt") file(s)"
else
  git ls-files | filter > "$RUNNER_TEMP/list.txt"
  echo "No previous deployment recorded: sending all $(wc -l < "$RUNNER_TEMP/list.txt") files"
fi
if [ "${DRY_RUN:-0}" = 1 ]; then cat "$RUNNER_TEMP/list.txt"; exit 0; fi

# 3. folders that do not exist yet are created first (parents before children)
declare -A seen=()
dirs_needed() { while read -r f; do d=$(dirname "$f"); while [ "$d" != . ]; do echo "$d"; d=$(dirname "$d"); done; done < "$RUNNER_TEMP/list.txt" | sort -u; }
for d in $(dirs_needed | awk '{ print length, $0 }' | sort -n | cut -d' ' -f2-); do
  if ! uapi -G "$API/execute/Fileman/get_file_information" --data-urlencode "path=$DIR/$d" | ok; then
    parent=$(dirname "$d"); [ "$parent" = . ] && parent="" || parent="/$parent"
    res=$(uapi -G "$API/json-api/cpanel" --data-urlencode "cpanel_jsonapi_apiversion=2" --data-urlencode "cpanel_jsonapi_module=Fileman" \
      --data-urlencode "cpanel_jsonapi_func=mkdir" --data-urlencode "path=$DIR$parent" --data-urlencode "name=$(basename "$d")")
    echo "mkdir $d: $(echo "$res" | jq -r '.cpanelresult.event.result // .cpanelresult.error // "?"')"
  fi
done

# 4. upload, one request per folder (overwrite existing files)
fail=0
for d in $(while read -r f; do dirname "$f"; done < "$RUNNER_TEMP/list.txt" | sort -u); do
  args=(); i=0
  while read -r f; do [ "$(dirname "$f")" = "$d" ] || continue; i=$((i + 1)); args+=(-F "file-$i=@$f"); done < "$RUNNER_TEMP/list.txt"
  target="$DIR"; [ "$d" = . ] || target="$DIR/$d"
  res=$(uapi -X POST "$API/execute/Fileman/upload_files" -F "dir=$target" -F "overwrite=1" "${args[@]}")
  if echo "$res" | ok; then echo "uploaded $i file(s) to ${d}"
  else echo "::error::upload to $d failed: $(echo "$res" | jq -c '.errors // .data.uploads' 2>/dev/null || echo "$res" | head -c 300)"; fail=1; fi
done
[ "$fail" = 0 ] || exit 1

# 5. remember what is live now
uapi -X POST "$API/execute/Fileman/save_file_content" --data-urlencode "dir=$DIR" --data-urlencode "file=.deploy-commit" \
  --data-urlencode "content=$(git rev-parse HEAD)" | ok && echo "Deployed $(git rev-parse --short HEAD)"
