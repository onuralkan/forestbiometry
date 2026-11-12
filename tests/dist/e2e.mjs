// Browser test for the diameter distribution tool, engine version (development page). Playwright, Chromium.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/dist/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const W = await import('../../legacy/weibull/calc.js');
const XLSX = require(path.join(root, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const E0 = await import('../../assets/lab/dist/index.js');
const F = await import('../../assets/lab/dist/fit/weibull.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/cap-dagilimi.php';
let pass = 0, fail = 0;
const fmt4 = v => String(Math.round(v * 1e4) / 1e4);
const fmt6 = v => String(Math.round(v * 1e6) / 1e6);
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const rowsOf = (fam = 'weibull') => page.evaluate(fam => [...document.querySelectorAll(`table.ptab[data-fam="${fam}"] tbody tr`)].map(tr => ({ m: tr.dataset.method, s: tr.dataset.status, c: [...tr.children].map(x => x.textContent.trim()) })), fam);
const navState = () => page.evaluate(() => ({ bar: document.querySelector('.navlab b')?.textContent, per: document.querySelector('[data-per][aria-pressed="true"]')?.textContent.trim(), pers: document.querySelectorAll('[data-per]').length,
  on: document.querySelector('#ulist .uitem.on .uid')?.textContent, list: [...document.querySelectorAll('#ulist .uid')].map(x => x.textContent) }));

// 0. the engine version is the published tool: listed, indexed; the old development address redirects
await page.goto(BASE + '/?lang=tr');
ok((await page.locator('a[href*="cap-dagilimi-2"]').count()) === 0 && (await page.locator('a[href*="cap-dagilimi.php"]').count()) > 0, 'tool listed under its published address');
await page.goto(BASE + '/cap-dagilimi-2.php?lang=en');
ok(page.url().endsWith('/cap-dagilimi.php?lang=en'), 'old development address redirects (query kept): ' + page.url());
await page.goto(URL + '?lang=tr');
ok((await page.locator('meta[name="robots"]').count()) === 0 || !(await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'), 'indexed (no noindex)');
ok((await page.locator('#devnote').count()) === 0 && (await page.locator('.b-kicker .b-ver').textContent()).trim() === 'sürüm ' + E0.TOOL.version, 'version in the page header, no release-notes banner');
ok((await page.locator('script[src*="assets/lab/weibull"]').count()) === 0, 'old Weibull interface not loaded');

// 1. two plots × two periods; one unreadable and one negative value; comma data read only with the comma setting
const d1 = [12.5, 15, 18.2, 22, 25.5, 31, 9.4, 14, 27, 20.1, 16.6, 23.3], d2 = [30, 34.5, 28, 41, 37.2, 33, 29.5, 45, 38, 36], d3 = [14, 16.5, 19, 24, 27.5, 33, 11, 15.5, 29, 22, 18, 25];
const lines = ['plot\tyear\tdbh', ...d1.map(v => `A\t2019\t${v}`), ...d3.map(v => `A\t2024\t${v}`), ...d2.map(v => `B\t2019\t${v}`), 'B\t2019\tx', 'B\t2019\t-4', 'C\t2019\t20', 'C\t2019\t20', 'C\t2019\t20'];
await page.locator('#impbox details summary').click(); await page.fill('#impbox textarea', lines.join('\n')); await page.click('#impbox [data-act="paste"]');
await page.waitForSelector('#impbox .fname'); await page.click('#to2');
ok(await page.inputValue('#dcol') === '2' && await page.inputValue('#pcol') === '0' && await page.inputValue('#percol') === '1', 'diameter, plot and period columns recognised');
ok(await page.isChecked('input[name="dec"][value="."]'), 'decimal point by default (Turkish interface)');
const offered = await page.evaluate(() => ({ fams: [...document.querySelectorAll('fieldset.fam')].map(x => x.dataset.fam), ms: [...document.querySelectorAll('[data-m]')].map(x => x.dataset.m), on: [...document.querySelectorAll('[data-m]:checked')].map(x => x.dataset.m) }));
ok(offered.fams.join() === 'weibull,normal,lognormal,gamma,beta,johnsonsb,exponential,loglogistic' && offered.ms.join() === 'weibull.ml,weibull.mom,weibull.pct,weibull.lmom,normal.ml,normal.qme,normal.mge,lognormal.ml,lognormal.mom,gamma.ml,gamma.mom,gamma.lmom,gamma.qme,gamma.mge,beta.ml,beta.mom,beta.qme,beta.mge,johnsonsb.cml,johnsonsb.mom,johnsonsb.kb,johnsonsb.pct,exponential.ml,loglogistic.ml,loglogistic.pct,loglogistic.logmom' && !offered.on.some(m => m.startsWith('beta.') || m.startsWith('johnsonsb.')) && (await page.locator('.bndcard').count()) === 0 && (await page.locator('[data-m*=".rec"]').count()) === 0, 'selector shows only registered families and methods: ' + JSON.stringify(offered));
for (const m of offered.ms) await page.uncheck(`[data-m="${m}"]`);
ok(await page.isDisabled('#calc') && (await page.locator('#atext').count()) === 0, 'no method chosen: cannot calculate, no location card');
for (const m of offered.ms) if (!/^(beta|johnsonsb|exponential|loglogistic)\./.test(m) && !/\.(lmom|qme|mge)$/.test(m)) await page.check(`[data-m="${m}"]`);   // P18 methods are checked in 2o   // P10 families are checked in 2e
ok((await page.locator('#famcard .note', { hasText: 'kesilmemiş veri varsayar' }).count()) === 1 && (await page.locator('#famcard [data-mnote]', { hasText: 'aynı denklemlerdir' }).count()) === 1, 'truncation not supported: stated; normal ML = moments explained');
ok(await page.isChecked('input[name="o-weibull.mom-varDivisor"][value="n"]') && await page.inputValue('#o-weibull-pct-p') === '0.24' && await page.inputValue('#o-weibull-pct-r') === '0.93', 'defaults: divisor n, percentiles 0.24 and 0.93 (Dubey)');
await page.fill('#o-weibull-pct-p', '0.95'); await page.locator('#o-weibull-pct-p').dispatchEvent('change');
ok(await page.isDisabled('#calc') && (await page.locator('[data-mopts="weibull.pct"] .note.err').textContent()).includes("r'den küçük"), 'p ≥ r: cannot calculate, reason shown');
await page.fill('#o-weibull-pct-p', '1,5'); await page.locator('#o-weibull-pct-p').dispatchEvent('change');
ok(await page.isDisabled('#calc'), 'p outside (0, 1): cannot calculate');
await page.fill('#o-weibull-pct-p', '0.24'); await page.locator('#o-weibull-pct-p').dispatchEvent('change');
await page.fill('#atext', '5'); await page.locator('#atext').dispatchEvent('change');
await page.click('#calc'); await page.waitForSelector('table.ptab', { state: 'attached' });
ok((await page.locator('#acc .note.warn').textContent()).includes('1 değer okunamadı') && (await page.locator('#acc').textContent()).includes('satırları: 36, 37'), 'unreadable and negative values reported with rows');
let ns = await navState();
ok(ns.list.join() === 'A,B,C' && ns.on === 'A' && ns.pers === 2 && ns.per === '2019', 'plots listed; A has two periods: ' + JSON.stringify(ns));
let rows = await rowsOf();
ok(rows.length === 6 && rows.map(r => r.m).join() === 'weibull.ml,weibull.ml,weibull.mom,weibull.mom,weibull.pct,weibull.pct' && rows.every(r => r.s === 'ok'), 'ML, moments and percentiles, each with a = 0 and a = 5');
const ml0 = W.fitML(d1, 0), ml5 = W.fitML(d1, 5, 'fixed'), mo0 = F.fitMoments(d1, { a: 0 }).params, pc5 = F.fitPercentiles(d1, { a: 5 }).params;
const cell = (r, k) => parseFloat(rows[r].c[k]);
ok(Math.abs(cell(0, 3) - ml0.b) < 6e-5 && Math.abs(cell(0, 4) - ml0.c) < 6e-5 && Math.abs(cell(1, 3) - ml5.b) < 6e-5 && Math.abs(cell(2, 4) - mo0.c) < 6e-5 && Math.abs(cell(5, 3) - pc5.b) < 6e-5 && Math.abs(cell(5, 4) - pc5.c) < 6e-5, 'ML equals the published tool; moments (divisor n) and percentiles equal the engine: ' + rows[0].c.slice(2, 5).join(' '));
ok(rows[0].c[1] === 'a = 0' && rows[1].c[1] === 'a = 5 (kullanıcı)' && rows[0].c[5] === '12', 'fixed parameter and n shown');
ok(rows[0].c[7] !== '–' && rows[2].c[7] === '–' && rows[4].c[7] === '–' && rows[2].c[6] !== '–' && rows[4].c[6] !== '–', 'AIC only for maximum likelihood; ln L for all');
ok(rows[2].c[0] === 'Momentler (ortalama ve varyans) · varyans: n bölen' && rows[4].c[0] === 'İki yüzdelik · p = 0.24, r = 0.93' && rows[4].c[12] === 'kapalı biçim · 0', 'settings named in the method cell; closed form solver: ' + rows[4].c[0] + ' | ' + rows[4].c[12]);
ok(rows[0].c[12].startsWith('ikiye bölme') && rows.every(r => !r.c.slice(2).join(' ').includes(',')), 'solver named; decimal point everywhere');
ok((await page.locator('ul.notes li', { hasText: 'n − 1' }).count()) === 0, 'default divisor n: no n − 1 note');
await shot('dist-1-parametreler');
{ // normal and lognormal tables
  const E = await import('../../assets/lab/dist/index.js');
  const nr = await rowsOf('normal'), lr = await rowsOf('lognormal'), no = E.runMethod('normal.ml', { d: d1 }), lm = E.runMethod('lognormal.ml', { d: d1 }), lo = E.runMethod('lognormal.mom', { d: d1 });
  ok(nr.length === 1 && Math.abs(parseFloat(nr[0].c[2]) - no.params.mu) < 6e-5 && Math.abs(parseFloat(nr[0].c[3]) - no.params.sigma) < 6e-5 && nr[0].c[6] !== '–', 'normal: one row (ML = moments), values, AIC');
  ok(lr.length === 2 && Math.abs(parseFloat(lr[0].c[2]) - lm.params.mu) < 6e-5 && Math.abs(parseFloat(lr[1].c[3]) - lo.params.sigma) < 6e-5 && lr[0].c[6] !== '–' && lr[1].c[6] === '–', 'lognormal: ML and moments, AIC only for ML');
  const heads = await page.evaluate(() => [...document.querySelectorAll('table.ptab[data-fam="lognormal"] thead th')].map(x => x.textContent));
  ok(heads.includes('μ (ln cm)') && heads.includes('σ (log ölçek)'), 'lognormal μ and σ labelled as log scale: ' + heads.join('|'));
  const gr = await rowsOf('gamma'), gm = E.runMethod('gamma.ml', { d: d1 }), gmo = E.runMethod('gamma.mom', { d: d1 });
  const gh = await page.evaluate(() => [...document.querySelectorAll('table.ptab[data-fam="gamma"] thead th')].map(x => x.textContent));
  ok(gr.length === 2 && Math.abs(parseFloat(gr[0].c[2]) - gm.params.k) < 6e-5 && Math.abs(parseFloat(gr[0].c[3]) - gm.params.theta) < 6e-5 && Math.abs(parseFloat(gr[1].c[2]) - gmo.params.k) < 6e-5 && gr[0].c[6] !== '–' && gr[1].c[6] === '–' && gr[0].c[11].startsWith('Brent'), 'gamma: ML (Brent) and moments, AIC only for ML');
  ok(gh.includes('k') && gh.includes('θ (cm)') && (await page.locator('#panel').textContent()).includes('Gamma (iki parametreli)'), 'gamma: shape k without unit, scale θ in cm: ' + gh.join('|'));
  ok((await page.locator('ul.notes li', { hasText: 'negatif çap olasılığı Φ(−μ/σ)' }).count()) === 1, 'normal: probability of a negative diameter shown');
  ok(await page.evaluate(() => [...document.querySelectorAll('.tile span')].some(x => x.textContent.includes('n − 1'))), 'both variances shown (n and n − 1)');
}
// divisor n − 1 reproduces the published tool; then back to n
await page.click('#steps [data-go="2"]'); await page.check('input[name="o-weibull.mom-varDivisor"][value="n-1"]'); await page.click('#calc'); await page.waitForSelector('table.ptab', { state: 'attached' });
rows = await rowsOf();
ok(Math.abs(cell(2, 4) - W.fitMoments(d1, 0).c) < 6e-5 && Math.abs(cell(3, 3) - W.fitMoments(d1, 5, 'fixed').b) < 6e-5 && rows[2].c[0].includes('n − 1') && (await page.locator('ul.notes li', { hasText: 'n − 1' }).count()) === 2, 'divisor n − 1: published moment results, divisor stated');
await page.click('#steps [data-go="2"]'); await page.check('input[name="o-weibull.mom-varDivisor"][value="n"]'); await page.click('#calc'); await page.waitForSelector('table.ptab', { state: 'attached' });
// period switch and plot change keep the selection consistent; no stale table
await page.click('[data-per]:not([aria-pressed="true"])');
const ml24 = W.fitML(d3, 0); rows = await rowsOf();
ok((await navState()).per === '2024' && Math.abs(cell(0, 3) - ml24.b) < 6e-5, 'period 2024: table recomputed for that period');
await page.click('#unext'); ns = await navState(); rows = await rowsOf();
ok(ns.on === 'B' && ns.pers === 0 && Math.abs(cell(0, 3) - W.fitML(d2, 0).b) < 6e-5 && rows[0].c[5] === '10', 'next plot B (one period): its own fit, n = 10 (bad values left out)');
await page.click('#unext'); rows = await rowsOf();
ok(rows.every(r => r.s === 'invalid' && r.c[3] === '–' && r.c[11] === 'hesaplanmadı') && (await page.locator('ul.notes li', { hasText: 'bütün çaplar eşit' }).count()) >= 1, 'plot C (equal diameters): no parameters, reason given');
ok((await page.locator('#ulist .uitem.on .st-error').count()) === 1, 'plot C marked as a problem in the list');
// charts
await page.click('#ulist [data-u="A"]'); await page.click('#tab-charts');
ok((await page.locator('#ch-h svg rect').count()) > 3 && (await page.locator('#ch-h svg path, #ch-h svg polyline').count()) >= 4 && (await page.locator('#ch-c svg').count()) === 1, 'histogram with four curves, cumulative chart');
await page.locator('[data-fit]').first().uncheck();
ok((await page.locator('[data-fit]:checked').count()) === 10, 'a fit can be hidden (eleven fits: Weibull 3 × 2 locations, normal, lognormal 2, gamma 2)');
await page.click('#ulist [data-u="C"]');
ok((await page.locator('#panel .note.warn', { hasText: 'tamamlanmış uydurma yok' }).count()) === 1 && (await page.locator('#ch-h').count()) === 0, 'no chart for a unit without a fit');
await shot('dist-2-grafik');
// result records (contract)
await page.click('#tab-params');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#x-json')]);
const js = JSON.parse(await readFile(await dl.path(), 'utf8'));
const r0 = js.results[0];
ok(js.tool.version === '2.2.0-beta.2' && js.results.length === 44 && r0.contract === 'dist-result/1' && r0.data.plot === 'A' && r0.data.period === '2019' && r0.data.n === 12 && r0.data.unit === 'cm', 'JSON: 4 units × 11 results with plot, period, n, unit');
ok(r0.params.b === ml0.b && r0.params.c === ml0.c && r0.fixed.a.origin === 'zero' && r0.free.join() === 'b,c' && r0.estimator === 'ml' && r0.convergence.solver === 'bisection' && r0.objective.name === 'logLik' && r0.fit.aic > 0 && js.settings.methods['weibull.mom'].varDivisor === 'n' && js.results[4].settings.p === 0.24 && js.results[4].targets.quantile === 'type7' && js.results[2].targets.varDivisor === 'n', 'JSON: full-precision parameters, fixed/free, estimator, solver, objective');
ok(js.results.filter(r => r.data.plot === 'C').every(r => r.status === 'invalid' && r.params === null && r.problems[0].code === 'constant'), 'JSON: failed fits carry a status and a reason, no parameters');
// Excel report and CSV files (all units)
{ const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]);
  ok(/^cap-dagilimi-\d{4}-\d{2}-\d{2}\.xlsx$/.test(dx.suggestedFilename()), 'Excel file name: ' + dx.suggestedFilename());
  const wb = XLSX.read(await readFile(await dx.path()));
  ok(wb.SheetNames.join() === 'Bilgi,Uydurmalar,Parametreler,Ornek alanlar,Siniflar,Karsilastirma,Bootstrap,Kaynaklar', 'Excel sheets: ' + wb.SheetNames.join());
  const fits = XLSX.utils.sheet_to_json(wb.Sheets.Uydurmalar, { header: 1 }), H = fits[0], info = XLSX.utils.sheet_to_json(wb.Sheets.Bilgi, { header: 1 });
  ok(fits.length === 45 && H[5] === 'method_id' && H[8] === 'status', 'Excel fits: 44 results + header');
  const f0 = fits.find(r => r[0] === 'A' && String(r[1]) === '2019' && r[5] === 'weibull.ml');
  ok(f0 && f0[13] === ml0.b && f0[15] === ml0.c && typeof f0[13] === 'number', 'Excel: Weibull b, c are numeric cells at full precision: ' + (f0 && [f0[13], f0[15]]));
  ok(fits.filter(r => r[0] === 'C').every(r => r[8] === 'invalid' && r[11] == null && String(r[9]).includes('eşit')), 'Excel: plot C rows carry no parameters, the reason in words');
  const pars = XLSX.utils.sheet_to_json(wb.Sheets.Parametreler, { header: 1 });
  ok(pars.some(r => r[0] === 'A' && r[4] === 'gamma.ml' && r[6] === 'theta' && r[7] === E0.runMethod('gamma.ml', { d: d1 }).params.theta), 'Excel parameters: gamma θ exact');
  ok(info.some(r => r[0] === 'Araç' && r[1] === 'cap-dagilimi 2.2.0-beta.2') && info.some(r => r[0] === 'Analize girmeyen kaynak satırları' && String(r[1]).includes('36')), 'Excel info: tool version, rows left out');
  const units = XLSX.utils.sheet_to_json(wb.Sheets['Ornek alanlar'], { header: 1 });
  ok(units.length === 5 && units[1][0] === 'A' && units[1][2] === 12, 'Excel units: one row per plot × period');
  const [dc] = await Promise.all([page.waitForEvent('download'), page.click('#x-fits')]), csv = await readFile(await dc.path(), 'utf8');
  ok(/^cap-dagilimi-uydurmalar-.*\.csv$/.test(dc.suggestedFilename()) && csv.charCodeAt(0) === 0xFEFF && csv.includes(',' + ml0.b + ',') && csv.split('\r\n').length === 45, 'fits CSV: BOM, comma separator, full-precision b, 45 lines');
  const [dp] = await Promise.all([page.waitForEvent('download'), page.click('#x-params')]); ok(/parametreler/.test(dp.suggestedFilename()) && (await readFile(await dp.path(), 'utf8')).includes(',theta,'), 'parameters CSV'); }

// 2. English keeps the values; comma setting; pooled mode
await page.click('#ulist [data-u="A"]');
await page.click('#langlink'); await page.waitForURL(/lang=en/); await page.waitForSelector('table.ptab', { state: 'attached' });
rows = await rowsOf();
ok(rows[1].c[1] === 'a = 5 (user)' && Math.abs(cell(0, 3) - ml0.b) < 6e-5 && rows[0].c[12].startsWith('bisection'), 'English: same values, translated labels');
await page.click('#steps [data-go="2"]'); await page.check('input[name="mode"][value="pool"]');
ok((await page.locator('.note.warn', { hasText: 'not a per-hectare weighted' }).count()) === 1, 'pooling warning');
await page.click('#calc'); await page.waitForSelector('table.ptab', { state: 'attached' });
ns = await navState();
ok(ns.list.length === 0 && ns.pers === 2 && (await page.locator('.navbar.single').count()) === 1, 'pooled: one unit per period, no plot list');
rows = await rowsOf();
ok(Math.abs(cell(0, 3) - W.fitML([...d1, ...d2, 20, 20, 20], 0).b) < 6e-5 && rows[0].c[5] === '25', 'pooled 2019 fit over 25 trees');

// 2b. separate workflow: recovery from summaries
await page.click('#langlink'); await page.waitForURL(/lang=tr/); await page.waitForSelector('table.ptab', { state: 'attached' });
await page.click('#wf-summary');
ok(await page.isHidden('#steps') && await page.isHidden('#step3') && await page.isVisible('#recover'), 'summary workflow replaces the steps');
const fillS = async (id, v) => { await page.fill(id, v); await page.locator(id).dispatchEvent('change'); };
await fillS('#s-mean', '20'); await page.check('input[name="s-which"][value="dq"]'); await fillS('#s-dq', '21');
await page.click('#s-calc'); await page.waitForSelector('table.rtab');
let rr = await page.evaluate(() => [...document.querySelectorAll('table.rtab tbody tr')].map(tr => ({ m: tr.dataset.method, s: tr.dataset.status, c: [...tr.children].map(x => x.textContent.trim()) })));
const Er = await import('../../assets/lab/dist/index.js'), lr2 = Er.runMethod('lognormal.rec', { type: 'summary', summary: { mean: 20, dq: 21 } });
ok(rr.map(r => r.m + ':' + r.s).join() === 'normal.rec:ok,lognormal.rec:ok,gamma.rec:ok' && rr.every(r => r.c[2] === '20' && r.c[3] === '21') && rr[1].c[1].includes(lr2.params.mu.toFixed(6).replace(/0+$/, '')) && rr[0].c[5] !== '–' && rr[1].c[5] === '–', 'recovery from mean and Dq: given values reproduced; P(D < 0) for the normal: ' + JSON.stringify(rr.map(r => r.c)));
ok((await page.locator('#ch-r svg path').count()) >= 2, 'recovered densities drawn');
const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#s-json')]);
const js2 = JSON.parse(await readFile(await dl2.path(), 'utf8'));
ok(js2.results.length === 3 && js2.results[1].kind === 'recover' && js2.results[1].data.type === 'summary' && js2.results[1].targets.source === 'dq' && js2.results[1].logLik === null && js2.summary.dq === 21, 'recovery JSON: kind, data type, inputs, no likelihood');
{ const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#s-xlsx')]), wb = XLSX.read(await readFile(await dx.path())), rows = XLSX.utils.sheet_to_json(wb.Sheets['Geri kazanim'], { header: 1 });
  const ln = rows.find(r => r[2] === 'lognormal.rec'), H = rows[0];
  ok(wb.SheetNames.join() === 'Bilgi,Geri kazanim,Kaynaklar' && rows.length === 4 && ln[7] === lr2.params.mu && ln[H.indexOf('Geri hesap: backDq')] === lr2.diagnostics.backDq, 'recovery Excel: exact μ and back-calculated Dq');
  const [dc] = await Promise.all([page.waitForEvent('download'), page.click('#s-csv')]); ok((await readFile(await dc.path(), 'utf8')).includes(String(lr2.params.mu)), 'recovery CSV: full-precision μ'); }
await fillS('#s-dq', '19'); await page.click('#s-calc'); await page.waitForSelector('table.rtab');
ok((await page.locator('table.rtab tr[data-status="invalid"]').count()) === 3 && (await page.locator('table.rtab', { hasText: 'Dq ortalama çaptan büyük olmalı' }).count()) === 1, 'Dq ≤ mean: no parameters, reason given');
await page.check('input[name="s-which"][value="var"]'); await fillS('#s-v', '40'); await page.check('input[name="s-div"][value="n-1"]');
await page.click('#s-calc'); await page.waitForSelector('table.rtab');
ok((await page.locator('table.rtab', { hasText: 'ağaç sayısı n gerekir' }).count()) === 1, 'n − 1 variance without n: refused with a reason');
await fillS('#s-n', '30'); await page.click('#s-calc'); await page.waitForSelector('table.rtab');
rr = await page.evaluate(() => [...document.querySelectorAll('table.rtab tbody tr')].map(tr => [...tr.children].map(x => x.textContent.trim())));
ok(rr.every(r => r[4] === '38.6667' && r[2] === '20') && (await page.locator('p', { hasText: 'n − 1 bölen, n ile çevrildi' }).count()) === 1, 'n − 1 variance converted with n: v = 40·29/30');
await page.waitForTimeout(600); await page.reload(); await page.waitForSelector('table.rtab');   // session writes are debounced (250 ms)
ok(await page.inputValue('#s-n') === '30' && await page.isVisible('#recover'), 'summary workflow restored after reload');
await page.click('#wf-raw'); await page.waitForSelector('table.ptab', { state: 'attached' });
ok(await page.isVisible('#steps') && await page.isHidden('#recover'), 'back to the raw-data workflow, results kept');

// 2c. beta: bounds entered by the user, never taken from the data; observations outside or on a bound refused
await page.click('#steps [data-go="2"]'); await page.check('[data-m="beta.ml"]'); await page.check('[data-m="beta.mom"]');
ok(await page.isDisabled('#calc') && (await page.locator('#bnd-beta .note.err', { hasText: 'beta için L ve U girin' }).count()) === 1 && (await page.inputValue('#b-L')) === '' && (await page.inputValue('#b-U')) === '', 'beta chosen: bounds empty (no automatic suggestion), cannot calculate');
ok((await page.locator('#bnd-beta', { hasText: 'en küçük çap 9.4 cm, en büyük 45 cm (sınır değildir)' }).count()) === 1, 'observed min/max shown as information only');
const setB = async (L, U) => { for (const [k, v] of [['L', L], ['U', U]]) { await page.fill('#b-' + k, v); await page.locator('#b-' + k).dispatchEvent('change'); } };
await setB('50', '10'); ok(await page.isDisabled('#calc') && (await page.locator('#bnd-beta', { hasText: "U, L'den büyük olmalı" }).count()) === 1, 'U ≤ L refused');
await setB('10', '50'); await page.click('#calc'); await page.waitForSelector('table.ptab[data-fam="beta"]', { state: 'attached' });
let br = await rowsOf('beta');
ok(br.length === 2 && br.every(r => r.s === 'invalid' && r.c[4] === '–') && (await page.locator('ul.notes li', { hasText: 'sınırların dışında (ör. 9.4 cm; L = 10, U = 50)' }).count()) >= 1, 'an observation below L: no beta estimate, reason given');
await page.click('#steps [data-go="2"]'); await setB('9.4', '50'); await page.click('#calc'); await page.waitForSelector('table.ptab[data-fam="beta"]', { state: 'attached' });
ok((await page.locator('ul.notes li', { hasText: 'tam sınırın üzerinde' }).count()) >= 1 && (await rowsOf('beta')).every(r => r.s === 'invalid'), 'an observation on L: refused, not moved');
await page.click('#steps [data-go="2"]'); await setB('5', '50'); await page.click('#calc'); await page.waitForSelector('table.ptab[data-fam="beta"]', { state: 'attached' });
{ const E = await import('../../assets/lab/dist/index.js'), pool = [...d1, ...d2, 20, 20, 20], bm = E.runMethod('beta.ml', { d: pool }, { L: 5, U: 50 }), bo = E.runMethod('beta.mom', { d: pool }, { L: 5, U: 50 });
  br = await rowsOf('beta'); const bh = await page.evaluate(() => [...document.querySelectorAll('table.ptab[data-fam="beta"] thead th')].map(x => x.textContent));
  ok(br.every(r => r.s === 'ok') && br[0].c[1] === 'L = 5 (kullanıcı), U = 50 (kullanıcı)' && Math.abs(parseFloat(br[0].c[4]) - bm.params.alpha) < 6e-5 && Math.abs(parseFloat(br[1].c[5]) - bo.params.beta) < 6e-5 && br[0].c[8] !== '–' && br[1].c[8] === '–', 'beta with L = 5, U = 50: ML and moments equal the engine, bounds shown as user-fixed: ' + JSON.stringify(br.map(r => r.c.slice(0, 9))));
  ok(bh.includes('L (cm)') && bh.includes('U (cm)') && bh.includes('α') && bh.includes('β') && br[0].c[13].startsWith('Newton'), 'beta header and solver'); }

// 2d. Johnson SB: ξ and λ by the user; CML, moments, KB 50/95 and a user pair
await page.click('#steps [data-go="2"]'); await page.uncheck('[data-m="beta.ml"]'); await page.uncheck('[data-m="beta.mom"]');
for (const m of ['johnsonsb.cml', 'johnsonsb.mom', 'johnsonsb.kb', 'johnsonsb.pct']) await page.check(`[data-m="${m}"]`);
ok(await page.isDisabled('#calc') && (await page.locator('#bnd-johnsonsb .note.err', { hasText: 'ξ ve λ girin' }).count()) === 1 && (await page.locator('#bnd-beta').count()) === 0, 'SB chosen: ξ and λ required, no automatic values');
ok((await page.locator('#famcard [data-mnote]', { hasText: 'dört parametrenin birlikte tahmini değildir' }).count()) === 1 && (await page.locator('#famcard [data-mnote]', { hasText: 'Knoebel ve Burkhart (1991)' }).count()) === 1, 'CML stated as conditional; KB source named');
for (const [k, v] of [['xi', '5'], ['lambda', '45']]) { await page.fill('#b-' + k, v); await page.locator('#b-' + k).dispatchEvent('change'); }
ok((await page.locator('#bnd-johnsonsb', { hasText: 'Üst sınır ξ + λ = 50 cm' }).count()) === 1 && await page.isEnabled('#calc'), 'upper bound ξ + λ shown');
await page.fill('#o-johnsonsb-pct-p', '0.1'); await page.locator('#o-johnsonsb-pct-p').dispatchEvent('change'); await page.fill('#o-johnsonsb-pct-r', '0.9'); await page.locator('#o-johnsonsb-pct-r').dispatchEvent('change');
await page.click('#calc'); await page.waitForSelector('table.ptab[data-fam="johnsonsb"]', { state: 'attached' });
{ const E = await import('../../assets/lab/dist/index.js'), pool = [...d1, ...d2, 20, 20, 20], o = { xi: 5, lambda: 45 };
  const exp = [E.runMethod('johnsonsb.cml', { d: pool }, o), E.runMethod('johnsonsb.mom', { d: pool }, o), E.runMethod('johnsonsb.kb', { d: pool }, o), E.runMethod('johnsonsb.pct', { d: pool }, { ...o, p: 0.1, r: 0.9 })];
  const sr = await rowsOf('johnsonsb'), sh = await page.evaluate(() => [...document.querySelectorAll('table.ptab[data-fam="johnsonsb"] thead th')].map(x => x.textContent));
  ok(sr.length === 4 && sr.every(r => r.s === 'ok') && sr.every((r, i) => Math.abs(parseFloat(r.c[4]) - exp[i].params.gamma) < 6e-5 && Math.abs(parseFloat(r.c[5]) - exp[i].params.delta) < 6e-5), 'SB: four methods equal the engine: ' + JSON.stringify(sr.map(r => r.c.slice(0, 6))));
  ok(sh.includes('ξ (cm)') && sh.includes('λ (cm)') && sh.includes('γ') && sh.includes('δ') && sr[0].c[1] === 'ξ = 5 (kullanıcı), λ = 45 (kullanıcı)' && sr[0].c[8] !== '–' && sr[1].c[8] === '–' && sr[3].c[0].includes('p = 0.1, r = 0.9'), 'SB header, user-fixed bounds, AIC only for CML, user pair named: ' + JSON.stringify([sh, sr.map(r => r.c.slice(0, 9))])); }
await page.click('#steps [data-go="2"]'); await page.fill('#b-xi', '9.4'); await page.locator('#b-xi').dispatchEvent('change'); await page.click('#calc'); await page.waitForSelector('table.ptab[data-fam="johnsonsb"]', { state: 'attached' });
ok((await rowsOf('johnsonsb')).every(r => r.s === 'invalid') && (await page.locator('ul.notes li', { hasText: 'tam sınırın üzerinde' }).count()) >= 1, 'SB: observation on ξ refused');

// 2e. exponential (same fixed location a as the Weibull) and log-logistic (ML, two percentiles, log-moments)
await page.click('#steps [data-go="2"]');
for (const m of ['johnsonsb.cml', 'johnsonsb.mom', 'johnsonsb.kb', 'johnsonsb.pct']) await page.uncheck(`[data-m="${m}"]`);
for (const m of ['exponential.ml', 'loglogistic.ml', 'loglogistic.pct', 'loglogistic.logmom']) await page.check(`[data-m="${m}"]`);
ok((await page.locator('#bnd-johnsonsb').count()) === 0 && (await page.locator('h2', { hasText: 'Sabit konum a (Weibull, üstel)' }).count()) === 1 && await page.isEnabled('#calc'), 'P10 families need no bounds; one location card for Weibull and exponential');
ok(await page.inputValue('#o-loglogistic-pct-p') === '0.25' && await page.inputValue('#o-loglogistic-pct-r') === '0.75' && (await page.locator('#famcard [data-mnote]', { hasText: 'sıradan momentler yöntemi değildir' }).count()) === 1 && (await page.locator('#famcard', { hasText: 'Ters J' }).count()) === 1, 'defaults 0.25/0.75; log-moments named apart from ordinary moments; exponential as a reverse-J reference');
await page.click('#calc'); await page.waitForSelector('table.ptab[data-fam="loglogistic"]', { state: 'attached' });
{ const E = await import('../../assets/lab/dist/index.js'), pool = [...d1, ...d2, 20, 20, 20];
  const e0 = E.runMethod('exponential.ml', { d: pool }, { a: 0 }), e5 = E.runMethod('exponential.ml', { d: pool }, { a: 5 });
  const lx = [E.runMethod('loglogistic.ml', { d: pool }), E.runMethod('loglogistic.pct', { d: pool }), E.runMethod('loglogistic.logmom', { d: pool })];
  const er = await rowsOf('exponential'), lr = await rowsOf('loglogistic');
  const eh = await page.evaluate(() => [...document.querySelectorAll('table.ptab[data-fam="exponential"] thead th')].map(x => x.textContent));
  const lh = await page.evaluate(() => [...document.querySelectorAll('table.ptab[data-fam="loglogistic"] thead th')].map(x => x.textContent));
  ok(er.length === 2 && er.every(r => r.s === 'ok') && er[0].c[1] === 'a = 0' && er[1].c[1] === 'a = 5 (kullanıcı)' && Math.abs(parseFloat(er[0].c[3]) - e0.params.r) < 6e-5 && Math.abs(parseFloat(er[1].c[3]) - e5.params.r) < 6e-5 && er[0].c[7] !== '–', 'exponential: a = 0 and the user a; rate equals the engine; AIC (ML): ' + JSON.stringify(er.map(r => r.c.slice(0, 8))));
  ok(eh.includes('r (1/cm)') && eh.includes('a (cm)') && (await page.locator('ul.notes li', { hasText: 'ölçek 1/r = ' + e0.diagnostics.scale.toFixed(4).replace(/0+$/, '') }).count()) === 1, 'rate r (1/cm) in the table, scale 1/r written separately: ' + eh.join('|'));
  ok(lr.length === 3 && lr.every(r => r.s === 'ok') && lr.every((r, i) => Math.abs(parseFloat(r.c[2]) - lx[i].params.b) < 6e-5 && Math.abs(parseFloat(r.c[3]) - lx[i].params.c) < 6e-5) && lr[0].c[6] !== '–' && lr[1].c[6] === '–' && lr[2].c[6] === '–', 'log-logistic: three methods equal the engine; AIC only for ML: ' + JSON.stringify(lr.map(r => r.c.slice(0, 7))));
  ok(lh.includes('b (cm)') && lh.includes('c') && lr[0].c[11].startsWith('Newton') && lr[1].c[0].includes('p = 0.25, r = 0.75'), 'log-logistic header, Newton solver, pair named'); }
await shot('dist-2e-p10');

// 2f. Weibull recovery, Poudel and Cao M2–M5 (summary workflow): §8.2 targets, location policy, only the needed fields, targets from raw data
await page.click('#wf-summary');
await page.click('#rt-wb');
ok(await page.inputValue('#w-mean') === '20' && await page.inputValue('#w-v') === '40' && await page.isChecked('input[name="w-div"][value="n-1"]') && await page.inputValue('#w-n') === '30', 'values typed in the first group are shared with the Weibull group (typed once)');
await page.check('input[name="w-div"][value="n"]');
ok((await page.locator('#recover [data-rm^="weibull."]').count()) === 0 && (await page.locator('#wbcard [data-wm]').count()) === 9 && (await page.locator('#wbcard [data-wm]:checked').count()) === 4 && !(await page.isChecked('[data-wm="weibull.m10"]')), 'Weibull M2–M10 in their own card (hybrids M6–M10 not preselected), not mixed with the moment recovery');
const fillW = async (id, v) => { await page.fill(id, v); await page.locator(id).dispatchEvent('change'); };
const S82 = { mean: '22.745276350061506', v: '57.65867565204488', dq: '23.979288394210368', q31: '18.45269745606343', q63: '24.95393865551951', q50: '22.272698012047496', q95: '36.01924299565496' };
for (const [k, v] of Object.entries(S82)) await fillW('#w-' + k, v);
await fillW('#w-dmin', '10');
ok((await page.locator('#wbcard', { hasText: 'Poudel ve Cao\'da D0 olarak geçer' }).count()) === 1 && (await page.locator('#wbcard', { hasText: 'Q(0) = a ile aynı şey değildir' }).count()) === 1, 'Dmin named, D0 of the source explained, not the zeroth percentile');
await page.click('#w-calc'); await page.waitForSelector('table.wtab');
const wrows = () => page.evaluate(() => [...document.querySelectorAll('table.wtab tbody tr')].map(tr => ({ m: tr.dataset.method, s: tr.dataset.status, c: [...tr.children].map(x => x.textContent.trim()) })));
let wr = await wrows();
ok(wr.length === 4 && wr.every(r => r.s === 'ok' && r.c[2] === '20' && r.c[3] === '2.5' && r.c[1].startsWith('a = 5 (0.5 × Dmin, Dmin = 10)')), '§8.2: a = 5, b = 20, c = 2.5 recovered by M2–M5 with a = 0.5 × Dmin: ' + JSON.stringify(wr.map(r => r.c.slice(0, 4))));
ok(wr[0].c[6].includes('1 kök') && wr[2].c[6] === 'kapalı biçim' && (await page.locator('#ch-w svg path').count()) >= 4, 'roots and interval reported; densities drawn');
await page.check('input[name="w-loc"][value="user"]'); await fillW('#w-a', '5'); await page.check('input[name="w-origin"][value="predicted"]');
await page.click('#w-calc'); await page.waitForSelector('table.wtab'); wr = await wrows();
ok(wr.every(r => r.s === 'ok' && r.c[2] === '20' && r.c[1] === 'a = 5 (kullanıcı)'), 'user a = 5: the same parameters, labelled as the user\'s');
{ const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#w-json')]); const j = JSON.parse(await readFile(await dl.path(), 'utf8'));
  ok(j.tool.version === '2.2.0-beta.2' && j.results.length === 4 && j.results.every(r => r.kind === 'recover' && r.targets.origin === 'predicted' && r.fixed.a.policy === 'user' && r.params.c > 2.4999999999 && r.params.c < 2.5000000001) && j.summary.origin === 'predicted', 'JSON: origin "predicted", location policy, full-precision parameters'); }
{ const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#w-xlsx')]), rows = XLSX.utils.sheet_to_json(XLSX.read(await readFile(await dx.path())).Sheets['Geri kazanim'], { header: 1 });
  ok(rows.length === 5 && rows.slice(1).every(r => r[4] === 'ok' && r[7] === 5 && Math.abs(r[11] - 2.5) < 1e-9) && rows.slice(1).every(r => /origin = predicted/.test(r[r.length - 1])), 'Weibull recovery Excel: a = 5, c = 2.5, origin of the targets'); }
for (const m of ['weibull.m2', 'weibull.m3']) await page.uncheck(`[data-wm="${m}"]`);
ok((await page.locator('#w-mean').count()) === 0 && (await page.locator('#w-v').count()) === 0 && (await page.locator('#w-dq').count()) === 0 && (await page.locator('#w-q31').count()) === 1 && (await page.locator('#w-q95').count()) === 1, 'only the fields the chosen methods need');
await fillW('#w-q63', '17'); await page.click('#w-calc'); await page.waitForSelector('table.wtab'); wr = await wrows();
ok(wr[0].s === 'invalid' && wr[0].c[2] === '–' && wr[0].c[5].includes('alttakinden') && wr[1].s === 'ok', 'Q63 ≤ Q31: no parameters, reason shown; M5 unaffected');
for (const m of ['weibull.m2', 'weibull.m3']) await page.check(`[data-wm="${m}"]`);
await page.check('input[name="w-loc"][value="half-dmin"]');
await page.locator('#wbcard .wbfill summary').click(); await page.selectOption('#w-unit', '0'); await page.click('#w-fill');
ok((await page.locator('#w-from').textContent()).includes('n = 25') && await page.isChecked('input[name="w-origin"][value="measured"]'), 'targets from the raw data (pooled 2019, n = 25), origin measured');
await page.click('#w-calc'); await page.waitForSelector('table.wtab'); wr = await wrows();
{ const E = await import('../../assets/lab/dist/index.js'), pool = [...d1, ...d2, 20, 20, 20], ex = ['m2', 'm3', 'm4', 'm5'].map(m => E.runMethod('weibull.' + m, { type: 'raw', d: pool }));
  ok(wr.every((r, i) => r.s === 'ok' && Math.abs(parseFloat(r.c[2]) - ex[i].params.b) < 6e-7 && Math.abs(parseFloat(r.c[3]) - ex[i].params.c) < 6e-7) && wr[0].c[1].includes('Dmin = 9.4'), 'raw-data targets: the same results as the engine on the diameters: ' + JSON.stringify(wr.map(r => r.c.slice(1, 4))));
  ok((await page.locator('p.small', { hasText: 'yüklü ham veriden hesaplandı' }).count()) === 1, 'record says the targets were computed from the data'); }
await fillW('#w-q50', '30');
ok((await page.locator('#w-from').count()) === 0, 'a target changed by hand: no longer "computed from the data"');
// 2g. hybrids M6–M10 (P07): §8.2 targets; M8/M9 two roots, M10 own location; states told apart
for (const m of ['weibull.m2', 'weibull.m3', 'weibull.m4', 'weibull.m5']) await page.uncheck(`[data-wm="${m}"]`);
for (const m of ['weibull.m6', 'weibull.m7', 'weibull.m8', 'weibull.m9', 'weibull.m10']) await page.check(`[data-wm="${m}"]`);
await page.check('input[name="w-loc"][value="user"]'); await fillW('#w-a', '5');
ok((await page.locator('#w-q25').count()) === 1 && (await page.locator('#w-dmin').count()) === 1 && (await page.locator('#w-n').count()) === 1 && (await page.locator('#w-v').count()) === 0, 'hybrid inputs: Q25, Dmin and n (for M10) shown, variance not needed');
for (const [k, v] of Object.entries({ ...S82, q25: '17.150527008986376', dmin: '8.4545396024095', n: '125' })) if (k !== 'v') await fillW('#w-' + k, v);
await page.click('#w-calc'); await page.waitForSelector('table.wtab'); wr = await wrows();
ok(wr.map(r => r.m + ':' + r.s).join() === 'weibull.m6:ok,weibull.m7:ok,weibull.m8:multiple,weibull.m9:multiple,weibull.m10:ok', 'states: M6, M7, M10 one solution; M8, M9 several: ' + wr.map(r => r.s));
ok(wr[0].c[2] === '20' && wr[0].c[3] === '2.5' && wr[4].c[2] === '20' && wr[4].c[1].startsWith('a = 5 (M10 kuralı: Dmin = 8.4545, n = 125)'), 'M6 and M10 recover b = 20, c = 2.5; M10 location rule shown');
ok(wr[2].c[2] === '–' && wr[2].c[5].includes('birden çok çözüm') && wr[2].c[5].includes('c = 0.1915') && wr[2].c[5].includes('c = 2.5') && wr[3].c[5].includes('c = 0.3986'), 'M8/M9: no single result, both candidates listed: ' + wr[2].c[5]);
ok(wr[0].c[4].includes('Q25: 17.1505 → 17.1505 *') && (await page.locator('#w-out', { hasText: 'yapı gereği eşleştirilmez' }).count()) === 1, 'hybrid: targets not matched by construction marked, note shown');
await fillW('#w-n', '8'); await fillW('#w-dmin', '5'); await fillW('#w-q50', '15'); await fillW('#w-mean', '6');
await page.click('#w-calc'); await page.waitForSelector('table.wtab'); wr = await wrows();
ok(wr[4].s === 'invalid' && wr[4].c[5].includes('negatif bir a') && wr[2].s === 'invalid' && wr[2].c[5].includes('çözüm yok'), 'M10 negative location and M8 without a root: no result, reasons shown');
// 2h. Johnson SB, Parresol (2003): ξ fixed, λ, γ, δ recovered (DIST_SPEC §8.3)
await page.click('#rt-prs');
ok(await page.inputValue('#p-mean') === '6' && await page.isChecked('input[name="p-qmode"][value="dq"]'), 'mean and Dq shared with the Parresol group');
await page.check('input[name="p-qmode"][value="ng"]');
{ const fillP = async (id, v) => { await page.fill(id, v); await page.locator(id).dispatchEvent('change'); };
  ok((await page.locator('#prscard').count()) === 1 && (await page.locator('#prscard', { hasText: 'türe özgü regresyon katsayıları' }).count()) === 1, 'Parresol card; species-specific equations stated as not used');
  for (const [k, v] of [['xi', '5'], ['mean', '20.972673017674087'], ['median', '20.464836861498966'], ['nha', '500'], ['g', '18.979383683389663']]) await fillP('#p-' + k, v);
  await page.click('#p-calc'); await page.waitForSelector('table.prtab');
  let pr = await page.evaluate(() => [...document.querySelectorAll('table.prtab tbody tr')].map(tr => ({ s: tr.dataset.status, c: [...tr.children].map(x => x.textContent.trim()) })));
  ok(pr.length === 1 && pr[0].s === 'ok' && pr[0].c.slice(1, 5).join('|') === '5|40|0.6|1.3', '§8.3: ξ = 5, λ = 40, γ = 0.6, δ = 1.3: ' + pr[0].c.slice(1, 5));
  ok(pr[0].c[5].includes('ortalama: 20.9727 → 20.9727') && pr[0].c[5].includes('medyan: 20.4648 → 20.4648') && pr[0].c[5].includes('Dq: 21.9842 → 21.9842') && pr[0].c[7].includes('12 başlangıç, 1 çözüm'), 'mean, median, Dq re-checked; starts and solutions reported');
  ok((await page.locator('#ch-p svg path').count()) >= 1, 'density drawn');
  const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#p-xlsx')]), rows = XLSX.utils.sheet_to_json(XLSX.read(await readFile(await dx.path())).Sheets['Geri kazanim'], { header: 1 });
  ok(rows.length === 2 && rows[1][2] === 'johnsonsb.parresol' && Math.abs(rows[1][9] - 40) < 1e-10 && Math.abs(rows[1][13] - 1.3) < 1e-10, 'Parresol Excel: λ and δ at full precision');
  await page.check('input[name="p-qmode"][value="both"]'); await fillP('#p-dq', '22.5'); await page.click('#p-calc'); await page.waitForSelector('table.prtab');
  pr = await page.evaluate(() => [...document.querySelectorAll('table.prtab tbody tr')].map(tr => ({ s: tr.dataset.status, c: [...tr.children].map(x => x.textContent.trim()) })));
  ok(pr[0].s === 'invalid' && pr[0].c[2] === '–' && pr[0].c[6].includes('tutarsız'), 'N, G and Dq disagree: no result, reason shown');
  await page.check('input[name="p-qmode"][value="dq"]'); await fillP('#p-dq', '20.05'); await fillP('#p-mean', '20'); await fillP('#p-median', '30'); await fillP('#p-xi', '0');
  await page.click('#p-calc'); await page.waitForSelector('table.prtab');
  pr = await page.evaluate(() => [...document.querySelectorAll('table.prtab tbody tr')].map(tr => ({ s: tr.dataset.status, c: [...tr.children].map(x => x.textContent.trim()) })));
  ok(pr[0].s === 'noconverge' && pr[0].c[2] === '–' && pr[0].c[6].includes('başlangıçtan hiçbiri'), 'no SB with these moments: "did not converge", no parameters'); }
await page.click('#wf-raw');

// 2i. measurement threshold (P11): conditional ML only, untruncated methods disabled, GOF on the conditional distribution
await page.click('#steps [data-go="2"]');
ok((await page.locator('#trcard').count()) === 1 && await page.isChecked('input[name="trmode"][value="none"]') && (await page.locator('[data-m$=".tml"]').count()) === 0, 'threshold card; no threshold by default; no truncated-ML rows without a threshold');
await page.check('input[name="trmode"][value="lower"]');
ok(await page.isDisabled('#calc') && (await page.locator('#trcard .note.err', { hasText: 'eşik değeri girin' }).count()) === 1, 'lower threshold chosen, value missing: cannot calculate');
await page.fill('#tr-L', '9'); await page.locator('#tr-L').dispatchEvent('change');
{ const st = await page.evaluate(() => ({ off: [...document.querySelectorAll('[data-m]:disabled')].map(x => x.dataset.m), tml: [...document.querySelectorAll('[data-m$=".tml"]')].map(x => [x.dataset.m, x.checked]) }));
  ok(st.off.includes('weibull.ml') && st.off.includes('normal.ml') && st.off.includes('gamma.mom') && !st.off.some(m => m.endsWith('.tml')), 'closed-form methods disabled with a threshold: ' + st.off.length);
  ok(st.tml.length === 8 && st.tml.filter(([m, c]) => c).map(([m]) => m).sort().join() === ['exponential.tml', 'gamma.tml', 'loglogistic.tml', 'lognormal.tml', 'normal.tml', 'weibull.tml'].sort().join(), 'truncated ML listed for every family; those needing bounds not preselected: ' + JSON.stringify(st.tml)); }
ok((await page.locator('#famcard .mnote', { hasText: 'kesilmiş veride geçerli değil' }).count()) > 5, 'reason shown under the disabled methods');
await page.click('#calc'); await page.waitForSelector('table.ptab[data-fam="weibull"]', { state: 'attached' });
{ const E = await import('../../assets/lab/dist/index.js'), pool = [...d1, ...d2, 20, 20, 20], ex = E.runMethod('weibull.tml', { d: pool }, { a: 0, trunc: { lower: 9, upper: null } });
  const G = E.trunc.truncated(E.family('weibull'), ex.params, ex.truncation), ks = E.gof.ks(G, ex.params, pool);
  const wt = await rowsOf('weibull');
  ok(wt.length >= 1 && wt[0].m === 'weibull.tml' && wt[0].s === 'ok' && Math.abs(parseFloat(wt[0].c[3]) - ex.params.b) < 6e-5 && Math.abs(parseFloat(wt[0].c[4]) - ex.params.c) < 6e-5, 'Weibull conditional ML equals the engine: ' + JSON.stringify(wt[0].c.slice(0, 6)));
  ok(Math.abs(parseFloat(wt[0].c[9]) - ks) < 6e-5 && wt[0].c[12].startsWith('Nelder–Mead'), 'KS against the conditional distribution; solver named');
  ok((await page.locator('ul.notes li', { hasText: 'eşik 9 ≤ d ≤ ∞ cm' }).count()) >= 1 && (await page.locator('.tile span', { hasText: 'eşik içinde' }).count()) === 1, 'threshold, mass and implied total stated; n labelled as measured inside the threshold');
  const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]), fits = XLSX.utils.sheet_to_json(XLSX.read(await readFile(await dx.path())).Sheets.Uydurmalar, { header: 1 }), H = fits[0], w = fits.find(r => r[5] === 'weibull.tml');
  ok(w && w[H.indexOf('Alt eşik (cm)')] === 9 && w[H.indexOf('Üst eşik (cm)')] == null && Math.abs(w[H.indexOf('P(eşik içinde)')] - ex.truncation.mass) < 1e-7 && w[H.indexOf('N (seçilen kapsam)')] === 25, 'Excel: thresholds, mass and N (observed) columns: ' + JSON.stringify(w && [H.indexOf('Alt eşik (cm)'), w[H.indexOf('Alt eşik (cm)')], w[H.indexOf('Üst eşik (cm)')], w[H.indexOf('P(eşik içinde)')], ex.truncation.mass, w[H.indexOf('N (seçilen kapsam)')]])); }
await page.click('#steps [data-go="2"]'); await page.check('input[name="trn"][value="population"]'); await page.fill('#tr-L', '10'); await page.locator('#tr-L').dispatchEvent('change');
await page.click('#calc'); await page.waitForSelector('table.ptab[data-fam="weibull"]', { state: 'attached' });
ok((await rowsOf('weibull'))[0].s === 'invalid' && (await page.locator('ul.notes li', { hasText: 'bildirilen eşiğin dışında (ör. 9.4 cm)' }).count()) >= 1, 'a diameter below the declared threshold: refused, reason given');
await page.click('#wf-summary');
ok((await page.locator('#wbcard', { hasText: 'ham veriden doldurma kapalı' }).count()) === 1 && (await page.locator('#w-fill').count()) === 0, 'recovery: filling from thresholded raw data disabled');
await page.click('#wf-raw'); await page.click('#steps [data-go="2"]'); await page.check('input[name="trmode"][value="none"]');
ok((await page.locator('[data-m="weibull.ml"]:disabled').count()) === 0 && (await page.locator('[data-m$=".tml"]').count()) === 0, 'threshold removed: untruncated methods back');

// 2j. class tables for raw data (P12): same edges for observed, probability, expected, N/ha and tails
await page.click('#calc').catch(() => {}); await page.waitForSelector('table.ptab', { state: 'attached' });
await page.click('#tab-classes'); await page.waitForSelector('table.ctab');
{ const E = await import('../../assets/lab/dist/index.js');
  await page.check('input[name="clmode"][value="width"]'); for (const [k, v] of [['start', '8'], ['width', '8']]) { await page.fill('#cl-' + k, v); await page.locator('#cl-' + k).dispatchEvent('change'); }
  await page.fill('#cl-area', '400'); await page.locator('#cl-area').dispatchEvent('change'); await page.waitForSelector('table.ctab');
  await page.selectOption('#cl-fit', { index: 0 });
  const rows = await page.evaluate(() => [...document.querySelectorAll('table.ctab tbody tr')].map(tr => [...tr.children].map(x => x.textContent.trim())));
  const tot = rows.find(r => r[0] === 'Toplam'), cl = E.classes.makeClasses({ start: 8, width: 8, max: 45 }), pool = [...d1, ...d2, 20, 20, 20], cnt = E.classes.countRaw(cl, pool);
  ok(rows[0][0] === '8 cm altı' && rows.length === cl.length + 3 && rows.slice(1, cl.length + 1).map(r => +r[1]).join() === cnt.counts.join(), 'observed counts per class from the same edges: ' + rows.map(r => r[0] + ':' + r[1]).join(' '));
  ok(tot && tot[2] === '1' && Math.abs(parseFloat(tot[3]) - 25) < 1e-3 && tot[1] === '25' && tot[4] === '625' && Math.abs(parseFloat(tot[5]) - 625) < 0.05, 'totals: probability 1, expected = n, N/ha = 25 × 10000/400: ' + tot);
  ok((await page.locator('#panel', { hasText: 'Σ|gözlenen − beklenen|' }).count()) === 1, 'sum of absolute differences and EI per hectare');
  const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#tab-params').then(() => page.click('#x-xlsx'))]);
  const cs = XLSX.utils.sheet_to_json(XLSX.read(await readFile(await dx.path())).Sheets.Siniflar, { header: 1 });
  ok(cs.length > 20 && cs[0][4] === 'Sınıf (cm)' && cs.some(r => r[4] === '[8, 16)' && typeof r[8] === 'number' && r[10] != null), 'Excel class sheet: classes, probabilities, N/ha'); }

// 2j'. comparison and diagnostics (P13)
await page.click('#tab-params'); await page.waitForSelector('table.cmptab');
{ const E = await import('../../assets/lab/dist/index.js');
  const t = await page.evaluate(() => [...document.querySelectorAll('.cmpgroup')].map(g => ({ h: g.querySelector('h3').textContent, ml: [...g.querySelectorAll('table[data-kind="ml"] tbody tr')].map(tr => [tr.dataset.method, ...[...tr.children].map(x => x.textContent.trim())]),
    desc: [...g.querySelectorAll('table[data-kind="desc"] tbody tr')].map(tr => [tr.dataset.method, ...[...tr.children].map(x => x.textContent.trim())]), mlHead: [...g.querySelectorAll('table[data-kind="ml"] th')].map(x => x.textContent), descHead: [...g.querySelectorAll('table[data-kind="desc"] th')].map(x => x.textContent) })));
  ok(t.length === 1 && t[0].h.includes('ölçüm eşiği yok') && t[0].ml.every(r => /\.ml$|\.cml$/.test(r[0])) && t[0].desc.every(r => !/\.ml$|\.cml$/.test(r[0])), 'one process group; likelihood fits apart from the descriptive ones: ' + JSON.stringify(t.map(g => [g.ml.map(r => r[0]), g.desc.map(r => r[0])])));
  ok(t[0].mlHead.includes('AIC') && t[0].mlHead.includes('ΔAIC') && t[0].mlHead.includes('AICc') && t[0].mlHead.includes('CvM W²') && !t[0].descHead.includes('AIC') && t[0].descHead.includes('ln L (log-skor)'), 'AIC columns only for likelihood fits; CvM shown; descriptive ln L labelled as log-score');
  const aicCol = t[0].mlHead.indexOf('AIC'), aics = t[0].ml.map(r => parseFloat(r[aicCol + 1]));
  ok(aics.every((v, i) => !i || v >= aics[i - 1]) && (await page.locator('.sortnote', { hasText: 'Sıralama: AIC (küçük daha iyi)' }).count()) >= 1, 'sorted by AIC, the criterion shown: ' + aics);
  ok(t[0].ml[0][t[0].mlHead.indexOf('ΔAIC') + 1] === '0', 'ΔAIC of the first row is 0');
  ok((await page.locator('#panel', { hasText: 'p değeri verilmez' }).count()) === 1 && (await page.locator('#panel', { hasText: /p[ -]değeri\s*[=:]\s*\d|p-value\s*[=:]/ }).count()) === 0, 'no p-values');
  await page.selectOption('#cmp-sort', 'cvm');
  const cv = await page.evaluate(() => { const tb = document.querySelector('table[data-kind="ml"]'), hd = [...tb.querySelectorAll('th')].map(x => x.textContent), c = hd.indexOf('CvM W²'); return [...tb.querySelectorAll('tbody tr')].map(tr => parseFloat(tr.children[c].textContent)); });
  ok(cv.every((v, i) => !i || v >= cv[i - 1]) && (await page.locator('.sortnote', { hasText: 'Sıralama: CvM W²' }).count()) >= 1, 'user switches the criterion: sorted by CvM: ' + cv);
  const pool = [...d1, ...d2, 20, 20, 20], wm = E.runMethod('weibull.ml', { d: pool }, { a: 0 }), cvRef = E.gof.cvm(E.family('weibull'), wm.params, pool);
  const wrow = await page.evaluate(() => { const tb = document.querySelector('table[data-kind="ml"]'), hd = [...tb.querySelectorAll('th')].map(x => x.textContent); return { c: hd.indexOf('CvM W²'), r: [...tb.querySelectorAll('tbody tr')].filter(tr => tr.dataset.method === 'weibull.ml').map(tr => [...tr.children].map(x => x.textContent.trim())).find(r => r[3] === 'a = 0') }; });
  ok(Math.abs(parseFloat(wrow.r[wrow.c]) - cvRef) < 6e-5, 'CvM of the Weibull ML equals the engine');
  await page.selectOption('#cmp-sort', 'aic');
  // charts: Q–Q, P–P, counts on the class edges
  await page.click('#tab-charts');
  ok((await page.locator('#ch-q svg circle').count()) === pool.length && (await page.locator('#ch-p svg circle').count()) === pool.length, 'Q–Q and P–P: one point per tree');
  await page.check('input[name="hscale"][value="count"]');
  ok((await page.locator('#ch-h', { hasText: 'Ağaç sayısı' }).count()) === 1 && (await page.locator('#ch-h', { hasText: 'Yoğunluk' }).count()) === 0, 'count scale: axis in trees, not density');
  await page.check('input[name="hscale"][value="density"]'); await page.click('#tab-params'); }

// 2j''. bootstrap (P14): Web Worker, same result as the engine, same seed → same result, cancel
await page.click('#tab-boot'); await page.waitForSelector('#bt-gof');
{ const E = await import('../../assets/lab/dist/index.js'), pool = [...d1, ...d2, 20, 20, 20];
  await page.selectOption('#bt-fit', { index: 0 }); await page.selectOption('#bt-B', '99');
  const fitKey = await page.inputValue('#bt-fit');
  ok(fitKey.startsWith('weibull.ml|') && (await page.locator('#bt-round option[value="auto"]').textContent()).includes('0.1 cm'), 'fit chosen; rounding detected from the data (0.1 cm): ' + fitKey);
  await page.click('#bt-gof'); await page.waitForSelector('#bt-gof-out table.bttab', { timeout: 120000 });
  const got = await page.evaluate(() => [...document.querySelectorAll('#bt-gof-out tr[data-stat]')].map(tr => [tr.dataset.stat, ...[...tr.children].slice(1).map(x => x.textContent.trim())]));
  const r0 = E.runMethod('weibull.ml', { d: pool }, { a: 0 }), ref = E.boot.bootstrapGOF({ result: r0, input: { d: pool }, opts: { a: 0 }, B: 99, seed: 20261111, step: 'auto' });
  ok(got.length === 3 && got.every(([k, t0, ge, pv]) => +ge === ref.stats[k].ge && Math.abs(parseFloat(pv) - ref.stats[k].p) < 6e-5), 'worker result = engine (same seed, same counts and p): ' + JSON.stringify(got) + ' vs ' + JSON.stringify(Object.fromEntries(Object.entries(ref.stats).map(([k, v]) => [k, [v.ge, v.p]]))));
  ok((await page.locator('#bt-gof-out .bt-meta').textContent()).includes('Seed 20261111; istenen 99, tamamlanan') && (await page.locator('#bt-gof-out .bt-meta').textContent()).includes('yuvarlama: 0.1 cm'), 'seed, requested and completed replicates, failures and rounding recorded');
  const first = await page.locator('#bt-gof-out table').innerHTML(); await page.click('#bt-gof'); await page.waitForFunction(() => !document.querySelector('#bt-gof').disabled, null, { timeout: 120000 });
  ok((await page.locator('#bt-gof-out table').innerHTML()) === first, 'same seed again → identical table');
  await page.selectOption('#bt-B', '999'); await page.evaluate(() => { document.getElementById('bt-ci').click(); document.getElementById('bt-cancel').click(); });   // start and cancel at once (999 replicates can finish within a second)
  await page.waitForTimeout(1500);
  ok((await page.locator('#status', { hasText: 'iptal edildi' }).count()) === 1 && (await page.locator('#bt-ci-out table').count()) === 0, 'cancel: no partial result shown');
  await page.selectOption('#bt-B', '199'); await page.click('#bt-ci'); await page.waitForSelector('#bt-ci-out table.bttab', { timeout: 120000 });
  const ci = await page.evaluate(() => [...document.querySelectorAll('#bt-ci-out tr[data-q]')].map(tr => [tr.dataset.q, ...[...tr.children].slice(1).map(x => parseFloat(x.textContent))]));
  const rci = E.boot.bootstrapCI({ result: r0, input: { d: pool }, opts: { a: 0 }, B: 199, seed: 20261111, step: 'auto', scheme: 'parametric' });
  ok(ci.length === 6 && ci.every(([k, est, lo, hi]) => Math.abs(lo - rci.intervals[k].lo) < 6e-5 && Math.abs(hi - rci.intervals[k].hi) < 6e-5 && lo <= est && est <= hi), 'intervals for b, c and Q25–Q95 = engine; estimate inside: ' + JSON.stringify(ci.map(x => x.slice(0, 4)))); }
await page.click('#tab-params');

// 2l. P15: sources of every result, state summary, exports keep version, settings, parameters and the bootstrap seed
await page.waitForSelector('#panel .srcs');
{ const src = await page.evaluate(() => ({ m: [...document.querySelectorAll('#panel .srcs li[data-src]')].map(x => x.dataset.src), r: [...document.querySelectorAll('#panel .srcs li[data-ref]')].map(x => x.dataset.ref), t: document.querySelector('#panel .srcs').textContent }));
  const ms = await page.evaluate(() => [...new Set([...document.querySelectorAll('#panel table.ptab tbody tr')].map(tr => tr.dataset.method))]);
  ok(src.m.join() === ms.join() && src.r.includes('R6') && src.r.includes('DUBEY') && src.r.includes('R10') && src.t.includes('METHODS.md §12 P05') && src.t.includes('d > a') && src.t.includes('okundu'), 'sources: every method with section, support and references; reading status: ' + src.r.join());
  ok((await page.locator('.pstates').count()) === 1 && (await page.locator('.pstates').textContent()).includes('sonuç hesaplandı'), 'computed and failed results counted apart');
  const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]), wb = XLSX.read(await readFile(await dx.path()));
  const bs = XLSX.utils.sheet_to_json(wb.Sheets.Bootstrap, { header: 1 }), ks = XLSX.utils.sheet_to_json(wb.Sheets.Kaynaklar, { header: 1 });
  ok(bs.length > 4 && bs.slice(1).every(r => r[7] === 20261111 && r[3] === 'weibull.ml') && bs.some(r => r[6] === 'gof' && typeof r[17] === 'number') && bs.some(r => r[6] === 'ci' && typeof r[20] === 'number'), 'Excel: bootstrap sheet with seed, numbers as numbers');
  ok(ks.some(r => r[0] === 'weibull.ml' && r[5] === 'METHODS.md §12 P05') && ks.some(r => r[0] === 'bootstrap') && ks.some(r => r[0] === 'R9' && String(r[1]).includes('goodness_of_fit')), 'Excel: sources sheet (methods, sections, references)');
  const [dj] = await Promise.all([page.waitForEvent('download'), page.click('#x-json')]), jj = JSON.parse(await readFile(await dj.path(), 'utf8'));
  ok(jj.tool.version === '2.2.0-beta.2' && jj.bootstrap.length === 2 && jj.bootstrap.every(b => b.result.seed === 20261111 && b.method === 'weibull.ml') && jj.sources.methods['weibull.ml'].section === 'P05' && jj.settings.dataType === 'raw' && jj.settings.threshold === null, 'JSON: version, settings, bootstrap runs with seed, sources');
  await page.click('#tab-charts'); await page.waitForSelector('#ch-q svg');
  const [dsv] = await Promise.all([page.waitForEvent('download'), page.click('#ch-q [data-svg]')]), svg = await readFile(await dsv.path(), 'utf8');
  const mt = svg.match(/<metadata>([^<]*)<\/metadata>/), meta = mt && JSON.parse(mt[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  const fq = meta && meta.fits[0], jr = fq && jj.results.find(r => r.method === fq.method && JSON.stringify(r.fixed) === JSON.stringify(fq.fixed));
  ok(meta && meta.tool.version === '2.2.0-beta.2' && meta.settings.methods['weibull.mom'].varDivisor === 'n' && meta.fits.length === 1 && jr && JSON.stringify(fq.params) === JSON.stringify(jr.params), 'SVG: version, settings and full-precision parameters in the file');
  await page.click('#tab-params'); }

// 2k. grouped data (class frequencies): grouped ML, counts vs per-hectare frequencies
{ const ctx2 = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } }), g = await ctx2.newPage();
  g.on('pageerror', e => errors.push(e.message));
  const E = await import('../../assets/lab/dist/index.js'), RG = JSON.parse(await readFile(path.join(root, 'tests/ref/dist_p12.json'), 'utf8'));
  const cw = RG.cases.find(x => x.family === 'weibull' && x.outside === 'zero' && !x.perha), ed = RG.edges;
  const lines = ['plot\tlo\thi\tn', ...cw.n.map((n, j) => `P1\t${ed[j]}\t${ed[j + 1] ?? ''}\t${n}`)];
  await g.goto(URL + '?lang=tr'); await g.locator('#impbox details summary').click(); await g.fill('#impbox textarea', lines.join('\n')); await g.click('#impbox [data-act="paste"]');
  await g.waitForSelector('#impbox .fname'); await g.click('#to2');
  ok(await g.isChecked('input[name="dtype"][value="classes"]') && await g.inputValue('#lcol') === '1' && await g.inputValue('#ucol') === '2' && await g.inputValue('#ncol') === '3', 'class table recognised: lower, upper, frequency columns');
  ok((await g.locator('[data-m$=".gml"]').count()) === 8 && (await g.locator('[data-m="weibull.ml"]').count()) === 0 && (await g.locator('#trcard').count()) === 0, 'only grouped ML offered; no threshold card');
  await g.click('#calc'); await g.waitForSelector('table.ptab[data-fam="weibull"]', { state: 'attached' });
  const gr = await g.evaluate(() => [...document.querySelectorAll('table.ptab[data-fam="weibull"] tbody tr')].map(tr => ({ s: tr.dataset.status, c: [...tr.children].map(x => x.textContent.trim()) })));
  ok(gr[0].s === 'ok' && Math.abs(parseFloat(gr[0].c[3]) - cw.params.b) < 6e-5 && Math.abs(parseFloat(gr[0].c[4]) - cw.params.c) < 6e-5 && gr[0].c[5] === String(cw.n.reduce((a, b) => a + b, 0)) && gr[0].c[7] !== '–' && gr[0].c[9] === '–', 'grouped Weibull ML = SciPy; n = Σ n_j; AIC given; no KS on classes: ' + gr[0].c.slice(2, 10));
  await g.click('#tab-charts'); ok((await g.locator('#ch-h svg rect.ch-bar').count()) === 7, 'histogram bars are the closed classes (open last not drawn)');
  await g.click('#tab-classes'); await g.waitForSelector('table.ctab');
  const ct = await g.evaluate(() => [...document.querySelectorAll('table.ctab tbody tr')].map(tr => [...tr.children].map(x => x.textContent.trim())));
  ok(ct.length === 10 && ct[1][1] === String(cw.n[0]) && ct.find(r => r[0] === 'Toplam')[2] === '1', 'class table from the data classes; total probability 1');
  await g.click('#steps [data-go="2"]'); await g.check('input[name="ctype"][value="perha"]'); await g.click('#calc'); await g.waitForSelector('table.ptab[data-fam="weibull"]', { state: 'attached' });
  const gp = await g.evaluate(() => [...document.querySelectorAll('table.ptab[data-fam="weibull"] tbody tr')].map(tr => [...tr.children].map(x => x.textContent.trim())));
  ok(Math.abs(parseFloat(gp[0][3]) - cw.params.b) < 6e-5 && gp[0][6] === '–' && gp[0][7] === '–' && (await g.locator('ul.notes li', { hasText: 'ağaç sayısı bilinmediği için' }).count()) >= 1, 'per-hectare frequencies: same parameters, no ln L or AIC, reason stated');
  await g.click('#steps [data-go="2"]'); await g.check('input[name="ctype"][value="count"]'); await g.check('input[name="outside"][value="unrecorded"]'); await g.click('#calc'); await g.waitForSelector('table.ptab[data-fam="weibull"]', { state: 'attached' });
  const cu = RG.cases.find(x => x.family === 'weibull' && x.outside === 'unrecorded'), gu = await g.evaluate(() => [...document.querySelectorAll('table.ptab[data-fam="weibull"] tbody tr')].map(tr => [...tr.children].map(x => x.textContent.trim())));
  ok(Math.abs(parseFloat(gu[0][4]) - cu.params.c) < 6e-5, 'outside "not recorded": conditional grouped ML = SciPy');
  await g.click('#tab-boot'); await g.waitForSelector('#bt-gof'); await g.selectOption('#bt-B', '99'); await g.click('#bt-gof'); await g.waitForSelector('#bt-gof-out table.bttab', { timeout: 120000 });
  ok((await g.locator('#bt-gof-out tr[data-stat="x2"]').count()) === 1 && (await g.locator('input[name="bt-scheme"][value="nonparametric"]').isDisabled()), 'grouped data: Pearson X² bootstrap; non-parametric scheme disabled');
  await g.click('#steps [data-go="2"]'); await g.check('input[name="outside"][value="zero"]'); await g.click('#calc'); await g.waitForSelector('table.ptab', { state: 'attached' }); await g.click('#tab-boot');
  ok((await g.locator('#panel', { hasText: 'desteklenmiyor' }).count()) === 1 && (await g.locator('#bt-gof').count()) === 0, 'unsupported combination stated, no button');
  await ctx2.close(); }

