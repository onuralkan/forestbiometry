#!/bin/sh
# Builds the upload package from site/ without docs, tests, scripts or dev files.
cd "$(dirname "$0")/.." || exit 1
rm -f ../onuralkan-site.zip
zip -qr ../onuralkan-site.zip . -x 'docs/*' 'tests/*' 'scripts/*' 'README.md' 'check.php' '.git/*' '.gitignore' 'CLAUDE.md'
unzip -l ../onuralkan-site.zip | tail -1
