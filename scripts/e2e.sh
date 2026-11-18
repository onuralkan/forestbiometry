#!/usr/bin/env bash
# Browser tests (tests/*/e2e*.mjs) against a running site, several at a time; used by CI (.github/workflows/deploy.yml)
# and by hand. Each test exits non-zero on a failure; this script prints every test's summary line and the FAIL lines,
# and exits non-zero if any test failed, timed out or crashed.
#   php -S 127.0.0.1:8092 (or FB_BUNDLE=1 php -S …, the bundled files the server gets), then
#   scripts/e2e.sh http://127.0.0.1:8092 [parallel jobs, default 4] [test files…]
set -u
BASE="${1:-http://127.0.0.1:8092}"; JOBS="${2:-4}"; shift $(( $# > 2 ? 2 : $# ))
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
if [ $# -gt 0 ]; then FILES=("$@"); else mapfile -t FILES < <(ls tests/*/e2e*.mjs); fi
OUT="$(mktemp -d)"; trap 'rm -rf "$OUT"' EXIT
run() { local f="$1" log="$OUT/$(echo "$1" | tr '/' '_').log"; local t0=$SECONDS
  timeout 420 node "$f" "$BASE" > "$log" 2>&1; local rc=$?
  echo "$rc $(( SECONDS - t0 ))" > "$log.rc"; }
export -f run; export BASE OUT
printf '%s\n' "${FILES[@]}" | xargs -P "$JOBS" -I{} bash -c 'run "$@"' _ {}
bad=0
for f in "${FILES[@]}"; do
  log="$OUT/$(echo "$f" | tr '/' '_').log"; read -r rc secs < "$log.rc"
  sum="$(grep -E 'passed, [0-9]+ failed' "$log" | tail -1)"
  if [ "$rc" -ne 0 ] || [ -z "$sum" ]; then bad=1; echo "✗ $f (exit $rc, ${secs}s) ${sum}"; grep -E '^FAIL|rror|ERR_|Timeout|timed out' "$log" | head -20 | sed 's/^/    /'
  else echo "✓ $f (${secs}s) $sum"; fi
done
[ "$bad" -eq 0 ] && echo "browser tests: all ${#FILES[@]} passed" || echo "browser tests: some failed"
exit "$bad"
