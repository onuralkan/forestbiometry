// Browser test for the Inventory Data Manager (veri-yoneticisi.php; DI-03) and its links to the Data Checker, the tools
// index and the tools that read approved data. Packages: the sample package of Plot & Stand Metrics and a small one
// made here (values are arbitrary test numbers).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/projects/e2e.mjs http://127.0.0.1:8092 [shots-dir]
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const P = await import('../../assets/lab/core/projects.js');
const { sha256JSON } = await import('../../assets/lab/core/record.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/veri-yoneticisi.php?lang=tr';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('dialog', d => d.accept());
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const tmp = await mkdtemp(path.join(os.tmpdir(), 'di03-'));
const idb = key => page.evaluate(k => new Promise(res => { const r = indexedDB.open('forestbiometry'); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result ?? null); }; }), key);
const rows = () => page.locator('#ptab tbody tr[data-id]').count();
const rowOf = name => page.locator('#ptab tbody tr[data-id]', { hasText: name });
const sampleFile = path.join(ROOT, 'assets/lab/stand/ornek/ornek-veri.json'), sample = JSON.parse(await readFile(sampleFile, 'utf8'));
const small = { schema: 'forest-dataset/1', created: '2026-11-16T09:00:00.000Z', source: { trees: { name: 'deneme-alan.csv' } },
  plots: [{ plot_id: 'A1', plot_area: 400, stratum: null, n_records: 2 }, { plot_id: 'A2', plot_area: 400, stratum: null, n_records: 0 }],
  trees: [{ row: 2, plot_id: 'A1', tree_id: '1', stem_id: null, period: '2025', species: 'Pinus', dbh: 21.5, height: 14 }, { row: 3, plot_id: 'A1', tree_id: '2', stem_id: null, period: '2025', species: 'Pinus', dbh: 30, height: null }],
  warnings: [], excluded: [], changelog: [] };

// 1. empty, then a package approved before DI-03 is adopted
await page.goto(URL);
await page.waitForSelector('#actnone');
ok(await page.locator('#ptab').count() === 0 && (await page.textContent('#listline')).includes('paket yok'), 'empty: no active package, no list');
await page.evaluate(async ds => { const S = await import('/assets/lab/core/store.js'); await S.put('dataset:approved', ds); }, small);
await page.reload(); await page.waitForSelector('#ptab');
ok(await rows() === 1 && await page.locator('#ptab tr[data-active="1"]').count() === 1 && (await page.textContent('#ptab')).includes('önceki onay'), 'an earlier approval adopted as a project and active');
ok((await page.textContent('#actname')).includes('deneme-alan') && (await page.textContent('#actline')).includes('Kayıt: 2'), 'active package shown with its counts');

// 2. import the sample package: preview, apply; importing it again changes nothing
await page.setInputFiles('#b-imp', sampleFile); await page.waitForSelector('#rplan');
ok(await page.locator('#rplan li[data-act="add"]').count() === 1 && await rows() === 1, 'import preview: one new package, nothing changed yet');
await page.click('#r-apply'); await page.waitForSelector('#ptab tbody tr[data-id] >> nth=1');
ok(await rows() === 2 && (await page.textContent('#status')).includes('1 paket eklendi'), 'applied: two packages');
await page.setInputFiles('#b-imp', sampleFile); await page.waitForSelector('#rplan');
ok(await page.locator('#rplan li[data-act="same"]').count() === 1 && await page.isDisabled('#r-apply'), 'the same package again: recognised, nothing to add');
await page.click('#r-cancel');
const bad = path.join(tmp, 'bad.json'); await writeFile(bad, JSON.stringify({ schema: 'model-coef-library/1', sets: [] }));
await page.setInputFiles('#b-imp', bad); await page.waitForSelector('#rbad');
ok(true, 'another kind of file reported');
await page.click('#r-cancel').catch(() => {});

// 3. make the sample active: the tools read it
const sName = P.defaultName(sample, 'tr');
await rowOf(sName).locator('[data-act="activate"]').click(); await page.waitForSelector(`#ptab tr[data-active="1"]:has-text("${sName}")`);
ok((await rowOf(sName).getAttribute('data-active')) === '1' && (await idb('dataset:approved')).source.trees.name === sample.source.trees.name, 'activated: its package is handed to the tools');
ok(await sha256JSON(await idb('dataset:approved')) === await sha256JSON(sample), 'the package handed over is unchanged');
await page.goto(BASE + '/ornek-alan.php?lang=tr'); await page.waitForSelector('#useapp');
ok((await page.textContent('#step1')).includes(sample.source.trees.name), 'Plot & Stand Metrics offers the active package');
await page.goto(BASE + '/?lang=tr'); await page.waitForSelector('#handoff:not([hidden])');
ok((await page.textContent('#handoff-text')).includes(sName), 'tools index names the active project');

