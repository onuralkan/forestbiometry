#!/bin/sh
# Fallback: builds the upload package (same file set as the automatic upload) for cPanel → File Manager → Upload + Extract.
cd "$(dirname "$0")/.." || exit 1
rm -f ../forestbiometry.zip
git ls-files | grep -Ev '^(\.github/|docs/|tests/|scripts/|legacy/|\.gitignore$|README\.md$|CLAUDE\.md$|CITATION\.cff$|\.zenodo\.json$)' | zip -q ../forestbiometry.zip -@
unzip -l ../forestbiometry.zip | tail -1
