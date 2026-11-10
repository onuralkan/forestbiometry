// Browser test for the Forest Data Checker (Playwright, Chromium).
// Usage: php -S 127.0.0.1:8092 (in the site folder), then
//        node tests/checker/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const XLSX = require(path.join(root, 'assets/vendor/sheetjs/xlsx.mini.min.js'));

const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
const URL = BASE + '/veri-denetcisi.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const tileVal = async label => page.evaluate(l => { const t = [...document.querySelectorAll('.tile')].find(x => x.querySelector('span').textContent === l); return t ? t.querySelector('b').textContent : null; }, label);
async function act(rowText, btnText, reason, before) {
  const tr = page.locator('table.issues tbody tr', { hasText: rowText }).first();
  await tr.getByRole('button', { name: btnText }).first().click();
  if (before) await before();
  if (reason != null) await page.fill('#dreason', reason);
  await page.click('#dok');
  await page.waitForSelector('#dlg', { state: 'hidden' });
}

// 1. sample data, TR
await page.goto(URL + '?lang=tr');
await page.click('#sample');
await page.waitForSelector('.imp table.grid');
ok((await page.locator('.imp[data-table="trees"] td').filter({ hasText: /^001$/ }).count()) > 0, 'preview keeps "001"');
await shot('1-veri');
await page.click('#to2');
ok(await page.isChecked('input[name="dec"][value=","]'), 'comma pre-selected from unambiguous evidence');
ok((await page.locator('.note', { hasText: 'ondalık virgül' }).count()) === 1, 'decimal evidence shown');
await shot('2-sutunlar');
await page.click('#to3');
await page.click('#run');
await page.waitForSelector('.tiles');
ok(await tileVal('Hata') === '4', 'summary: 4 errors');
ok(await tileVal('Örnek alan') === '5', 'summary: 5 plots (001 and 1 distinct)');
await shot('3-ozet');

// issues tab: fix, exclude, choose, suggestion, accept
await page.click('#tab-issues');
ok((await page.locator('table.issues tbody tr').count()) >= 8, 'issue list rendered');
await shot('4-sorunlar');
await act('27,x', 'Düzelt', 'Saha föyü kontrol edildi', () => page.fill('#dnew', '27,4'));
await act('Mükerrer ölçüm anahtarı', 'Kaydı dışla', 'Boy 2,1 yazım hatası; diğer satır doğru');
await act('farklı büyüklükler', 'Değer seç', 'Alan tablosuyla uyumlu');
await act('farklı yazılmış', 'Öneriyi uygula', null);
await page.click('#tab-summary');
ok(await tileVal('Hata') === '0', 'no errors after four logged actions');
await page.click('#tab-issues');
await act('kontrol aralığının (1–200 cm)', 'Kabul et', 'Anıt ağaç, ölçüm doğrulandı');
await page.click('#tab-log');
ok((await page.locator('#panel tbody tr').count()) === 5, 'change log has 5 entries (edit, exclude, choice → row 16, suggestion, accept)');
ok((await page.locator('#panel tbody tr', { hasText: '27,x' }).count()) === 1, 'old value kept in log');
await shot('5-gunluk');
await page.click('#tab-data');
ok((await page.locator('tr.ex').count()) === 1, 'excluded record still visible, struck through');
await shot('6-veri');

// approve and export
await page.click('#tab-approve');
await page.click('#approve');
await page.waitForSelector('.note.ok');
const ds = await page.evaluate(() => new Promise(res => { const r = indexedDB.open('forestbiometry'); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get('dataset:approved'); q.onsuccess = () => res(q.result); }; }));
ok(ds && ds.schema === 'forest-dataset/1' && ds.trees.length === 17, 'approved dataset stored for other tools');
ok(ds.trees.find(t => t.row === 2).plot_id === '001' && ds.trees.find(t => t.row === 13).dbh === 27.4, 'approved values');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]);
const wb = XLSX.read(await (await import('node:fs/promises')).readFile(await dl.path()));
ok(wb.SheetNames.length === 6, 'XLSX report with 6 sheets: ' + wb.SheetNames.join(','));
const dataSheet = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[2]], { header: 1 });
ok(dataSheet[1][1] === '001' && typeof dataSheet[1][6] === 'number', 'XLSX: ID stays text "001", dbh numeric');
const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#x-data')]);
const csvTr = (await (await import('node:fs/promises')).readFile(await dl2.path(), 'utf8')).replace(/^﻿/, '');
ok(csvTr.split('\r\n')[1].startsWith('2,001,1,,2019,Pb,24.5,17.2'), 'TR CSV: "," and decimal point (language-independent)');
await shot('7-onay');

// 2. language switch keeps state and numbers
await page.click('#tab-summary');
const valsTr = await page.evaluate(() => [...document.querySelectorAll('.tile b')].map(b => b.textContent));
await page.click('#langlink');
await page.waitForURL(/lang=en/);
await page.waitForSelector('.tabs');
await page.click('#tab-summary');
const valsEn = await page.evaluate(() => [...document.querySelectorAll('.tile b')].map(b => b.textContent));
ok(valsTr.length === 7 && JSON.stringify(valsTr) === JSON.stringify(valsEn), 'summary numbers identical in TR and EN: ' + valsEn.join(','));
await page.click('#tab-approve');
ok((await page.locator('.note.ok', { hasText: 'Approved: 17 records' }).count()) === 1, 'EN: approval still current after language switch');
const [dl3] = await Promise.all([page.waitForEvent('download'), page.click('#x-data')]);
const csvEn = (await (await import('node:fs/promises')).readFile(await dl3.path(), 'utf8')).replace(/^﻿/, '');
ok(csvEn.split('\r\n')[1].startsWith('2,001,1,,2019,Pb,24.5,17.2'), 'EN CSV: "," and decimal point, same values');
await page.click('#tab-data');
ok((await page.locator('.cellbtn', { hasText: '27,4' }).count()) === 1, 'EN view shows the source text unchanged (27,4)');
await shot('8-en-veri');

