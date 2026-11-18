// Browser test for the Growth Function Fitter page (buyume-islevi.php; SQ-03).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/growth/e2e.mjs http://127.0.0.1:8092 [shots-dir]
// Values on screen are compared with the engine (assets/lab/growth/calc.js) run in Node on the same sample.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const XLSX = require(path.join(ROOT, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const { tableFromText, cellText } = await import('../../assets/lab/core/table.js');
const { parseNumber } = await import('../../assets/lab/core/num.js');
const G = await import('../../assets/lab/growth/calc.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/buyume-islevi.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })).newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

// engine on the same sample
const tbl = tableFromText(await readFile(path.join(ROOT, 'assets/lab/growth/ornek/ornek-buyume.csv'), 'utf8'), { delim: ';' });
const { obs } = G.readSeries(tbl, { series: 0, t: 1, y: 2 }, '.', parseNumber, cellText), tMax = Math.max(...obs.map(o => o.t));
const E = Object.fromEntries(G.FORM_IDS.map(id => [id, G.fitGrowth(obs, id)]));

await page.goto(URL + '?lang=tr'); await page.waitForSelector('#steps button');
ok((await page.locator('.b-ids').textContent()).trim() === 'SQ-03' && (await page.locator('.b-ver').textContent()).includes(G.TOOL.version), 'tool id SQ-03 and version');
ok(await page.isDisabled('#to2'), 'no data: cannot continue');
await page.click('#sample'); await page.waitForSelector('#dread');
ok((await page.textContent('#dread')).includes(`${obs.length} gözlem okundu, 3 dizi`) && await page.inputValue('#d-var') === 'boy' && await page.inputValue('#d-unit') === 'm', 'sample read: observations, series, variable and unit');
await page.click('#to2'); ok(await page.locator('[data-form]').count() === 6 && (await page.textContent('#step2')).includes('Korf'), 'six forms offered, Korf explained');
await page.click('#calc'); await page.waitForSelector('#ctab');
const rows = await page.$$eval('#ctab tbody tr', rs => rs.map(r => ({ form: r.dataset.form, cells: [...r.children].map(c => c.textContent.trim()) })));
ok(rows.length === 6, 'one comparison row per form');
for (const r of rows) {
  const e = E[r.form], d = e.status === 'ok' ? G.derived(r.form, e.theta, tMax) : null;
  const near = (s, v, dig) => s === '–' ? v == null : Math.abs(Number(s.replace(' ★', '')) - v) <= 0.5 * 10 ** -dig + 1e-9;
  ok(e.status === 'ok' && near(r.cells[3], e.rmse, 3) && near(r.cells[6], e.aic, 2) && near(r.cells[7], d.asymptote, 2) && near(r.cells[8], d.inflection, 1) && near(r.cells[9], d.maiCulmination, 1),
    `${r.form}: RMSE, AIC, asymptote, inflection and MAI culmination on screen = engine`);
}
const best = Object.values(E).filter(q => q.status === 'ok').sort((a, b) => a.aic - b.aic)[0].form;
ok(rows.find(r => r.form === best).cells[6].includes('★') && await page.inputValue('#selform') === best, 'smallest AIC starred and chosen for the details');
ok(await page.locator('#ch-curves svg path.ch-line').count() === 6 && await page.locator('#ch-curves svg .ch-pts circle').count() === obs.length, 'curves chart: six curves and every observation');
ok(await page.locator('#ch-inc svg path.ch-line').count() === 2 && (await page.textContent('#derived')).includes('Asimptot'), 'CAI and MAI chart, derived quantities');
await page.selectOption('#selform', 'gomp'); await page.waitForFunction(() => document.querySelector('#selform').value === 'gomp');
await page.evaluate(() => { document.querySelector('#ttab').closest('details').open = true; });
const tr1 = await page.$$eval('#ttab tbody tr', rs => rs.map(r => [...r.children].map(c => Number(c.textContent))));
const F = G.FORMS.gomp, th = E.gomp.theta;
ok(tr1.length > 10 && tr1.every(([t, y, cai, mai]) => Math.abs(y - F.f(th, t)) <= 5e-4 && Math.abs(cai - F.dy(th, t)) <= 5e-5 && Math.abs(mai - F.f(th, t) / t) <= 5e-5), 'Gompertz curve table (y, CAI, MAI) = engine');
await page.click('#savecoef'); ok((await page.textContent('#status')).includes('kaynak'), 'saving a curve needs a citation');
await page.fill('#cit', 'e2e'); await page.click('#savecoef'); await page.waitForFunction(() => document.querySelector('#status').textContent.includes('kaydedildi'));
const saved = await page.evaluate(async () => (await (await import('/assets/lab/core/coef.js')).listCoefs('growth')).length); ok(saved === 1, 'curve saved to the coefficient library');
const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]);
const wb = XLSX.read(await readFile(await dx.path()), { type: 'buffer' });
ok(['Bilgi', 'Karşılaştırma', 'Tahminler', 'Eğriler'].every(n => wb.SheetNames.includes(n)) && XLSX.utils.sheet_to_json(wb.Sheets['Karşılaştırma'], { header: 1 }).length === 7, 'Excel: Info, Comparison (6 forms), Predictions, Curves');
const pr = XLSX.utils.sheet_to_json(wb.Sheets['Tahminler'], { header: 1 }); ok(pr.length === obs.length + 1 && Math.abs(pr[1][pr[0].indexOf('pred_cr')] - G.FORMS.cr.f(E.cr.theta, obs[0].t)) <= 1e-6, 'Excel predictions at full precision');
{ const [rd] = await Promise.all([page.waitForEvent('download'), page.click('#x-r')]), rs = await readFile(await rd.path(), 'utf8');
  ok(rd.suggestedFilename().endsWith('.R') && rs.includes('data_file <- "ornek-buyume.csv"') && rs.includes('models$gomp <- m <- fb_model(quote(b0 * exp(-b1 * exp(-b2 * t)))') && rs.includes('fb_mai_peak') && rs.includes('fb_out(res)'),
    'R code: a .R file reading the user\'s file, the six forms, the increments (its numbers are checked in R by scripts/rcode-check.sh)'); }
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'growth-res.png'), fullPage: true });
// one form only, reload, English, phone
await page.click('#steps [data-go="2"]'); for (const id of G.FORM_IDS) if (id !== 'schu') await page.uncheck(`[data-form="${id}"]`);
await page.click('#calc'); await page.waitForSelector('#ctab'); ok(await page.locator('#ctab tbody tr').count() === 1 && await page.inputValue('#selform') === 'schu', 'one form: one row, chosen');
await page.waitForTimeout(400); await page.reload(); await page.waitForSelector('#ctab'); ok((await page.textContent('#status')).includes('geri yüklendi'), 'session restored');
await page.goto(URL + '?lang=en'); await page.waitForSelector('#ctab'); ok((await page.textContent('#ctab')).includes('Schumacher') && (await page.textContent('#steps')).includes('Results'), 'English page');
const ph = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); ph.on('pageerror', e => errors.push(e.message));
await ph.goto(URL + '?lang=tr'); await ph.waitForSelector('#steps button'); ok(await ph.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'phone: no horizontal scroll');
if (SHOTS) await ph.screenshot({ path: path.join(SHOTS, 'growth-phone.png'), fullPage: true });
ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
console.log(`growth e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