// 2m. P15: sample data with all eight families, failed fits told apart, one unit across all tabs; empty data; load failure
{ const c3 = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } }), q = await c3.newPage();
  q.on('pageerror', e => errors.push(e.message));
  await q.goto(URL + '?lang=tr'); await q.click('#sample'); await q.waitForSelector('#impbox .fname'); await q.click('#to2');
  for (const m of await q.evaluate(() => [...document.querySelectorAll('[data-m]')].map(x => x.dataset.m))) await q.check(`[data-m="${m}"]`);
  for (const [k, v] of [['L', '0'], ['U', '60'], ['xi', '0'], ['lambda', '60']]) { await q.fill('#b-' + k, v); await q.locator('#b-' + k).dispatchEvent('change'); }
  ok(!(await q.isDisabled('#calc')), 'sample: every method of the eight families can be calculated (bounds given)');
  await q.click('#calc'); await q.waitForSelector('table.ptab', { state: 'attached' });
  const ids = await q.evaluate(() => [...document.querySelectorAll('#ulist .uid')].map(x => x.textContent));
  const per = [];
  for (const id of ids) { await q.locator('#ulist .uitem', { hasText: id }).first().click(); await q.waitForFunction(id => document.querySelector('.navlab b')?.textContent.includes(id), id);
    per.push(await q.evaluate(() => ({ fams: [...document.querySelectorAll('table.ptab')].map(t => t.dataset.fam), rows: [...document.querySelectorAll('table.ptab tbody tr')].map(tr => ({ s: tr.dataset.status, p: tr.querySelector('td.num')?.textContent.trim() })),
      ok: +document.querySelector('.pstates').dataset.ok, bad: +document.querySelector('.pstates').dataset.bad, notes: document.querySelectorAll('ul.notes li').length }))); }
  const big = per.filter(x => x.ok > 0), small = per.filter(x => x.bad > 0);
  ok(per.every(x => x.fams.join() === 'weibull,normal,lognormal,gamma,beta,johnsonsb,exponential,loglogistic'), 'all eight families in every unit');
  ok(big.length >= 2 && big.some(x => x.rows.every(r => r.s === 'ok')), 'large plots: every method of every family ok');
  ok(small.length >= 1 && small.every(x => x.rows.filter(r => r.s !== 'ok').every(r => r.p === '–') && x.notes > 0 && x.ok + x.bad === x.rows.length), 'small plots: failed results without parameters, reasons in notes, counted apart');
  // one unit across all tabs
  await q.locator('#ulist .uitem', { hasText: ids[1] }).first().click();
  const bars = [];
  for (const t of ['params', 'charts', 'classes', 'boot']) { await q.click('#tab-' + t); await q.waitForTimeout(150); bars.push(await q.evaluate(() => document.querySelector('.navlab b')?.textContent + '|' + document.querySelector('#ulist .uitem.on .uid')?.textContent)); }
  ok(new Set(bars).size === 1 && bars[0].includes(ids[1]), 'the chosen plot stays the same in every tab: ' + bars.join(' / '));
  await q.click('#tab-params'); await c3.close(); }
{ const c4 = await browser.newContext(), q = await c4.newPage(); q.on('pageerror', e => errors.push(e.message));
  await q.goto(URL + '?lang=tr'); await q.locator('#impbox details summary').click(); await q.fill('#impbox textarea', 'plot;dbh\nA;\nA;x'); await q.click('#impbox [data-act="paste"]');
  await q.waitForSelector('#impbox .fname'); await q.click('#to2'); await q.click('#calc'); await q.waitForSelector('#nodata');
  ok((await q.locator('#nodata').textContent()).includes('Analize girecek çap yok') && (await q.locator('#acc').textContent()).includes('2 değer okunamadı') && (await q.locator('table.ptab').count()) === 0, 'empty/missing data: stated, no tables');
  await c4.close(); }
{ const c5 = await browser.newContext(), q = await c5.newPage();
  await q.route('**/assets/lab/dist/ui.js*', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>One moment, please...</title>' }));
  await q.goto(URL + '?lang=en'); await q.waitForSelector('#loadfail:not([hidden])', { timeout: 20000 });
  ok((await q.locator('#loadfail').textContent()).includes('could not be loaded') && (await q.locator('#loadfail button').count()) === 1, 'load failure (HTML instead of JavaScript): warning with a reload button');
  await c5.close(); }
{ await page.goto(URL + '?lang=tr'); await page.waitForTimeout(16000);
  ok(await page.isHidden('#loadfail'), 'normal load: no warning after the watchdog time'); }

// 2n. stand models (P16): sample data, training (NLS, SUR), plot-level validation, model file out and in, prediction
{ const c6 = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } }), q = await c6.newPage();
  q.on('pageerror', e => errors.push(e.message));
  const E = await import('../../assets/lab/dist/index.js'), { tableFromText } = await import('../../assets/lab/core/table.js');
  const csvS = await readFile(path.join(root, 'assets/lab/dist/ornek/ornek-mescere.csv'), 'utf8'), XS = E.stand.extractStandUnits(tableFromText(csvS, { delim: ',' }), { dcol: 2, pcol: 0, percol: 1, decimal: '.', unit: 'cm', cols: { N: 3, H: 4, A: 5 } });
  await q.goto(URL + '?lang=tr'); await q.click('#wf-stand'); await q.waitForSelector('#st-train');
  ok(await q.isDisabled('#st-train-btn') && (await q.locator('#st-train', { hasText: 'Önce bir ağaç tablosu yükleyin' }).count()) >= 1, 'no data: cannot train, reason shown');
  await q.click('#st-sample'); await q.waitForSelector('#st-ncol');
  ok(await q.inputValue('#st-ncol') === '3' && await q.inputValue('#st-hcol') === '4' && await q.inputValue('#st-acol') === '5' && await q.inputValue('#st-pcol') === '0', 'sample: diameter, plot, N, H and age columns recognised');
  await q.click('#st-train-btn'); await q.waitForSelector('table.sttab');
  const ref = E.stand.train(XS.units, { set: 'ppm.weibull', terms: E.stand.TERMS, fit: 'nls', hColumn: 'H_m' }), refCv = E.stand.crossValidate(XS.units, { set: 'ppm.weibull', terms: E.stand.TERMS, fit: 'nls' }, 5);
  const rowsS = await q.evaluate(() => [...document.querySelectorAll('table.sttab tbody tr')].map(tr => [tr.dataset.key, ...[...tr.children].slice(1).map(td => parseFloat(td.textContent))]));
  ok(rowsS.length === 2 && rowsS.every((r, j) => r.slice(1, 6).every((v, i) => Math.abs(v - ref.equations[j].beta[i]) < 6e-7 * Math.max(1, Math.abs(ref.equations[j].beta[i])))), 'PPM NLS coefficients = engine: ' + JSON.stringify(rowsS));
  ok((await q.locator('#st-cvsum').textContent()).includes(`${refCv.summary.units} birimin ${refCv.summary.ok} tanesi`) && (await q.locator('#st-train', { hasText: 'H olarak kullanılan sütun: H_m' }).count()) === 1, 'validation summary and the H column recorded');
  await q.check('input[name="st-fit"][value="sur"]'); await q.click('#st-train-btn'); await q.waitForSelector('table.sttab');
  ok((await q.locator('#st-out', { hasText: 'SUR' }).count()) >= 1 && (await q.locator('#st-out', { hasText: 'artık korelasyonları' }).count()) === 1, 'SUR: rounds and residual correlations between equations reported');
  await q.check('input[name="st-fit"][value="mcdfr"]'); await q.click('#st-train-btn'); await q.waitForSelector('#st-cdf', { timeout: 120000 });
  { const mc = E.stand.train(XS.units, { set: 'ppm.weibull', terms: E.stand.TERMS, fit: 'mcdfr', width: 2 }), txt = await q.locator('#st-cdf').textContent();
    ok(txt.includes(fmt6(mc.cdf.objective)) && txt.includes('sınıf genişliği 2 cm') && txt.includes('son sınıf yalnızca amaç fonksiyonundan çıkarıldı'), 'modified CDFR in the worker: objective = engine, class width and last-class rule stated: ' + txt); }
  await q.check('input[name="st-fit"][value="sur"]'); await q.click('#st-train-btn'); await q.waitForSelector('table.sttab', { timeout: 120000 });
  const [dm] = await Promise.all([q.waitForEvent('download'), q.click('#st-json')]), file = await dm.path(), mj = JSON.parse(await readFile(file, 'utf8'));
  ok(mj.schema === 'dist-stand-model/1' && mj.fit === 'sur' && mj.validation.K === 5 && mj.scope.plots === 36 && mj.hColumn === 'H_m', 'model file: schema, method, validation, scope, H column');
  await q.click('#stt-predict'); await q.check('input[name="st-src"][value="imported"]'); await q.setInputFiles('#st-file', file); await q.waitForSelector('#st-msum');
  for (const [k, v] of [['N', '800'], ['H', '20'], ['A', '40']]) { await q.fill('#st-x-' + k, v); await q.locator('#st-x-' + k).dispatchEvent('change'); }
  await q.click('#st-pred'); await q.waitForSelector('#st-params');
  const pe = E.stand.predict(E.stand.importModel(mj).model, { N: 800, H: 20, A: 40 }), shown = await q.locator('#st-params').textContent();
  ok(shown.includes(fmt4(pe.params.b)) && shown.includes(fmt4(pe.params.c)) && (await q.locator('#ch-st svg path').count()) >= 1 && (await q.locator('#st-outside').count()) === 0, 'imported model: prediction = engine, density drawn: ' + shown);
  await q.fill('#st-x-N', '5000'); await q.locator('#st-x-N').dispatchEvent('change'); await q.click('#st-pred'); await q.waitForSelector('#st-pout');
  ok((await q.locator('#st-outside', { hasText: 'aralığı dışında' }).count()) === 1, 'outside the training range: extrapolation stated');
  await q.setViewportSize({ width: 390, height: 844 }); await q.click('#stt-train');
  ok(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'stand model tab: no horizontal scroll on a phone');
  await c6.close(); }