// 3. ambiguous decimals via paste: reported, the default point is pre-selected and can be changed
await page.goto(URL + '?lang=tr');
await page.click('#steps [data-go="1"]');
page.once('dialog', d => d.accept());
await page.click('#reset');
await page.locator('.imp[data-table="trees"] details summary').click();
await page.fill('.imp[data-table="trees"] textarea', 'plot\ttree\tspecies\tdbh\tarea\nA\t1\tPb\t1,250\t400\nA\t2\tPb\t2,500\t400\n');
await page.click('.imp[data-table="trees"] [data-act="paste"]');
await page.click('#to2');
ok((await page.locator('.note.warn', { hasText: 'Belirsiz' }).count()) === 1, 'ambiguous decimals reported');
ok(!(await page.isDisabled('#to3')), 'can continue with the default');
ok(await page.isChecked('input[name="dec"][value="."]') && !(await page.isChecked('input[name="dec"][value=","]')), 'point pre-selected by default');
await page.check('input[name="dec"][value="."]');
await page.click('#to3'); await page.click('#run');
ok(await tileVal('Hata') === '2', 'dot chosen → "1,250" reported, not read as 1250');
await shot('9-belirsiz');

// 4a. XLSX upload: lazy-loaded reader, text IDs, dates, formula cached values only
{
  const ws = XLSX.utils.aoa_to_sheet([['plot', 'tree', 'species', 'dbh', 'date', 'area'], ['001', 1, 'Pb', 24.5, null, 400], ['1', 2, 'Pb', 30, null, 400]]);
  ws.E2 = { t: 'n', v: 45474, z: 'dd.mm.yyyy' }; ws.E3 = { t: 'n', v: 46204, z: 'dd.mm.yyyy' }; ws.F3 = { t: 'n', v: 400, f: 'F2*1' };
  const wbx = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wbx, ws, 'Agaclar');
  const buf = Buffer.from(XLSX.write(wbx, { type: 'array', bookType: 'xlsx' }));
  await page.click('#steps [data-go="1"]'); page.once('dialog', d => d.accept()); await page.click('#reset');
  await page.setInputFiles('.imp[data-table="trees"] input[type=file]', { name: 'test.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: buf });
  await page.waitForSelector('.imp[data-table="trees"] .fname');
  ok((await page.locator('.note', { hasText: 'formüller ve makrolar çalıştırılmaz' }).count()) === 1, 'XLSX: formula/macro note shown');
  ok((await page.locator('.imp[data-table="trees"] td', { hasText: /^001$/ }).count()) === 1, 'XLSX: "001" kept in preview');
  ok((await page.locator('.imp[data-table="trees"] td', { hasText: '2024-07-01' }).count()) === 1, 'XLSX: date shown as ISO');
  await page.click('#to2');
  await page.check('input[name="dec"][value=","]');
  await page.click('#to3'); await page.click('#run');
  ok(await tileVal('Hata') === '0' && await tileVal('Dönem') === '2', 'XLSX checked: no errors, two periods');
}

// 4. large table (10 000 rows)
const big = ['plot;tree;species;dbh;height;year;area'];
for (let i = 0; i < 10000; i++) big.push(`${String(1 + (i % 100)).padStart(3, '0')};${i};Pb;${(10 + (i % 50)).toString()},${i % 10};${(8 + (i % 20))},5;${2019 + (i % 2) * 5};400`);
page.once('dialog', d => d.accept());
await page.click('#steps [data-go="1"]'); await page.click('#reset');
await page.setInputFiles('.imp[data-table="trees"] input[type=file]', { name: 'big.csv', mimeType: 'text/csv', buffer: Buffer.from(big.join('\n')) });
await page.waitForSelector('.imp table.grid');
const t0 = Date.now();
await page.click('#to2'); await page.click('#to3'); await page.click('#run');
await page.waitForSelector('.tiles');
const dt = Date.now() - t0;
ok(await tileVal('Ağaç kaydı') === '10000', '10 000 records loaded (no grouping)');
ok(dt < 5000, `10 000 rows checked in ${dt} ms`);
await page.click('#tab-data');
ok((await page.locator('table.data tbody tr').count()) === 200, 'data view paged (200)');

// 5. tools index shows the handoff; phone and dark screenshots
await page.goto(BASE + '/?lang=tr');
ok(await page.waitForSelector('#handoff:not([hidden])', { timeout: 5000 }).then(() => true, () => false), 'tools index shows the approved dataset');
await shot('10-dizin');
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
phone.on('pageerror', e => errors.push(e.message));
await phone.goto(URL + '?lang=tr');
await phone.waitForSelector('.tabs, .imp');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
await shot('11-telefon-koyu', phone);

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
