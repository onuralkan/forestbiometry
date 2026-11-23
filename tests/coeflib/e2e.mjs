// Browser test for the Coefficient Library page (coefficient-library.php; DI-02).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/coeflib/e2e.mjs http://127.0.0.1:8092 [shots-dir]
// Sets are made in Node with the same schema code and stored in the page's browser storage; coefficient values are
// arbitrary test numbers.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const XLSX = require(path.join(ROOT, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const L = await import('../../assets/lab/coeflib/calc.js');
const { blankSet } = await import('../../assets/lab/core/coef.js');
const SI = await import('../../assets/lab/siteindex/calc.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/coefficient-library.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('dialog', d => d.accept());

const mk = (formId, params, extra) => ({ ...blankSet(formId), params, source: { citation: 'e2e test values' }, ...extra });
const gform = 'growth.cr', tform = 'taper.mb76', sform = blankSet(Object.keys(SI.FORMS || {}).length ? 'si.' + Object.keys(SI.FORMS)[0] : 'si.cr.ada.b0').form;
const sParams = Object.fromEntries((await import('../../assets/lab/core/coef.js')).form(sform).params.map((q, i) => [q.key, 0.0123456789012 + i]));
const SETS = [
  mk(gform, { b0: 31.123456789012345, b1: 0.04, b2: 1.3 }, { species: 'Abies', region: 'Isparta' }),
  mk(gform, { b0: 31.123456789012345, b1: 0.04, b2: 1.3 }, { species: 'Abies', region: 'Bolu', source: { citation: 'another source' } }),   // same coefficients
  mk(tform, { b1: -3.0257, b2: 1.4586, b3: -1.4464, b4: 39.1081, a1: 0.7431, a2: 0.1125 }, { output: { name: 'd', unit: 'cm', bark: 'ib' }, meta: { bark: 'ib' }, species: 'Pinus brutia' }),
  mk(sform, sParams, { meta: { ageType: SI.AGE_TYPES[0], topDef: 'h0dbh' }, region: 'Antalya' }),
];
const BAD = mk(tform, { b1: -3, b2: 1.4, b3: -1.4, b4: 39, a1: 0.74, a2: 0.11 }, { output: { name: 'd', unit: 'cm', bark: 'ob' }, species: 'no bark side' });   // no meta.bark: the tool's own check fails
const seed = async sets => page.evaluate(async ([sets, bad]) => {
  const C = await import('/assets/lab/core/coef.js'), S = await import('/assets/lab/core/store.js');
  await import('/assets/lab/taper/calc.js'); await import('/assets/lab/growth/calc.js'); await import('/assets/lab/siteindex/calc.js');
  for (const s of sets) { const r = await C.saveCoef(s); if (!r.ok) throw new Error(JSON.stringify(r.problems)); }
  if (bad) await S.put('coef:' + bad.id, { ...bad, modified: '2026-11-01T00:00:00Z' });
}, [sets, BAD]);
const count = () => page.locator('#libtab tbody tr[data-id]').count();

await page.goto(URL); await page.waitForSelector('#sumcard');
ok((await page.locator('.b-head').getAttribute('data-ids')) === 'DI-02' && (await page.locator('.b-ver').textContent()).includes(L.TOOL.version), 'tool id DI-02 and version');
ok(await page.locator('#sumnone').count() === 1 && await page.isDisabled('#b-backup'), 'empty library: explained, nothing to back up');

// a set entered through the editor (growth, no extra fields)
await page.selectOption('#e-tool', 'growth'); await page.waitForSelector('#cf-new'); await page.click('#cf-new');
for (const [k, v] of Object.entries({ b0: '25', b1: '0.05', b2: '1.1' })) await page.fill('#cf-p-' + k, v);
await page.click('#cf-save'); ok((await page.textContent('#cf-msg')).includes('citation is required'), 'editor: saving without a citation refused');
await page.fill('#cf-cit', 'editor e2e'); await page.click('#cf-save'); await page.waitForSelector('#libtab');
ok(await count() === 1 && (await page.textContent('#sumline')).includes('1 set(s)'), 'set saved from the editor appears in the list and the summary');

await seed(SETS); await page.reload(); await page.waitForSelector('#libtab');
ok(await count() === 6 && (await page.textContent('#sumline')).includes('6 set(s)'), 'six sets of three tools listed');
ok((await page.textContent('#sumdup')).includes('1 group(s)') && (await page.textContent('#sumprob')).includes('1 set(s)'), 'one duplicate group and one set with problems pointed out');
ok((await page.textContent(`#libtab tr[data-id="${BAD.id}"]`)).includes('has problems') && (await page.textContent(`#libtab tr[data-id="${SETS[1].id}"]`)).includes('a set with the same coefficients'), 'row states: problems, duplicate');
// filters
await page.selectOption('#f-tool', 'taper'); ok(await count() === 2, 'tool filter: two taper sets');
await page.selectOption('#f-tool', ''); await page.fill('#f-q', 'ISPARTA'); ok(await count() === 1 && (await page.inputValue('#f-q')) === 'ISPARTA', 'search ignores case (ISPARTA → Isparta); the box keeps its text');
await page.fill('#f-q', ''); await page.check('#f-prob'); ok(await count() === 1, 'only sets with problems'); await page.uncheck('#f-prob');
// details at full precision, with the problem in words
await page.click(`#libtab tr[data-id="${SETS[0].id}"] [data-act="more"]`);
ok((await page.textContent(`[data-detail="${SETS[0].id}"]`)).includes(String(SETS[0].params.b0)) && String(SETS[0].params.b0).length >= 18, `details: coefficient as stored (full precision, ${SETS[0].params.b0})`);
await page.click(`#libtab tr[data-id="${BAD.id}"] [data-act="more"]`);
ok((await page.textContent(`[data-detail="${BAD.id}"]`)).includes('Bark'), "details: the tool's own missing field named (bark side)");
// copy, delete
await page.click(`#libtab tr[data-id="${SETS[2].id}"] [data-act="copy"]`); await page.waitForFunction(() => document.querySelectorAll('#libtab tbody tr[data-id]').length === 7);
ok((await page.textContent('#status')).includes('Copy created') && (await page.textContent('#sumdup')).includes('2 group(s)'), 'copy: a seventh set, now a second duplicate group');
await page.click(`#libtab tr[data-id="${BAD.id}"] [data-act="del"]`); await page.waitForFunction(() => document.querySelectorAll('#libtab tbody tr[data-id]').length === 6);
ok(await page.locator('#sumprob').count() === 0, 'delete (confirmed): the set with problems is gone');
// edit opens the tool's editor with its own fields; a change is saved
await page.click(`#libtab tr[data-id="${SETS[3].id}"] [data-act="edit"]`); await page.waitForSelector('#cf-edit');
ok(await page.inputValue('#e-tool') === 'siteindex' && await page.inputValue('#cf-x-ageType') === SI.AGE_TYPES[0] && await page.inputValue('#cf-cit') === 'e2e test values', "edit: the site-index editor opens with the set and its own fields (age type)");
await page.fill('#cf-cit', 'e2e corrected citation'); await page.click('#cf-save'); await page.waitForFunction(() => document.querySelector('#libtab') && document.querySelector('#libtab').textContent.includes('e2e corrected citation'));
ok(true, 'edited citation shown in the list');
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'coeflib.png'), fullPage: true });

