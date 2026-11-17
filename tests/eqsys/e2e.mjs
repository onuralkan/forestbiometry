// Browser test for Systems of Equations (SM-04): the simulated sample with the compatible height–volume system, fitted by
// SUR on the page and compared with eqsys/calc.js in Node and with the Python reference; a linear system compared with
// systemfit; sets saved and shown in the coefficient library; English.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/eqsys/e2e.mjs http://127.0.0.1:8092 [shots-dir]
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const NL = JSON.parse(await readFile(path.join(ROOT, 'tests/ref/eqsys_sm04_nl.json'), 'utf8')), REF = JSON.parse(await readFile(path.join(ROOT, 'tests/ref/eqsys_sm04.json'), 'utf8'));
const nums = async sel => (await page.locator(sel).allTextContents()).map(s => +s.replace(/\s/g, '').replace('−', '-'));

await page.goto(BASE + '/denklem-sistemleri.php?lang=tr'); await page.waitForSelector('#sample');
await page.click('#sample'); await page.waitForSelector('#dsinfo');
ok((await page.textContent('#dsinfo')).includes('80 satır'), 'sample read: 80 rows');
await page.click('#to2'); await page.waitForSelector('#ntab');
ok((await page.textContent('#ntab')).includes('ortak') && await page.inputValue('[data-map="D_cm"]') === '1', 'compatible system: a, b, c marked shared; D_cm mapped to its column');
await page.click('#calc'); await page.waitForSelector('#coeftab');
const b = await nums('#coeftab [data-k^="b"]'), R = NL.compatible_SUR;
ok(b.length === 6 && b.every((v, j) => Math.abs(v - R.coef[j]) <= 1e-3 * R.se[j] + 1e-9 * Math.abs(R.coef[j])), 'compatible system by SUR on the page = Python reference: ' + b.join(' '));
ok((await page.textContent('#r-sum')).includes('80 gözlem, 2 denklem, 6 katsayı'), 'summary: 80 observations, 2 equations, 6 coefficients');
ok((await page.locator('#cmptab tbody tr').count()) === 7, 'method comparison: six coefficients and log L');
await shot('sq-1');
// a linear system: ln columns are not in the table, so use the formula with ln()
await page.click('[data-go="2"]'); await page.waitForSelector('#ntab');
const setExpr = async (i, v) => { await page.fill(`fieldset[data-e="${i}"] [data-k="expr"]`, v); await page.locator(`fieldset[data-e="${i}"] [data-k="expr"]`).dispatchEvent('change'); await page.waitForSelector('#ntab'); };
await setExpr(0, 'exp(h0)*D_cm^h1'); await setExpr(1, 'exp(v0)*D_cm^v1*exp(v2*ln(D_cm)^2)');
for (const n of ['h0', 'h1', 'v0', 'v1', 'v2']) { await page.fill(`[data-start="${n}"]`, n === 'h0' ? '1' : n === 'v0' ? '-9' : n === 'h1' ? '0.6' : n === 'v1' ? '3' : '0'); await page.locator(`[data-start="${n}"]`).dispatchEvent('change'); await page.waitForSelector('#ntab'); }
await page.click('#calc'); await page.waitForSelector('#coeftab');
ok(await page.locator('#coeftab tbody tr').count() === 5, 'a five-coefficient nonlinear system on the original scale also fits');
// save the sets
await page.fill('#sv-cit', 'e2e benzetim'); await page.locator('#sv-cit').dispatchEvent('change');
await page.click('#sv-save'); await page.waitForSelector('#sv-msg .err');
for (const [k, v] of [['c1', 'cm'], ['c2', 'm'], ['c3', 'm3']]) await page.fill(`[data-unit="${k}"]`, v);
await page.click('#sv-save'); await page.waitForSelector('#sv-ok');
const stored = await page.evaluate(async () => { const C = await import('/assets/lab/core/coef.js'); return (await C.listCoefs('eqsys')).map(s => ({ form: s.form, expr: s.fit.expr, system: s.fit.system, out: s.output })); });
ok(stored.length === 2 && stored.every(s => /^eqsys\./.test(s.form)) && stored[0].system === stored[1].system && stored.some(s => s.out.name === 'V_m3' && s.out.unit === 'm3'), 'two sets saved with the same system id and units');
await page.goto(BASE + '/katsayi-kutuphanesi.php?lang=tr'); await page.waitForFunction(() => document.body.textContent.includes('exp(h0)*D_cm^h1'));
ok((await page.textContent('main')).includes('Denklem Sistemleri') && !/form\.unknown/.test(await page.textContent('main')), 'the coefficient library shows the sets, no unknown-form problem');
await page.goto(BASE + '/denklem-sistemleri.php?lang=en'); await page.waitForSelector('#coeftab');
ok((await page.textContent('main')).includes('Method comparison'), 'English, results restored');
ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`SM-04 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
