// Browser test for Height–Diameter Modelling (Playwright, Chromium).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/hd/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const XLSX = require(path.join(root, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const REF = JSON.parse(await readFile(path.join(root, 'tests/ref/hd.json'), 'utf8'));
const FIX = (await readFile(path.join(root, 'tests/hd/fixture.csv'), 'utf8')).trim().split(/\r?\n/).slice(1).map(l => l.split(','));
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
const URL = BASE + '/boy-cap.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const dl = async btn => { const [d] = await Promise.all([page.waitForEvent('download'), page.click(btn)]); return d; };
const csvOf = async btn => (await readFile(await (await dl(btn)).path(), 'utf8')).replace(/^﻿/, '').split('\r\n');
const trNum = s => parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
const cellsOf = async (sel) => page.evaluate(s => [...document.querySelectorAll(s)].map(tr => [...tr.children].map(td => td.textContent.trim())), sel);
const tab = async t => { await page.click('#tab-' + t); await page.waitForSelector(`#panel[aria-labelledby="tab-${t}"]`); };

// 1. sample (8 plots), TR: plot-based CV by default; no standard errors, intervals or AIC
await page.goto(URL + '?lang=tr');
await page.click('#sample'); await page.waitForSelector('#impbox .fname');
await page.click('#to2');
ok(await page.inputValue('#dcol') === '3' && await page.inputValue('#hcol') === '4' && await page.inputValue('#pcol') === '0' && await page.inputValue('#scol') === '2', 'columns recognised');
ok(await page.isChecked('input[name="dec"][value="."]'), 'decimal point recognised');
ok(await page.isChecked('input[name="cv"][value="plot"]'), 'plot-based CV chosen by default with 8 plots');
ok(await page.inputValue('#bh') === '1.3', 'breast height 1.3 m by default');
await shot('hd-2-ayarlar');
await page.click('#calc'); await page.waitForSelector('#ptab', { timeout: 60000 });
ok((await page.locator('#ptab tbody tr').count()) === 6 && (await page.locator('#ptab td', { hasText: 'yakınsadı' }).count()) === 6, 'six models converged');
ok((await page.locator('.statement', { hasText: '8 örnek alan' }).count()) === 1, 'multi-plot statement shown');
ok((await page.locator('#ptab', { hasText: 'Std. hata' }).count()) === 0, 'no standard errors with 8 plots');
const wRow = (await cellsOf('#ptab tr[data-model="weibull"]'))[0];
ok(Math.abs(trNum(wRow[3].split('Std')[0]) - REF.all.fits.weibull.theta[0]) < 1e-5, 'Weibull a matches SciPy: ' + wRow[3]);
ok((await page.locator('.small', { hasText: 'Boyu eksik (tahmin edilecek) ağaç' }).count()) === 1 && (await page.locator('.small.muted', { hasText: '1 okunamayan boy, 1 boyu bh' }).count()) === 1, 'exclusions reported');
await shot('hd-3-modeller');
await tab('compare');
ok((await page.locator('#ctab th', { hasText: 'AIC' }).count()) === 0 && (await page.locator('#panel', { hasText: 'AIC/BIC verilmez' }).count()) === 1, 'AIC withheld for multi-plot data, reason given');
ok((await page.locator('#panel .note', { hasText: 'Örnek alan bazında; 8 kat' }).count()) === 1, 'CV labelled as plot-based');
const cvRowsTR = await cellsOf('#cvtab tbody tr[data-model]');
REF.all.cv_plot.models.forEach((m, k) => ok(Math.abs(trNum(cvRowsTR[k][1]) - m.rmse) < 6e-5, `CV RMSE ${cvRowsTR[k][0]} ${cvRowsTR[k][1]} vs ${m.rmse}`));
ok(Math.abs(trNum((await cellsOf('#cvsel'))[0][1]) - REF.all.cv_plot.selection.rmse) < 6e-5, 'selection-procedure RMSE');
await shot('hd-4-karsilastirma');
await tab('charts');
ok((await page.locator('#panel .note', { hasText: 'bir model seçin' }).count()) === 1, 'charts ask for a model before residual plots');
await page.selectOption('#msel', 'weibull');
ok((await page.locator('#ch-data circle').count()) === REF.all.n && (await page.locator('#ch-data path.ch-line').count()) === 6, 'data points and six curves');
ok((await page.locator('#ch-data path.ch-dash, #ch-data path.ch-dot').count()) === 0, 'no interval bands with 8 plots');
ok((await page.locator('#ch-rf circle').count()) === REF.all.n && (await page.locator('#ch-rd circle').count()) === REF.all.n, 'residual charts');
ok((await page.locator('#bytab tbody tr').count()) === 8, 'mean error by plot (8 plots)');
await shot('hd-5-grafikler');
await tab('predict');
const nMiss = FIX.filter(r => r[3] !== '' && r[4] === '' && r[2] !== undefined).length;
ok((await page.locator('#mtab tbody tr').count()) === nMiss, `missing heights listed: ${nMiss}`);
ok((await page.locator('#mtab tr.tail').count()) === 2 && (await page.locator('#mtab tr.tail', { hasText: '95' }).count()) === 1, 'two predictions outside the diameter range flagged');
await page.fill('#nd', '10; 30\n120');
ok((await page.locator('#ndtab tbody tr').count()) === 3 && (await page.locator('#ndtab tr.tail').count()) === 1, 'new diameters: 120 cm flagged outside');
ok((await page.locator('#ndtab th', { hasText: 'tahmin aralığı' }).count()) === 0 && (await page.locator('#ndout', { hasText: 'Aralık verilmez' }).count()) === 1, 'no intervals for multi-plot data, reason given');
await shot('hd-6-tahmin');
// export: measured and predicted heights kept apart
await tab('export');
const t = await csvOf('#x-t'), head = t[0].split(';'), rows = t.slice(1).map(l => l.split(';'));
ok(head.join() === 'satir,ornek_alan,tur,cap_kaynak,cap_cm,boy_kaynak,boy_olculen_m,durum,boy_tahmin_m,tahmin_modeli,cap_araligi_disinda,model_degeri_m,artik_tahmin_eksi_olculen_m', 'TR tree table headers');
const iH = head.indexOf('boy_olculen_m'), iP = head.indexOf('boy_tahmin_m'), iS = head.indexOf('boy_kaynak'), iSt = head.indexOf('durum'), iO = head.indexOf('cap_araligi_disinda');
ok(rows.length === FIX.length, 'every source row exported');
ok(rows.every((r, k) => r[iS] === FIX[k][4]), 'source height text exported unchanged');
ok(rows.filter(r => r[iSt] === 'ölçülen, uydurmada').every(r => r[iP] === '' && r[iH] !== ''), 'measured rows: predicted column empty');
ok(rows.filter(r => r[iSt] === 'boy eksik, tahmin').every(r => r[iH] === '' && r[iP] !== ''), 'missing rows: measured column empty, prediction filled');
ok(rows.filter(r => r[iP] !== '').length === nMiss, 'predictions only for missing heights');
ok(rows.find(r => r[4] === '95').at(iO) === 'evet' && rows.filter(r => r[iO] === 'evet').length === 2, 'out-of-range flag in export');
ok(rows.find(r => r[1] === 'P1' && r[iS] === '1.2')[iSt].includes('≤ bh'), 'h ≤ bh row reported, not fitted');