// 2o. P18: L-moments, QME and MGE are optional (unchecked by default); options from the interface; † on the self-criterion
{ const c7 = await browser.newContext({ viewport: { width: 1280, height: 900 } }), q = await c7.newPage(); q.on('pageerror', e => errors.push(e.message));
  const E = await import('../../assets/lab/dist/index.js'), dd = [12.5, 15, 18.2, 22, 25.5, 31, 9.4, 14, 27, 20.1, 16.6, 23.3, 19.9, 21.7, 17.5, 24.8, 13.2, 28.6, 11.9, 26.4];
  await q.goto(URL + '?lang=tr'); await q.locator('#impbox details summary').click(); await q.fill('#impbox textarea', ['dbh', ...dd].join('\n')); await q.click('#impbox [data-act="paste"]');
  await q.waitForSelector('#impbox .fname'); await q.click('#to2');
  const on = await q.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-m]')].map(x => [x.dataset.m, x.checked])));
  ok(['weibull.lmom', 'gamma.lmom', 'normal.qme', 'normal.mge', 'gamma.qme', 'gamma.mge'].every(id => id in on && on[id] === false) && on['gamma.ml'] === true, 'new methods offered but not selected by default');
  for (const m of Object.keys(on)) if (on[m]) await q.uncheck(`[data-m="${m}"]`);
  for (const m of ['gamma.ml', 'gamma.lmom', 'gamma.qme', 'gamma.mge']) await q.check(`[data-m="${m}"]`);
  await q.fill('#o-gamma-qme-probs', '0.25 0.5 0.75'); await q.locator('#o-gamma-qme-probs').dispatchEvent('change');
  await q.fill('#o-gamma-qme-weights', '1 2 1'); await q.locator('#o-gamma-qme-weights').dispatchEvent('change');
  await q.check('input[name="o-gamma.mge-gof"][value="ks"]');
  await q.click('#calc'); await q.waitForSelector('table.cmptab');
  const rq = E.runMethod('gamma.qme', { d: dd }, { probs: [0.25, 0.5, 0.75], weights: [1, 2, 1] }), rm = E.runMethod('gamma.mge', { d: dd }, { gof: 'ks' }), rl = E.runMethod('gamma.lmom', { d: dd });
  const fam = await q.evaluate(() => [...document.querySelectorAll('table.ptab[data-fam="gamma"] tbody tr')].map(tr => ({ m: tr.dataset.method, c: [...tr.children].map(x => x.textContent.trim()) })));
  const cell = id => fam.find(r => r.m === id);
  ok(Math.abs(parseFloat(cell('gamma.qme').c[2]) - rq.params.k) < 6e-5 * rq.params.k && Math.abs(parseFloat(cell('gamma.mge').c[2]) - rm.params.k) < 6e-5 * rm.params.k && Math.abs(parseFloat(cell('gamma.lmom').c[2]) - rl.params.k) < 6e-5 * rl.params.k, 'QME (probabilities and weights from the interface), MGE (KS) and L-moments = engine');
  ok(cell('gamma.qme').c[0].includes('olasılıklar 0.25, 0.5, 0.75') && cell('gamma.qme').c[0].includes('ağırlıklar 1, 2, 1') && cell('gamma.mge').c[0].includes('KS ile'), 'probabilities, weights and the minimised criterion shown with the method');
  await q.selectOption('#cmp-sort', 'ks');
  const desc = await q.evaluate(() => [...document.querySelectorAll('table[data-kind="desc"] tbody tr')].map(tr => [tr.dataset.method, tr.querySelector('.selfcrit') != null]));
  ok(desc.length === 3 && desc.find(r => r[0] === 'gamma.mge')[1] && desc.filter(r => r[1]).length === 1 && (await q.locator('table[data-kind="ml"] tbody tr').count()) === 1, 'MGE among the descriptive fits, not in the AIC table; † on the criterion it minimised: ' + JSON.stringify(desc));
  await c7.close(); }

