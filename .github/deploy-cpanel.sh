#!/usr/bin/env bash
# Upload the site through the cPanel API over HTTPS (port 2083). Used by .github/workflows/deploy.yml.
# Env: CP_HOST, CP_USER, CP_TOKEN (cPanel API token), DIR (document root of forestbiometry.online), DRY_RUN=1 to only list.
# - Only git-tracked files, minus development folders, are sent.
# - Only files changed since the last deployed commit (kept in DIR/deploy-commit.txt) are sent; first run sends all.
# - Nothing on the server is deleted.
# - Safety: uploads only if DIR already holds this site (inc/site.php) or is a fresh, empty cPanel document root
#   (nothing but cgi-bin, .well-known, .htaccess, PHP settings files written by cPanel (.user.ini, php.ini), error_log and a default index page). Protects other folders on the account.
# - The server's own cPanel PHP-handler block in .htaccess (PHP version choice) is kept when .htaccess is replaced.
set -euo pipefail
API="https://$CP_HOST:2083"
AUTH="Authorization: cpanel $CP_USER:$CP_TOKEN"
DIR="${DIR%/}"
uapi() { curl -sS --max-time 120 -H "$AUTH" "$@"; }
ok() { jq -e '.status == 1' >/dev/null; }

# 1. safety check: the target folder must be this site, or an empty document root
if uapi -G "$API/execute/Fileman/get_file_information" --data-urlencode "path=$DIR/inc/site.php" | ok; then
  echo "Target holds this site (inc/site.php found)."
else
  listing=$(uapi -G "$API/execute/Fileman/list_files" --data-urlencode "dir=$DIR" --data-urlencode "show_hidden=1")
  if ! echo "$listing" | ok; then
    echo "::error::Cannot list $DIR through the cPanel API (wrong folder, user or token). Nothing was uploaded."
    echo "$listing" | jq -c '{status, errors}' 2>/dev/null || echo "$listing" | head -c 300
    exit 1
  fi
  others=$(echo "$listing" | jq -r '.data[].file' | grep -Ev '^(cgi-bin|\.well-known|\.htaccess|\.user\.ini|php\.ini|error_log|index\.html?|default\.html?)$' || true)
  if [ -n "$others" ]; then
    echo "::error::$DIR is neither this site (no inc/site.php) nor an empty document root. Nothing was uploaded. Found:"
    echo "$others" | head -20
    exit 1
  fi
  echo "Target is an empty document root: first deployment."
fi

# 2. what to send
filter() { grep -Ev '^(\.github/|data/|files/|docs/|tests/|scripts/|legacy/|\.gitignore$|README\.md$|CLAUDE\.md$|CITATION\.cff$|\.zenodo\.json$)' || true; }
last=$(uapi -G "$API/execute/Fileman/get_file_content" --data-urlencode "dir=$DIR" --data-urlencode "file=deploy-commit.txt" | jq -r 'if .status == 1 then .data.content else "" end' | tr -d '[:space:]')
if [ -n "$last" ] && git cat-file -e "$last^{commit}" 2>/dev/null; then
  git diff --name-only --diff-filter=ACMRT "$last" HEAD | filter > "$RUNNER_TEMP/list.txt"
  echo "Changes since ${last:0:7}: $(wc -l < "$RUNNER_TEMP/list.txt") file(s)"
else
  git ls-files | filter > "$RUNNER_TEMP/list.txt"
  echo "No previous deployment recorded: sending all $(wc -l < "$RUNNER_TEMP/list.txt") files"
fi
if [ "${DRY_RUN:-0}" = 1 ]; then cat "$RUNNER_TEMP/list.txt"; exit 0; fi

# 2b. .htaccess: keep the server's cPanel-generated PHP handler block (set by "MultiPHP Manager")
src_of() { echo "$1"; }
if grep -qx '\.htaccess' "$RUNNER_TEMP/list.txt"; then
  mkdir -p "$RUNNER_TEMP/ht"; cp .htaccess "$RUNNER_TEMP/ht/.htaccess"
  cur=$(uapi -G "$API/execute/Fileman/get_file_content" --data-urlencode "dir=$DIR" --data-urlencode "file=.htaccess" | jq -r 'if .status == 1 then .data.content else "" end')
  block=$(printf '%s\n' "$cur" | sed -n '/^# php -- BEGIN cPanel-generated handler/,/^# php -- END cPanel-generated handler/p')
  if [ -n "$block" ]; then printf '\n%s\n' "$block" >> "$RUNNER_TEMP/ht/.htaccess"; echo "Kept the server's cPanel PHP handler block in .htaccess"; fi
  src_of() { if [ "$1" = .htaccess ]; then echo "$RUNNER_TEMP/ht/.htaccess"; else echo "$1"; fi; }
fi

# 3. folders that do not exist yet are created first (parents before children)
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
  while read -r f; do [ "$(dirname "$f")" = "$d" ] || continue; i=$((i + 1)); args+=(-F "file-$i=@$(src_of "$f");filename=$(basename "$f")"); done < "$RUNNER_TEMP/list.txt"
  target="$DIR"; [ "$d" = . ] || target="$DIR/$d"
  res=$(uapi -X POST "$API/execute/Fileman/upload_files" -F "dir=$target" -F "overwrite=1" "${args[@]}")
  if echo "$res" | ok; then echo "uploaded $i file(s) to ${d}"
  else echo "::error::upload to $d failed: $(echo "$res" | jq -c '.errors // .data.uploads' 2>/dev/null || echo "$res" | head -c 300)"; fail=1; fi
done
[ "$fail" = 0 ] || exit 1

# 5. remember what is live now
uapi -X POST "$API/execute/Fileman/save_file_content" --data-urlencode "dir=$DIR" --data-urlencode "file=deploy-commit.txt" \
  --data-urlencode "content=$(git rev-parse HEAD)" | ok && echo "Deployed $(git rev-parse --short HEAD)"