// backup, empty the library, restore with a preview
const [db] = await Promise.all([page.waitForEvent('download'), page.click('#b-backup')]); const bfile = await db.path();
const B = JSON.parse(await readFile(bfile, 'utf8'));
ok(B.schema === 'model-coef-library/1' && B.sets.length === 6 && B.sets.find(s => s.id === SETS[0].id).params.b0 === 31.123456789012345, 'backup: six sets, coefficients exact');
const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#b-xlsx')]);
const wb = XLSX.read(await readFile(await dx.path()), { type: 'buffer' }), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
ok(rows.length === 7 && rows[0][0] === 'id', 'Excel listing: one row per set');
await page.evaluate(async () => { const S = await import('/assets/lab/core/store.js'); for (const k of await S.keys('coef:')) await S.del(k); });
await page.reload(); await page.waitForSelector('#sumnone');
await page.setInputFiles('#b-restore', bfile); await page.waitForSelector('#rplan');
ok((await page.textContent('#rsum')).includes('6 new') && await page.locator('#rtab tbody tr').count() === 6 && await page.locator('#libtab').count() === 0, 'restore preview: six new sets, nothing stored before Apply');
await page.click('#r-apply'); await page.waitForSelector('#libtab');
ok(await count() === 6 && (await page.textContent('#status')).includes('6 set(s) loaded'), 'restore applied: six sets back');
await page.setInputFiles('#b-restore', bfile); await page.waitForSelector('#rplan');
ok((await page.textContent('#rsum')).includes('6 identical') && await page.isDisabled('#r-apply'), 'restoring the same file again: all identical, nothing to apply');
await page.click('#r-cancel');
await page.setInputFiles('#b-restore', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"schema":"other"}') }); await page.waitForSelector('#rbad');
ok(true, 'a file that is not a library is refused');
// English page text; phone
await page.goto(URL); await page.waitForSelector('#libtab'); ok((await page.textContent('#sumcard')).includes('Download a backup') && (await page.textContent('#libtab')).includes('Stem Taper'), 'English page');
const ph = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); ph.on('pageerror', e => errors.push(e.message));
await ph.goto(URL); await ph.waitForSelector('#sumcard'); ok(await ph.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'phone: no horizontal scroll');
if (SHOTS) await ph.screenshot({ path: path.join(SHOTS, 'coeflib-phone.png'), fullPage: true });
ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
console.log(`coeflib e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