// 2. one plot (filter ornek_alan = P1): SE, intervals, AIC; plot-based CV refused
await page.click('#steps [data-go="2"]');
await page.selectOption('#fcol', '0'); await page.selectOption('#fval', 'P1');
ok(await page.isDisabled('input[name="cv"][value="plot"]') && await page.isChecked('input[name="cv"][value="tree"]') && (await page.locator('.note', { hasText: 'en az 2 örnek alan' }).count()) === 1, 'one plot: plot-based CV not offered, tree-level chosen');
await page.click('#calc'); await page.waitForSelector('#ptab');
ok((await page.locator('.statement', { hasText: 'Tek örnek alan' }).count()) === 1, 'single-plot statement');
const w1 = (await cellsOf('#ptab tr[data-model="weibull"]'))[0][3];
ok(Math.abs(trNum(w1.split('Std. hata')[1]) - REF.P1.fits.weibull.se[0]) < 1e-5, 'P1 Weibull SE(a) matches SciPy: ' + w1);
await tab('compare');
ok((await page.locator('#ctab th', { hasText: 'ΔAIC' }).count()) === 1, 'AIC shown for one plot');
const aicW = (await cellsOf('#ctab tr[data-model="weibull"]'))[0][8];
ok(Math.abs(trNum(aicW) - REF.P1.fits.weibull.aic) < 2e-3, 'AIC matches SciPy: ' + aicW);
ok((await page.locator('#panel .note', { hasText: 'Ağaç bazında rastgele' }).count()) === 1, 'CV labelled tree-level, not plot-level');
await tab('predict');
await page.selectOption('#msel', 'weibull');
await page.fill('#nd', '20');
const nd1 = (await cellsOf('#ndtab tbody tr'))[0], ci = nd1[2].split('–').map(trNum), pi = nd1[3].split('–').map(trNum), ref20 = REF.P1.fits.weibull.at['20.0'];
ok(Math.abs(ci[0] - ref20.ci[0]) < 2e-3 && Math.abs(ci[1] - ref20.ci[1]) < 2e-3 && Math.abs(pi[0] - ref20.pi[0]) < 2e-3 && Math.abs(pi[1] - ref20.pi[1]) < 2e-3, `CI ${nd1[2]} and PI ${nd1[3]} match SciPy`);
ok(pi[0] < ci[0] && pi[1] > ci[1], 'prediction interval wider than the confidence interval');
await shot('hd-7-tek-alan-tahmin');
await tab('charts');
ok((await page.locator('#ch-data path.ch-dash').count()) === 2 && (await page.locator('#ch-data path.ch-dot').count()) === 2, 'confidence and prediction bands drawn for one plot');