// 2p. P19: Johnson SB all-parameter recovery (Fonseca et al. 2009) on its own tab; symmetric input refused
{ const c8 = await browser.newContext({ viewport: { width: 1280, height: 900 } }), q = await c8.newPage(); q.on('pageerror', e => errors.push(e.message));
  const E = await import('../../assets/lab/dist/index.js'), { sbMomentsY } = await import('../../assets/lab/dist/families/johnsonsb.js');
  const P = { xi: 4, lambda: 40, gamma: 0.8, delta: 1.4 }, u = sbMomentsY(0.8, 1.4), m1 = 4 + 40 * u.m1, m2 = 16 + 320 * u.m1 + 1600 * u.m2, m3 = 64 + 1920 * u.m1 + 19200 * u.m2 + 64000 * u.m3;
  const S0 = { mean: m1, median: 4 + 40 / (1 + Math.exp(0.8 / 1.4)), dq: Math.sqrt(m2), dg: m3 / m2 };
  await q.goto(URL + '?lang=tr'); await q.click('#wf-summary'); await q.click('#rt-fns'); await q.waitForSelector('#fnscard');
  for (const k of ['mean', 'median', 'dq', 'dg']) { await q.fill('#f-' + k, String(S0[k])); await q.locator('#f-' + k).dispatchEvent('change'); }
  await q.click('#f-calc'); await q.waitForSelector('table.fnstab', { timeout: 60000 });
  const row = await q.evaluate(() => { const tr = document.querySelector('table.fnstab tbody tr'); return { s: tr.dataset.status, c: [...tr.children].map(x => x.textContent.trim()) }; });
  ok(row.s === 'ok' && Math.abs(parseFloat(row.c[1]) - 4) < 1e-5 && Math.abs(parseFloat(row.c[2]) - 40) < 1e-5 && Math.abs(parseFloat(row.c[3]) - 0.8) < 1e-5 && Math.abs(parseFloat(row.c[4]) - 1.4) < 1e-5, 'four parameters recovered (ξ = 4, λ = 40, γ = 0.8, δ = 1.4): ' + row.c.slice(1, 5));
  ok((await q.locator('#f-out', { hasText: 'm₃ = d̄_G × Dq²' }).count()) === 1 && (await q.locator('#f-out .srcs li[data-ref="R17"]').count()) === 1 && row.c[7].includes('koşul sayısı'), 'm3 shown, source [R17] listed, condition number reported');
  await q.click('#rt-prs'); ok(await q.inputValue('#p-median') === String(S0.median), 'median shared with the Parresol tab');
  await q.click('#rt-fns'); await q.fill('#f-median', String(S0.mean)); await q.locator('#f-median').dispatchEvent('change'); await q.click('#f-calc'); await q.waitForSelector('table.fnstab');
  ok((await q.locator('table.fnstab tr[data-status="invalid"]').count()) === 1 && (await q.locator('table.fnstab', { hasText: 'simetrik' }).count()) === 1, 'median = mean: refused as symmetric, no parameters');
  await c8.close(); }

// 3. sample data, phone + dark
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
phone.on('pageerror', e => errors.push(e.message));
await phone.goto(URL + '?lang=tr'); await phone.click('#sample'); await phone.waitForSelector('#impbox .fname'); await phone.click('#to2');
ok(await phone.isChecked('input[name="dec"][value=","]'), 'sample with decimal commas: comma proposed');
await phone.click('#calc'); await phone.waitForSelector('table.ptab', { state: 'attached' });
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
ok((await phone.locator('#ulist .uitem').count()) > 1, 'sample: plot list');
await shot('dist-3-telefon', phone);

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`dist e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
