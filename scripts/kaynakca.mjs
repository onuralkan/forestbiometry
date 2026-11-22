// Builds inc/kaynakca.json (read by kaynakca.php) from the master copy docs/kaynakca.json (21 Nov 2026, user decision:
// the two files are no longer edited by hand). The site file is the master without the sources that only archived
// (removed) pages used: a reference is left out when every entry of its "tools" list says "archived". Order, fields
// and values are copied unchanged; the list is sorted alphabetically by first author (or title), then year and title
// (22 Nov 2026, user decision: a plain alphabetical reference list).
//   node scripts/kaynakca.mjs           write inc/kaynakca.json
//   node scripts/kaynakca.mjs --check   exit 1 if inc/kaynakca.json is not up to date (CI)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/kaynakca.json'), OUT = path.join(root, 'inc/kaynakca.json');

const refs = JSON.parse(readFileSync(SRC, 'utf8'));
if (!Array.isArray(refs)) { console.error('kaynakca: docs/kaynakca.json is not a list'); process.exit(1); }
const keys = new Set();
for (const r of refs) {
  if (!r || typeof r.key !== 'string' || !r.key) { console.error('kaynakca: a reference without a key'); process.exit(1); }
  if (keys.has(r.key)) { console.error(`kaynakca: duplicate key ${r.key}`); process.exit(1); }
  keys.add(r.key);
}
const archivedOnly = r => Array.isArray(r.tools) && r.tools.length > 0 && r.tools.every(t => /archived/i.test(String(t)));
const fold = s => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const sortKey = r => [fold((r.authors && r.authors[0]) || r.title), String(r.year || ''), fold(r.title)];
const cmp = (a, b) => { const x = sortKey(a), y = sortKey(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; return 0; };
const site = refs.filter(r => !archivedOnly(r)).sort(cmp);
const text = JSON.stringify(site, null, 1);

if (process.argv.includes('--check')) {
  let cur = ''; try { cur = readFileSync(OUT, 'utf8'); } catch (e) { /* missing counts as outdated */ }
  if (cur !== text) { console.error('kaynakca: inc/kaynakca.json is not up to date; run node scripts/kaynakca.mjs'); process.exit(1); }
  console.log(`kaynakca: inc/kaynakca.json up to date (${site.length} of ${refs.length} references)`);
} else {
  writeFileSync(OUT, text);
  console.log(`kaynakca: wrote inc/kaynakca.json (${site.length} of ${refs.length} references; ${refs.length - site.length} archived-only left out)`);
}