// 3. language switch keeps the session; EN export headers
await page.click('#langlink'); await page.waitForURL(/lang=en/); await page.waitForSelector('#tab-export');
await tab('export');
const te = await csvOf('#x-t');
ok(te[0] === 'row,plot,species,dbh_source,dbh_cm,height_source,height_measured_m,state,height_predicted_m,prediction_model,outside_dbh_range,model_value_m,residual_pred_minus_meas_m', 'EN tree table headers');
const xd = await dl('#x-xlsx'), wb = XLSX.read(await readFile(await xd.path()));
ok(wb.SheetNames.join(',') === 'Info,Parameters,Cross-validation,Trees,New diameters', 'XLSX sheets: ' + wb.SheetNames.join(','));

// 4. data where the asymptote is not identified: reported as diverged, never as a fit
await page.click('#steps [data-go="1"]');
const lin = ['d;h', ...Array.from({ length: 40 }, (_, i) => { const d = 10 + i * 1.25; return `${d};${(1.3 + 0.45 * d + 0.3 * Math.sin(i * 1.7)).toFixed(3)}`; })].join('\n');
await page.locator('#impbox details summary').click(); await page.fill('#impbox textarea', lin); await page.click('#impbox [data-act="paste"]');
await page.waitForSelector('#impbox .fname'); await page.click('#to2');
await page.selectOption('#dcol', '0'); await page.selectOption('#hcol', '1');
await page.check('input[name="dec"][value="."]');
await page.click('#calc'); await page.waitForSelector('#ptab');
ok((await page.locator('#ptab tr[data-model="richards"] td', { hasText: 'diverged' }).count()) === 1 && (await page.locator('#ptab tr[data-model="weibull"] td', { hasText: 'diverged' }).count()) === 1, 'linear data: Chapman–Richards and Weibull reported as diverged');
ok((await page.locator('#ptab tr[data-model="power"] td', { hasText: 'converged' }).count()) === 1, 'linear data: power converged');
ok((await page.locator('.statement', { hasText: 'No plot column' }).count()) === 1, 'no plot column: independence stated');
await tab('compare');
ok((await page.locator('#cvtab').count()) === 1, 'CV still runs; failed folds handled');
await shot('hd-8-iraksama');

// 5. phone + dark
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
phone.on('pageerror', e => errors.push(e.message));
await phone.goto(URL + '?lang=tr');
await phone.click('#sample'); await phone.waitForSelector('#impbox .fname');
await phone.click('#to2'); await phone.click('#calc'); await phone.waitForSelector('#ptab', { timeout: 60000 });
await phone.click('#tab-charts'); await phone.selectOption('#msel', 'naslund');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
await shot('hd-9-telefon-koyu', phone);

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`hd e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
