// Browser test for the shared coefficient-set editor (core/coef-ui.js) on its unpublished test page.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/core/e2e.mjs http://127.0.0.1:8092
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', URL = BASE + '/tests/core/coef-ui.html';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1100, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('dialog', d => d.accept());
await page.goto(URL); await page.waitForSelector('.coefcard');
ok((await page.locator('#cf-none').count()) === 1 && (await page.locator('.coefcard', { hasText: 'hiçbir tür ya da yöre katsayısı içermez' }).count()) === 1, 'empty library, no built-in sets (K1)');
ok((await page.locator('#cf-form option').count()) === 2, 'only the forms of this tool are offered');
// new set, power form: missing source and unreadable number are refused with reasons
await page.selectOption('#cf-form', 'test.pow'); await page.click('#cf-new');
await page.fill('#cf-p-a', '0,12'); await page.fill('#cf-p-b', '2.4'); await page.click('#cf-save');
let m = await page.locator('#cf-msg').textContent();
ok(m.includes('sayı okunamadı ("0,12")'), 'decimal comma in a coefficient refused, not guessed: ' + m);
await page.fill('#cf-p-a', '1.2e-2'); await page.click('#cf-save'); m = await page.locator('#cf-msg').textContent();
ok(m.includes('kaynak künyesi zorunlu'), 'no source: refused: ' + m);
await page.fill('#cf-v-D-0', '60'); await page.fill('#cf-v-D-1', '8'); await page.fill('#cf-cit', 'Test, not a real equation'); await page.click('#cf-save');
ok((await page.locator('#cf-msg').textContent()).includes('geçerlilik aralığı geçersiz'), 'min > max refused');
await page.fill('#cf-v-D-0', '8'); await page.fill('#cf-v-D-1', '60'); await page.fill('#cf-species', 'Test sp.'); await page.click('#cf-save');
await page.waitForSelector('#cf-list');
ok((await page.locator('#cf-msg.ok').count()) === 1 && (await page.locator('#cf-list tbody tr').count()) === 1, 'valid set saved and listed');
let sets = await page.evaluate(() => window.C.listCoefs('test'));
ok(sets.length === 1 && sets[0].params.a === 0.012 && sets[0].params.b === 2.4 && JSON.stringify(sets[0].valid) === '{"D":[8,60]}' && sets[0].species === 'Test sp.' && sets[0].inputs.D.bark === 'ob' && sets[0].origin === 'user-entered', 'stored exactly as typed: ' + JSON.stringify(sets[0]));
// log form: correction choice and SEE
await page.selectOption('#cf-form', 'test.log'); await page.click('#cf-new');
ok((await page.locator('input[name="cf-corr"]').count()) === 4 && (await page.locator('#cf-corrv').count()) === 0, 'log form: correction choices, none by default');
await page.fill('#cf-p-a', '-2.5'); await page.fill('#cf-p-b', '2.45'); await page.fill('#cf-cit', 'Test log');
await page.check('input[name="cf-corr"][value="baskerville"]');
ok((await page.locator('label', { hasText: 'SEE (ln ölçeğinde)' }).count()) === 1 && await page.inputValue('#cf-p-a') === '-2.5' && await page.inputValue('#cf-cit') === 'Test log', 'SEE field appears; typed values kept across the re-render');
await page.click('#cf-save'); ok((await page.locator('#cf-msg').textContent()).includes('pozitif bir değer'), 'Baskerville without SEE refused');
await page.fill('#cf-corrv', '0.2'); await page.click('#cf-save'); await page.waitForSelector('#cf-list tbody tr:nth-child(2)');
sets = await page.evaluate(() => window.C.listCoefs('test'));
const L = sets.find(s => s.form === 'test.log');
ok(L && JSON.stringify(L.transform) === '{"kind":"log","correction":"baskerville","value":0.2}' && await page.evaluate(s => window.C.correctionFactor(s), L) === Math.exp(0.02), 'log set with Baskerville SEE = 0.2 stored');
// edit keeps the id
await page.locator('#cf-list tr', { hasText: 'Test sp.' }).locator('[data-act="edit"]').click();
ok(await page.inputValue('#cf-p-a') === '0.012' && await page.inputValue('#cf-v-D-1') === '60', 'edit: stored values shown at full precision');
await page.fill('#cf-p-b', '2.5'); await page.click('#cf-save'); await page.waitForSelector('#cf-msg.ok');
sets = await page.evaluate(() => window.C.listCoefs('test'));
ok(sets.length === 2 && sets.find(s => s.species === 'Test sp.').params.b === 2.5, 'edited in place, no duplicate');
// export, delete, import
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#cf-exp')]);
const lib = JSON.parse(await readFile(await dl.path(), 'utf8'));
ok(lib.schema === 'model-coef-library/1' && lib.sets.length === 2, 'library exported as JSON');
await page.locator('#cf-list tr', { hasText: 'Test sp.' }).locator('[data-act="del"]').click();
await page.waitForFunction(() => document.querySelectorAll('#cf-list tbody tr').length === 1);
ok((await page.evaluate(() => window.C.listCoefs('test'))).length === 1, 'deleted after confirmation');
lib.sets.push({ ...lib.sets[0], id: 'broken', source: { citation: '' } });
lib.sets.push({ schema: 'model-coef/1', id: 'oth', tool: 'other', form: 'other.lin', params: { a: 1 }, inputs: { x: { unit: 'm' } }, output: { name: 'y', unit: 'm' }, source: { citation: 'T' }, origin: 'user-entered' });
await page.setInputFiles('#cf-imp', { name: 'lib.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(lib)) });
await page.waitForSelector('#cf-msg.warn');
m = await page.locator('#cf-msg').textContent();
ok(m.includes('2 set yüklendi') && m.includes('2 set geçersiz') && m.includes('kaynak künyesi zorunlu') && m.includes('biçim bu araca ait değil'), 'import: valid sets loaded, invalid and foreign ones reported: ' + m);
ok((await page.evaluate(() => window.C.listCoefs('test'))).length === 2 && (await page.evaluate(() => window.C.listCoefs('other'))).length === 0, 'only this tool\'s valid sets stored');
await page.reload(); await page.waitForSelector('#cf-list');
ok((await page.locator('#cf-list tbody tr').count()) === 2, 'library survives a reload (IndexedDB)');
// English and phone width
const en = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
en.on('pageerror', e => errors.push(e.message));
await en.goto(URL + '?lang=en'); await en.waitForSelector('.coefcard');   // separate browser context: empty library
ok((await en.locator('.coefcard', { hasText: 'contains no species or regional coefficients' }).count()) === 1 && (await en.locator('#cf-none', { hasText: 'No set saved yet.' }).count()) === 1, 'English texts');
await en.click('#cf-new'); await en.click('#cf-save');
ok((await en.locator('#cf-msg').textContent()).includes('the citation is required'), 'English problem texts');
ok(await en.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`core e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
