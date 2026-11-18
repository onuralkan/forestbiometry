#!/usr/bin/env bash
# The "R code" scripts of the model tools, run in R and compared with the tools' own numbers (tests/rcode/).
# Needs Rscript (and the packages the scripts load). Used by CI (.github/workflows/deploy.yml, job rcode) and by hand.
#   scripts/rcode-check.sh [folder]
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
DIR="${1:-$(mktemp -d)}"
node tests/rcode/make.mjs "$DIR" || exit 1
bad=0
while read -r name; do
  [ -z "$name" ] && continue
  ( cd "$DIR" && FB_RCODE_OUT="$name.out.csv" timeout 600 Rscript --vanilla "$name.R" > "$name.log" 2>&1 ) || { bad=1; echo "✗ $name: Rscript failed"; tail -20 "$DIR/$name.log" | sed 's/^/    /'; }
done < "$DIR/cases.txt"
node tests/rcode/compare.mjs "$DIR" || bad=1
exit "$bad"
