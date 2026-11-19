// Writes every R-code case into a folder: <case>.R, its data files, <case>.expected.json. Used by scripts/rcode-check.sh.
//   node tests/rcode/make.mjs <folder>
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const dir = process.argv[2]; if (!dir) { console.error('usage: node tests/rcode/make.mjs <folder>'); process.exit(2); }
mkdirSync(dir, { recursive: true });
const SUITES = ['hd', 'nlsreg', 'growth', 'volume', 'mixed', 'eqsys', 'dist', 'distrec'];
const names = [];
for (const s of SUITES) for (const c of (await import(`./${s}.mjs`)).default()) {
  writeFileSync(path.join(dir, c.name + '.R'), c.script);
  for (const [f, text] of Object.entries(c.files)) writeFileSync(path.join(dir, f), text);
  writeFileSync(path.join(dir, c.name + '.expected.json'), JSON.stringify(c.expected));
  names.push(c.name);
}
writeFileSync(path.join(dir, 'cases.txt'), names.join('\n') + '\n');
console.log(`R code cases: ${names.join(', ')}`);
