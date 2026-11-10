// Browser test for the diameter distribution tool, engine version (development page). Playwright, Chromium.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/dist/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const W = await import('../../assets/lab/weibull/calc.js');
const F = await import('../../assets/lab/dist/fit/weibull.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/cap-dagilimi-2.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const rowsOf = () => page.evaluate(() => [...document.querySelectorAll('table.ptab tbody tr')].map(tr => ({ m: tr.dataset.method, s: tr.dataset.status, c: [...tr.children].map(x => x.textContent.trim()) })));
const navState = () => page.evaluate(() => ({ bar: document.querySelector('.navlab b')?.textContent, per: document.querySelector('[data-per][aria-pressed="true"]')?.textContent.trim(), pers: document.querySelectorAll('[data-per]').length,
  on: document.querySelector('#ulist .uitem.on .uid')?.textContent, list: [...document.querySelectorAll('#ulist .uid')].map(x => x.textContent) }));

// 0. the page is not listed and not indexed; the published tool is still there
await page.goto(BASE + '/?lang=tr');
ok((await page.locator('a[href*="cap-dagilimi-2"]').count()) === 0 && (await page.locator('a[href*="cap-dagilimi.php"]').count()) > 0, 'development page not linked; published tool listed');
await page.goto(URL + '?lang=tr');
ok((await page.locator('meta[name="robots"]').getAttribute('content')) === 'noindex, nofollow', 'noindex');
ok((await page.locator('#devnote').count()) === 1, 'development notice shown');

// 1. two plots × two periods; one unreadable and one negative value; comma data read only with the comma setting
const d1 = [12.5, 15, 18.2, 22, 25.5, 31, 9.4, 14, 27, 20.1, 16.6, 23.3], d2 = [30, 34.5, 28, 41, 37.2, 33, 29.5, 45, 38, 36], d3 = [14, 16.5, 19, 24, 27.5, 33, 11, 15.5, 29, 22, 18, 25];
const lines = ['plot\tyear\tdbh', ...d1.map(v => `A\t2019\t${v}`), ...d3.map(v => `A\t2024\t${v}`), ...d2.map(v => `B\t2019\t${v}`), 'B\t2019\tx', 'B\t2019\t-4', 'C\t2019\t20', 'C\t2019\t20', 'C\t2019\t20'];
await page.locator('#impbox details summary').click(); await page.fill('#impbox textarea', lines.join('\n')); await page.click('#impbox [data-act="paste"]');
await page.waitForSelector('#impbox .fname'); await page.click('#to2');
ok(await page.inputValue('#dcol') === '2' && await page.inputValue('#pcol') === '0' && await page.inputValue('#percol') === '1', 'diameter, plot and period columns recognised');
ok(await page.isChecked('input[name="dec"][value="."]'), 'decimal point by default (Turkish interface)');
const offered = await page.evaluate(() => ({ fams: [...document.querySelectorAll('fieldset.fam')].map(x => x.dataset.fam), ms: [...document.querySelectorAll('[data-m]')].map(x => x.dataset.m) }));
ok(offered.fams.join() === 'weibull' && offered.ms.join() === 'weibull.ml,weibull.mom,weibull.pct', 'selector shows only registered families and methods: ' + JSON.stringify(offered));
await page.uncheck('[data-m="weibull.ml"]'); await page.uncheck('[data-m="weibull.mom"]'); await page.uncheck('[data-m="weibull.pct"]');
ok(await page.isDisabled('#calc') && (await page.locator('#atext').count()) === 0, 'no method chosen: cannot calculate, no location card');
await page.check('[data-m="weibull.ml"]'); await page.check('[data-m="weibull.mom"]'); await page.check('[data-m="weibull.pct"]');
ok(await page.isChecked('input[name="o-weibull.mom-varDivisor"][value="n"]') && await page.inputValue('#o-weibull-pct-p') === '0.24' && await page.inputValue('#o-weibull-pct-r') === '0.93', 'defaults: divisor n, percentiles 0.24 and 0.93 (Dubey)');
await page.fill('#o-weibull-pct-p', '0.95'); await page.locator('#o-weibull-pct-p').dispatchEvent('change');
ok(await page.isDisabled('#calc') && (await page.locator('[data-mopts="weibull.pct"] .note.err').textContent()).includes("r'den küçük"), 'p ≥ r: cannot calculate, reason shown');
await page.fill('#o-weibull-pct-p', '1,5'); await page.locator('#o-weibull-pct-p').dispatchEvent('change');
ok(await page.isDisabled('#calc'), 'p outside (0, 1): cannot calculate');
await page.fill('#o-weibull-pct-p', '0.24'); await page.locator('#o-weibull-pct-p').dispatchEvent('change');
await page.fill('#atext', '5'); await page.locator('#atext').dispatchEvent('change');
await page.click('#calc'); await page.waitForSelector('table.ptab');
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
// divisor n − 1 reproduces the published tool; then back to n
await page.click('#steps [data-go="2"]'); await page.check('input[name="o-weibull.mom-varDivisor"][value="n-1"]'); await page.click('#calc'); await page.waitForSelector('table.ptab');
rows = await rowsOf();
ok(Math.abs(cell(2, 4) - W.fitMoments(d1, 0).c) < 6e-5 && Math.abs(cell(3, 3) - W.fitMoments(d1, 5, 'fixed').b) < 6e-5 && rows[2].c[0].includes('n − 1') && (await page.locator('ul.notes li', { hasText: 'n − 1' }).count()) === 2, 'divisor n − 1: published moment results, divisor stated');
await page.click('#steps [data-go="2"]'); await page.check('input[name="o-weibull.mom-varDivisor"][value="n"]'); await page.click('#calc'); await page.waitForSelector('table.ptab');
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
ok((await page.locator('[data-fit]:checked').count()) === 5, 'a fit can be hidden (six fits: three methods × two locations)');
await page.click('#ulist [data-u="C"]');
ok((await page.locator('#panel .note.warn', { hasText: 'tamamlanmış uydurma yok' }).count()) === 1 && (await page.locator('#ch-h').count()) === 0, 'no chart for a unit without a fit');
await shot('dist-2-grafik');
// result records (contract)
await page.click('#tab-params');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#x-json')]);
const js = JSON.parse(await readFile(await dl.path(), 'utf8'));
const r0 = js.results[0];
ok(js.tool.version === '2.0.0-dev' && js.results.length === 24 && r0.contract === 'dist-result/1' && r0.data.plot === 'A' && r0.data.period === '2019' && r0.data.n === 12 && r0.data.unit === 'cm', 'JSON: 4 units × 6 results with plot, period, n, unit');
ok(r0.params.b === ml0.b && r0.params.c === ml0.c && r0.fixed.a.origin === 'zero' && r0.free.join() === 'b,c' && r0.estimator === 'ml' && r0.convergence.solver === 'bisection' && r0.objective.name === 'logLik' && r0.fit.aic > 0 && js.settings.methods['weibull.mom'].varDivisor === 'n' && js.results[4].settings.p === 0.24 && js.results[4].targets.quantile === 'type7' && js.results[2].targets.varDivisor === 'n', 'JSON: full-precision parameters, fixed/free, estimator, solver, objective');
ok(js.results.filter(r => r.data.plot === 'C').every(r => r.status === 'invalid' && r.params === null && r.problems[0].code === 'constant'), 'JSON: failed fits carry a status and a reason, no parameters');

// 2. English keeps the values; comma setting; pooled mode
await page.click('#ulist [data-u="A"]');
await page.click('#langlink'); await page.waitForURL(/lang=en/); await page.waitForSelector('table.ptab');
rows = await rowsOf();
ok(rows[1].c[1] === 'a = 5 (user)' && Math.abs(cell(0, 3) - ml0.b) < 6e-5 && rows[0].c[12].startsWith('bisection'), 'English: same values, translated labels');
await page.click('#steps [data-go="2"]'); await page.check('input[name="mode"][value="pool"]');
ok((await page.locator('.note.warn', { hasText: 'not a per-hectare weighted' }).count()) === 1, 'pooling warning');
await page.click('#calc'); await page.waitForSelector('table.ptab');
ns = await navState();
ok(ns.list.length === 0 && ns.pers === 2 && (await page.locator('.navbar.single').count()) === 1, 'pooled: one unit per period, no plot list');
rows = await rowsOf();
ok(Math.abs(cell(0, 3) - W.fitML([...d1, ...d2, 20, 20, 20], 0).b) < 6e-5 && rows[0].c[5] === '25', 'pooled 2019 fit over 25 trees');

// 3. sample data, phone + dark
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
phone.on('pageerror', e => errors.push(e.message));
await phone.goto(URL + '?lang=tr'); await phone.click('#sample'); await phone.waitForSelector('#impbox .fname'); await phone.click('#to2');
ok(await phone.isChecked('input[name="dec"][value=","]'), 'sample with decimal commas: comma proposed');
await phone.click('#calc'); await phone.waitForSelector('table.ptab');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
ok((await phone.locator('#ulist .uitem').count()) > 1, 'sample: plot list');
await shot('dist-3-telefon', phone);

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`dist e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
