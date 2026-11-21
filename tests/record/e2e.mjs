// Browser test for the reproducibility layer (DI-07): run-record downloads of the tools and the Record Verifier page
// (kayit-dogrulayici.php). Records are checked in Node with node:crypto (independent SHA-256) and the record module.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/record/e2e.mjs http://127.0.0.1:8092 [shots-dir]
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const R = await import('../../assets/lab/core/record.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const sha = b => createHash('sha256').update(b).digest('hex');
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
let nDl = 0;
const tmp = await mkdtemp(path.join(os.tmpdir(), 'di07-'));
const grab = async sel => { const [d] = await Promise.all([page.waitForEvent('download'), page.click(sel)]); const p = path.join(tmp, `${++nDl}-${d.suggestedFilename()}`); await d.saveAs(p); return { p, name: d.suggestedFilename(), obj: JSON.parse(await readFile(p, 'utf8')) }; };
const fileOf = rel => readFile(path.join(ROOT, rel));
const sealOk = async o => (await R.verifyRecord(o)).seal === true;

// 1. Growth Function Fitter: sample data, record without and with the data
await page.goto(BASE + '/buyume-islevi.php');
await page.evaluate(() => { try { localStorage.removeItem('recEmbed'); } catch (e) {} });
await page.reload();
await page.click('#sample'); await page.waitForSelector('#dread');
await page.click('#to2'); await page.click('#calc'); await page.waitForSelector('#ctab');
ok(await page.locator('[data-rec-embed]').count() === 1 && !(await page.isChecked('[data-rec-embed]')), 'growth: data option next to the JSON button, off by default');
const g1 = await grab('#x-json'), csv = await fileOf('assets/lab/growth/ornek/ornek-buyume.csv');
ok(g1.obj.format === 'run-record/1' && g1.obj.tool.id === 'buyume-islevi' && g1.obj.tool.page === 'buyume-islevi.php' && g1.obj.tool.ids.includes('SQ-03'), 'growth: envelope with tool, page and catalogue id');
ok(g1.obj.build && g1.obj.build.commit === null && g1.obj.build.site === 'https://forestbiometry.online/', 'growth: no commit in development (no deploy-commit.txt), canonical site');
ok(g1.obj.inputs.length === 1 && g1.obj.inputs[0].sha256 === sha(csv) && g1.obj.inputs[0].bytes === csv.length && !g1.obj.inputs[0].data, 'growth: input fingerprint = SHA-256 of the sample file, no data');
ok(Array.isArray(g1.obj.fits) && g1.obj.fits.length === 6 && g1.obj.settings && g1.obj.settings.columns.t && g1.obj.settings.decimal, 'growth: old payload kept (fits), settings with column names added');
ok(await sealOk(g1.obj), 'growth: seal verifies in Node');
await page.check('[data-rec-embed]');
const g2 = await grab('#x-json');
ok(g2.obj.inputs[0].data && Buffer.from(g2.obj.inputs[0].data.value, 'base64').equals(csv) && await sealOk(g2.obj), 'growth: with the option, the exact file bytes are in the record');
ok(await page.evaluate(() => localStorage.getItem('recEmbed')) === '1', 'growth: option remembered in this browser');
await page.uncheck('[data-rec-embed]');

// 2. the five tools that had no JSON download
async function viaTab(url, steps, json = '#x-json') { await page.goto(BASE + url); await steps(); return grab(json); }
const hd = await viaTab('/boy-cap.php', async () => {
  await page.click('#sample'); await page.waitForSelector('#impbox .fname'); await page.click('#to2');
  await page.click('#calc'); await page.waitForSelector('#ptab', { timeout: 60000 }); await page.click('#tab-export');
});
ok(hd.obj.tool.version === '1.1.1' && hd.obj.tool.ids.includes('SM-01') && hd.obj.fits.length === 6 && hd.obj.settings.columns.d && hd.obj.crossValidation && hd.obj.inputs[0].sha256 === sha(await fileOf('assets/lab/hd/ornek/ornek-boy-cap.csv')) && await sealOk(hd.obj), 'height–diameter 1.1.0: record with fits, CV, input fingerprint');
const ev = await viaTab('/model-degerlendirme.php', async () => {
  await page.click('#sample'); await page.waitForSelector('#impbox .fname'); await page.click('#to2');
  await page.click('#calc'); await page.waitForSelector('#panel table'); await page.click('#tab-export');
});
ok(ev.obj.tool.version === '1.2.0-beta.3' && ev.obj.models.length > 0 && ev.obj.models[0].overall && ev.obj.models[0].inference && ev.obj.models[0].inference.ci && ev.obj.inputs[0].sha256 === sha(await fileOf('assets/lab/eval/ornek/ornek-tahminler.csv')) && await sealOk(ev.obj), 'model evaluation 1.2.0-beta.1: record with measures, bias interval and input fingerprint');
const rk = await viaTab('/nispi-siralama.php', async () => {
  await page.click('#sample'); await page.waitForSelector('#impbox .fname'); await page.click('#to2');
  await page.click('#calc'); await page.waitForSelector('#panel table'); await page.click('#tab-export');
});
ok(rk.obj.tool.version === '1.1.0' && rk.obj.ranks.length > 0 && rk.obj.inputs[0].format === 'xlsx' && rk.obj.inputs[0].sha256 === sha(await fileOf('assets/lab/rank/ornek/ornek-olcutler.xlsx')) && await sealOk(rk.obj), 'relative ranking 1.1.0: record, XLSX input fingerprinted as bytes');
const sp = await viaTab('/ornekleme.php', async () => {
  await page.check('input[name="src"][value="pilot"]'); await page.click('#sample'); await page.waitForSelector('#plstats'); await page.check('#confirm'); await page.waitForSelector('#x-json');
});
ok(sp.obj.tool.version === '1.1.0' && sp.obj.plan && sp.obj.plan.n > 0 && sp.obj.pilot && sp.obj.inputs[0].sha256 === sha(await fileOf('assets/lab/sampling/ornek/ornek-pilot.csv')) && await sealOk(sp.obj), 'sampling planner 1.1.0: record with plan, pilot statistics and input fingerprint');
const st = await viaTab('/ornek-alan.php', async () => {
  await page.click('#sample'); await page.waitForSelector('.note.ok'); await page.check('#scope'); await page.click('#to2');
  await page.check('input[name="ec"][value="empty"]'); await page.click('#calc'); await page.waitForSelector('table.units'); await page.click('#tab-export');
});
const standDs = JSON.parse(await fileOf('assets/lab/stand/ornek/ornek-veri.json'));
ok(st.obj.tool.version === '1.2.1' && st.obj.units.length > 0 && st.obj.inputs[0].kind === 'dataset' && st.obj.inputs[0].sha256 === sha(Buffer.from(R.canonical(standDs))) && await sealOk(st.obj), 'plot & stand 1.2.0: record; data package fingerprinted in canonical form');

// 3. Record Verifier
await page.goto(BASE + '/kayit-dogrulayici.php');
ok((await page.locator('.b-ids').textContent()).includes('DI-07') && await page.locator('.b-side a[href="kayit-dogrulayici.php"]').count() === 1, 'verifier: DI-07 page in the sidebar');
ok(await page.locator('#nonote').count() === 1, 'verifier: empty state');
await page.setInputFiles('#recfile', g1.p);
await page.waitForSelector('#seal');
ok(await page.getAttribute('#seal', 'data-seal') === 'ok' && await page.getAttribute('#vernote', 'data-ver') === 'same', 'verifier: seal holds, same version as on the site');
{ const kv = await page.textContent('#sumkv'), ne = await page.locator('#intab tbody tr[data-emb="no"]').count(); ok(kv.includes('SQ-03') && ne === 1, 'verifier: ids and the input (fingerprint only): ' + kv + ' / ' + ne); }
ok(await page.locator('#settings').count() === 1 && (await page.textContent('#settings')).includes('"columns"'), 'verifier: settings shown');
// the user's own file: the original sample matches, a changed copy does not
const changed = path.join(tmp, 'degisik.csv'); await writeFile(changed, Buffer.concat([csv, Buffer.from('\n')]));
await page.setInputFiles('#chkfiles', [path.join(ROOT, 'assets/lab/growth/ornek/ornek-buyume.csv'), changed]);
await page.waitForSelector('#chklist');
ok(await page.locator('#chklist li[data-match="yes"]').count() === 1 && await page.locator('#chklist li[data-match="no"]').count() === 1 && await page.locator('#intab tr[data-match="yes"]').count() === 1, 'verifier: original file matches, one extra byte does not');
await shot('di07-1-dogrulama');
// embedded data: checked and downloadable
await page.setInputFiles('#recfile', g2.p); await page.waitForSelector('#intab');
ok(await page.locator('#intab tr[data-emb="ok"]').count() === 1, 'verifier: embedded data matches its fingerprint');
const [ed] = await Promise.all([page.waitForEvent('download'), page.click('[data-dl="0"]')]);
ok((await readFile(await ed.path())).equals(csv), 'verifier: embedded file downloads byte for byte');
// a changed record
const t = JSON.parse(JSON.stringify(g1.obj)); t.fits[0].theta[0] = 1; const tp = path.join(tmp, 'tampered.json'); await writeFile(tp, JSON.stringify(t, null, 1));
await page.setInputFiles('#recfile', tp); await page.waitForSelector('#seal[data-seal="bad"]');
ok(await page.locator('#seal[data-seal="bad"]').count() === 1 && (await page.textContent('#hexp')) !== (await page.textContent('#hact')), 'verifier: one changed number breaks the seal');
await shot('di07-2-bozuk');
// an older version and a pre-DI-07 file
const old = await R.seal({ ...g1.obj, tool: { ...g1.obj.tool, version: '0.9.0' }, build: { commit: 'a'.repeat(40), site: g1.obj.build.site } }); const op = path.join(tmp, 'old.json'); await writeFile(op, JSON.stringify(old));
await page.setInputFiles('#recfile', op); await page.waitForSelector('#vernote[data-ver="changed"]');
ok(await page.getAttribute('#vernote', 'data-ver') === 'changed' && await page.getAttribute('#seal', 'data-seal') === 'ok' && (await page.getAttribute('#sumkv a[target="_blank"]', 'href')).endsWith('/commit/' + 'a'.repeat(40)), 'verifier: older version reported, commit linked');
const lg = path.join(tmp, 'legacy.json'); await writeFile(lg, JSON.stringify({ tool: { id: 'bonitet', version: '1.0.0-beta.3' }, created: '2026-11-12T10:00:00Z', results: [] }));
await page.setInputFiles('#recfile', lg); await page.waitForSelector('#kindnote');
ok(await page.getAttribute('#kindnote', 'data-kind') === 'legacy' && (await page.textContent('#sumkv')).includes('Site Index'), 'verifier: pre-DI-07 JSON read as legacy');
const ds = path.join(tmp, 'ds.json'); await writeFile(ds, JSON.stringify(standDs));
await page.setInputFiles('#recfile', ds); await page.waitForSelector('#kindnote');
ok((await page.textContent('#kindnote')).includes('forest-dataset/1'), 'verifier: a data package is not a record');
// stand record + its data package file
await page.setInputFiles('#recfile', st.p); await page.waitForSelector('#intab');
await page.setInputFiles('#chkfiles', path.join(ROOT, 'assets/lab/stand/ornek/ornek-veri.json')); await page.waitForSelector('#chklist');
ok(await page.locator('#chklist li[data-match="yes"]').count() === 1, 'verifier: the data package file matches the dataset input');

// 4. English page text, phone
await page.reload(); await page.waitForSelector('#incard');
ok((await page.textContent('h1')).includes('Record Verifier') && (await page.textContent('#incard')).includes('Open a run record'), 'verifier: English');
const phone = await browser.newPage({ viewport: { width: 390, height: 800 } });
await phone.goto(BASE + '/kayit-dogrulayici.php'); await phone.setInputFiles('#recfile', g2.p); await phone.waitForSelector('#intab');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'verifier: no horizontal page scroll on a phone');
if (SHOTS) await phone.screenshot({ path: path.join(SHOTS, 'di07-3-telefon.png'), fullPage: true });

ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`DI-07 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
