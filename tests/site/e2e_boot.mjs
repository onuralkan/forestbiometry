// Browser test: a tool page must not stay blank when the browser store or a module stalls.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/site/e2e_boot.mjs http://127.0.0.1:8092
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8092';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const browser = await chromium.launch();
const PAGES = ['veri-denetcisi.php', 'seksiyon-hacmi.php', 'cap-dagilimi.php', 'mescere-yapisi.php', 'ornekleme.php'];
const box = '#steps > *, #app > *';

// 1. IndexedDB.open never answers: the tool still draws (memory fallback after the open time limit)
for (const f of PAGES) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => { const o = indexedDB.open.bind(indexedDB); indexedDB.open = () => ({}); void o; });
  const p = await ctx.newPage(); const t0 = Date.now();
  await p.goto(`${BASE}/${f}?lang=en`);
  const drawn = await p.waitForSelector(box, { timeout: 8000 }).then(() => true, () => false);
  ok(drawn, `${f}: draws with a stalled IndexedDB`);
  ok(Date.now() - t0 < 8000, `${f}: within 8 s`);
  ok(!(await p.$('#bootwarn')), `${f}: no boot warning once drawn`);
  await ctx.close();
}
// 2. a transaction that never completes (open works, get hangs): still draws
{
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => { const T = IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction = function (...a) { const t = T.apply(this, a); Object.defineProperty(t, 'oncomplete', { set() {}, get() { return null; } }); return t; }; });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/seksiyon-hacmi.php?lang=en`);
  ok(await p.waitForSelector(box, { timeout: 10000 }).then(() => true, () => false), 'hung transaction: draws');
  await ctx.close();
}
// 3. the tool module never arrives: a warning with a reload button after 10 s (TR text on a TR page)
{
  const ctx = await browser.newContext(); const p = await ctx.newPage();
  await p.route('**/assets/lab/secvol/ui.js*', () => {}); // never answered
  await p.goto(`${BASE}/seksiyon-hacmi.php?lang=tr`, { waitUntil: 'commit' });
  const w = await p.waitForSelector('#bootwarn', { timeout: 13000 }).then(() => true, () => false);
  ok(w, 'hung module: warning shown');
  ok(w && /yüklenemedi/.test(await p.textContent('#bootwarn')), 'warning in Turkish');
  ok(w && !!(await p.$('#bootwarn button')), 'reload button');
  await ctx.close();
}
// 4. the tool module fails (404): the warning comes at once
{
  const ctx = await browser.newContext(); const p = await ctx.newPage();
  await p.route('**/assets/lab/secvol/calc.js*', r => r.fulfill({ status: 404, body: '' }));
  await p.goto(`${BASE}/seksiyon-hacmi.php?lang=en`);
  ok(await p.waitForSelector('#bootwarn', { timeout: 4000 }).then(() => true, () => false), 'failed module: warning at once');
  await ctx.close();
}
// 5. a normal load shows no warning, even after the time limit
{
  const ctx = await browser.newContext(); const p = await ctx.newPage();
  await p.goto(`${BASE}/seksiyon-hacmi.php?lang=en`); await p.waitForSelector(box); await p.waitForTimeout(10500);
  ok(!(await p.$('#bootwarn')), 'normal load: no warning');
  await ctx.close();
}
await browser.close();
console.log(`boot e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