// 4. details, editing, copy, download
await page.goto(URL); await page.waitForSelector('#ptab');
await rowOf(sName).locator('[data-act="more"]').click(); await page.waitForSelector('.pdetail');
const s = P.summarize(sample);
ok(await page.locator('.htab tbody tr').count() === s.plots && await page.locator('.htab thead th').count() === 3 + s.periods.length, `plot × period table: ${s.plots} plots, ${s.periods.length} periods`);
ok((await page.textContent('.pdetail dl')).includes(String(s.records)), 'summary shows the record count');
await page.fill('form.pmeta input[name="name"]', ''); await page.click('form.pmeta button[type="submit"]');
ok(await page.locator('form.pmeta .mprob:not([hidden])').count() === 1, 'a name is required');
await page.fill('form.pmeta input[name="name"]', 'Bolu Aladağ envanteri'); await page.fill('form.pmeta input[name="year"]', '20x4'); await page.click('form.pmeta button[type="submit"]');
ok((await page.textContent('form.pmeta .mprob')).includes('dört haneli'), 'a bad year is refused');
await page.fill('form.pmeta input[name="year"]', '2024'); await page.fill('form.pmeta input[name="location"]', 'Bolu'); await page.fill('form.pmeta textarea[name="notes"]', 'deneme notu');
await page.click('form.pmeta button[type="submit"]'); await page.waitForSelector('#ptab tr:has-text("Bolu Aladağ envanteri")');
ok((await rowOf('Bolu Aladağ envanteri').textContent()).includes('2024') && (await page.textContent('#actname')).includes('Bolu Aladağ envanteri'), 'details saved; list and active card updated');
ok(await sha256JSON(await idb('dataset:approved')) === await sha256JSON(sample), 'editing details does not touch the package');
await shot('di03-1-yonetici');
await rowOf('Bolu Aladağ envanteri').locator('[data-act="copy"]').click(); await page.waitForSelector('#ptab tr:has-text("(kopya)")');
ok(await rows() === 3 && (await page.textContent('#ptab')).includes('kopya'), 'copy added');
const [d1] = await Promise.all([page.waitForEvent('download'), rowOf('deneme-alan').locator('[data-act="dl"]').click()]);
ok(await sha256JSON(JSON.parse(await readFile(await d1.path(), 'utf8'))) === await sha256JSON(small), 'a package downloads as the data package itself');
const [d2] = await Promise.all([page.waitForEvent('download'), page.click('#b-backup')]);
const lib = JSON.parse(await readFile(await d2.path(), 'utf8'));
ok(lib.schema === 'forest-project-library/1' && lib.projects.length === 3 && lib.projects.some(p => p.name === 'Bolu Aladağ envanteri' && p.year === 2024 && p.notes === 'deneme notu'), 'backup holds every project with its details');

// 5. delete: inactive first, then the active one
await rowOf('(kopya)').locator('[data-act="del"]').click(); await page.waitForFunction(() => document.querySelectorAll('#ptab tbody tr[data-id]').length === 2);
ok((await idb('dataset:approved')) !== null, 'deleting an inactive package keeps the active one');
await rowOf('Bolu Aladağ envanteri').locator('[data-act="del"]').click(); await page.waitForSelector('#actnone');
ok(await rows() === 1 && (await idb('dataset:approved')) === null && (await idb('project:active')) === null, 'deleting the active package: no package active');
// restore from the backup: the two deleted come back, the remaining one is the same
const bk = path.join(tmp, 'backup.json'); await writeFile(bk, JSON.stringify(lib));
await page.setInputFiles('#b-imp', bk); await page.waitForSelector('#rplan');
ok(await page.locator('#rplan li[data-act="add"]').count() === 1 && await page.locator('#rplan li[data-act="same"]').count() === 2, 'backup preview: the copy and the edited one share one package; the small one is there');
await page.click('#r-apply'); await page.waitForFunction(() => document.querySelectorAll('#ptab tbody tr[data-id]').length === 2);
ok(await page.locator('#ptab tr:has-text("Bolu Aladağ envanteri")').count() === 1, 'restored with its details');

// 6. tools index: deactivate keeps the package in the manager (the Data Checker's approval is tested in tests/checker/e2e.mjs)
await page.goto(BASE + '/?lang=tr');
await page.evaluate(async () => { const P = await import('/assets/lab/core/projects.js'); const l = await P.listProjects(); await P.setActive(l[0].id); });
await page.reload(); await page.waitForSelector('#handoff:not([hidden])');
const nBefore = await page.evaluate(async () => (await (await import('/assets/lab/core/projects.js')).listProjects()).length);
await page.click('#handoff-clear'); await page.waitForSelector('#handoff[hidden]', { state: 'attached' });
ok((await idb('dataset:approved')) === null && await page.evaluate(async () => (await (await import('/assets/lab/core/projects.js')).listProjects()).length) === nBefore, 'tools index: deactivate keeps the package in the manager');

// 7. English, phone
await page.goto(BASE + '/veri-yoneticisi.php?lang=en'); await page.waitForSelector('#ptab');
ok((await page.textContent('h1')).includes('Inventory Data Manager') && (await page.textContent('#actcard')).includes('No active package'), 'English');
const phone = await ctx.newPage(); await phone.setViewportSize({ width: 390, height: 800 });
await phone.goto(URL); await phone.waitForSelector('#ptab');
await phone.locator('#ptab [data-act="more"]').first().click(); await phone.waitForSelector('.pdetail');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
if (SHOTS) await phone.screenshot({ path: path.join(SHOTS, 'di03-2-telefon.png'), fullPage: true });

ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`DI-03 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
