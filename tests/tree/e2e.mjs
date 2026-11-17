// Browser test for the Tree Measurement page (agac-olcumu.php; TM-01 to TM-06).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/tree/e2e.mjs http://127.0.0.1:8092 [shots-dir]
// Values on screen are compared with the engines (assets/lab/tree/*.js) run in Node on the same inputs.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const XLSX = require(path.join(ROOT, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const Ht = await import('../../assets/lab/tree/height.js');
const Dm = await import('../../assets/lab/tree/diameter.js');
const Fm = await import('../../assets/lab/tree/form.js');
const Ag = await import('../../assets/lab/tree/age.js');
const Bk = await import('../../assets/lab/tree/bark.js');
const Cr = await import('../../assets/lab/tree/crown.js');
const { TOOL } = await import('../../assets/lab/tree/calc.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/agac-olcumu.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const num = s => Number(String(s).trim());
const errors = [];
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })).newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const type = async (sel, v) => { await page.fill(sel, v); await page.press(sel, 'Tab'); };

await page.goto(URL + '?lang=tr'); await page.waitForSelector('#htab');
ok((await page.locator('.b-ids').textContent()).trim() === 'TM-01 · TM-02 · TM-03 · TM-04 · TM-05 · TM-06' && (await page.locator('.b-ver').textContent()).includes(TOOL.version), 'tool ids TM-01 to TM-06 and version');

// height: tangent, two readings, one with a decimal comma; percent; ground slope; rangefinder; similar triangles
await type('[data-hrow="0"][data-k="D"]', '25'); await type('[data-hrow="0"][data-k="top"]', '40'); await type('[data-hrow="0"][data-k="base"]', '-5');
await page.click('#h-add'); await type('[data-hrow="1"][data-k="D"]', '25'); await type('[data-hrow="1"][data-k="top"]', '40,5'); await type('[data-hrow="1"][data-k="base"]', '-5');
const h0 = Ht.heightTangent({ D: 25, top: 40, base: -5 }).H, h1 = Ht.heightTangent({ D: 25, top: 40.5, base: -5 }).H;
ok(Math.abs(num(await page.textContent('[data-h="0"]')) - h0) < 0.005 && Math.abs(num(await page.textContent('[data-h="1"]')) - h1) < 0.005, `tangent method: ${h0.toFixed(2)} and ${h1.toFixed(2)} m = engine (decimal comma accepted)`);
ok((await page.textContent('#hsum')).includes(`2 okuma; ortalama boy ${((h0 + h1) / 2).toFixed(2)}`), 'mean of the two readings');
await type('[data-hrow="0"][data-k="top"]', '50'); ok((await page.textContent('#htab tbody tr:first-child')).includes('uzaklık boydan küçük'), 'distance shorter than the height warned');
await type('[data-hrow="0"][data-k="top"]', '-10'); ok((await page.textContent('#htab tbody tr:first-child')).includes('tepe dipten aşağıda'), 'top below base refused with its reason');
await page.click('[data-hdel="0"]'); ok(await page.locator('#htab tbody tr').count() === 1, 'row deleted');
await page.check('input[name="h-unit"][value="pct"]'); await page.check('#h-ground'); await type('#h-slope', '20');
await type('[data-hrow="0"][data-k="top"]', '84'); await type('[data-hrow="0"][data-k="base"]', '-9');
const hp = Ht.heightTangent({ D: Ht.horizontalDistance(25, 20, 'pct'), top: 84, base: -9, unit: 'pct' }).H;
ok(Math.abs(num(await page.textContent('[data-h="0"]')) - hp) < 0.005, `percent readings, distance along a 20 % slope made horizontal: ${hp.toFixed(2)} m`);
await page.selectOption('#h-method', 'slope'); await page.check('input[name="h-unit"][value="deg"]');
await type('[data-hrow="0"][data-k="S"]', '30'); await type('[data-hrow="0"][data-k="top"]', '35'); await type('[data-hrow="0"][data-k="base"]', '-8');
const hs = Ht.heightSlopeDistance({ S: 30, top: 35, base: -8 }).H; ok(Math.abs(num(await page.textContent('[data-h="0"]')) - hs) < 0.005, `rangefinder to the base (Hamilton Fig. 19): ${hs.toFixed(2)} m`);
await page.selectOption('#h-method', 'poles'); await type('[data-hrow="0"][data-k="bc"]', '6'); await type('[data-hrow="0"][data-k="AC"]', '30'); await type('[data-hrow="0"][data-k="Ac"]', '4');
ok(num(await page.textContent('[data-h="0"]')) === 45, 'two-pole method: Graves §65 example 45');
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'tree-height.png'), fullPage: true });

// diameter: one stem, girth and two diameters, ellipse, rounding; tree list from the sample
await page.click('#tab-d'); await page.waitForSelector('#dtab');
await type('[data-drow="0"][data-k="value"]', '94,5'); await page.selectOption('[data-drow="0"][data-k="kind"]', 'girth');
const g1 = Dm.stemDiameter([{ kind: 'girth', value: 94.5 }]);
ok((await page.textContent('#dres')).includes(`Çap ${g1.d.toFixed(2)} cm`) && (await page.textContent('#dres')).includes(g1.g.toFixed(5)), `girth 94.5 cm → diameter ${g1.d.toFixed(2)} cm and basal area`);
await page.check('input[name="d-round"][value="down"]'); ok((await page.textContent('#dres')).includes('Çap 30 cm'), 'rounded down to the whole centimetre');
await page.selectOption('[data-drow="0"][data-k="kind"]', 'diameter'); await type('[data-drow="0"][data-k="value"]', '32'); await page.click('#d-add'); await type('[data-drow="1"][data-k="value"]', '28');
await page.check('input[name="d-round"][value="none"]'); ok((await page.textContent('#dres')).includes('Çap 30 cm'), 'two diameters: arithmetic mean 30 cm');
await page.check('input[name="d-mean"][value="ellipse"]'); const e = Dm.stemDiameter([{ kind: 'diameter', value: 32 }, { kind: 'diameter', value: 28 }], { mean: 'ellipse' });
ok((await page.textContent('#dres')).includes(`Çap ${e.d.toFixed(2)} cm`), `ellipse: equal-area diameter ${e.d.toFixed(2)} cm`);
await page.click('#d-sample'); await page.waitForSelector('#dsum');
const csv = await readFile(path.join(ROOT, 'assets/lab/tree/ornek/ornek-capler.csv')), ds = csv.toString('utf8').trim().split('\n').slice(1).map(l => Number(l.split(';')[1].replace(',', '.')));
const sm = Dm.treeSummary(ds.map(d => ({ d })));
const st = await page.textContent('#dsum');
ok(st.includes(`${sm.N} ağaç`) && st.includes(sm.G.toFixed(4)) && st.includes(sm.dg.toFixed(2)) && st.includes(sm.dMean.toFixed(2)), `tree list: ${sm.N} trees, ΣG ${sm.G.toFixed(4)} m², dg ${sm.dg.toFixed(2)} cm = engine (decimal comma column)`);
ok((await page.textContent('#panel')).includes('ağacın üst tarafındaki zeminden'), 'measuring rules shown');
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'tree-diameter.png'), fullPage: true });

// form: form factor, exponent (Graves example), quotient
await page.click('#tab-f'); await page.waitForSelector('#f-V');
await type('#f-V', '0.85'); await type('#f-d', '32'); await type('#f-H', '24');
const ff = Fm.formFactor({ V: 0.85, d: 32, H: 24 }); ok((await page.textContent('#ffres')).includes(`F = ${ff.F.toFixed(4)}`), `breast-height form factor ${ff.F.toFixed(4)}`);
await page.selectOption('#f-kind', 'normal'); ok((await page.textContent('#ffres')).includes('F = '), 'kind switch keeps a result');
await type('#f-d1', '18'); await type('#f-x1', '61'); await type('#f-d2', '15'); await type('#f-x2', '45'); await type('#f-exH', '20');
ok((await page.textContent('#exres')).includes('r = 1.1987') && (await page.textContent('#exres')).includes(String(Number(Fm.breastFormFactorFromExponent(1.1986504919597858, 20).toFixed(4)))), 'form exponent of the Graves example: 1.1987 (not the book\'s 1.35); breast-height form factor from it');
await type('#f-dMid', '21'); await type('#f-D', '30'); ok((await page.textContent('#qres')).includes('q = 0.7') && !(await page.textContent('#qres')).includes('F ='), 'form quotient without a constant: no F');
await type('#f-c', '0.2'); ok((await page.textContent('#qres')).includes('F = q − c = 0.5'), 'F = q − c with the constant typed');

// age and increment (TM-05): tree age, economic age, increment core with Pressler, stand mean ages, growth percent
await page.click('#tab-a'); await page.waitForSelector('#a-rings');
await type('#a-rings', '53'); await type('#a-toH', '5'); ok((await page.textContent('#ageres')).includes('Yaş 58 yıl'), 'tree age: 53 rings + 5 years = 58');
await type('#a-ringsOut', '70'); await type('#a-coreAge', '14'); ok((await page.textContent('#econres')).includes('84'), 'economic age: Graves example 84');
await type('#a-rings', '5,5'); ok((await page.textContent('#ageres')).includes('tam sayı'), 'a ring count that is not a whole number refused');
const W = [2.1, 1.8, 2.4, 2.0, 1.6, 1.9, 2.2, 2.5, 2.3, 2.0, 2.6, 3.1, 3.4, 3.0, 2.8, 3.3, 3.6, 4.0, 3.8, 4.2];
await type('#a-cD', '11.6'); await type('#a-cBark', '0.6'); await type('#a-cToBh', '6'); await page.uncheck('#a-cPith');
await page.fill('#a-cW', W.slice(0, 10).join(' ') + '\n' + W.slice(10).map(x => String(x).replace('.', ',')).join(';')); await page.press('#a-cW', 'Tab');
const cs = Ag.coreSeries({ widths: W, D: 11.6, doubleBark: 0.6, yearsToBh: 6, reachesPith: false }), pr10 = Ag.presslerDiameter(cs.dib, cs.series[10].d, 10);
ok((await page.textContent('#coreres')).includes(`20 halka; yaş 26 yıl; kabuksuz çap 11 cm`) && (await page.textContent('#app')).includes('öze ulaşmıyor') && !(await page.textContent('#app')).includes('yarıçaptan'), 'increment core: 20 rings (spaces, new line, ; and decimal commas), age 26, inside-bark 11 cm, no-pith warning');
const rowsC = await page.$$eval('#coretab tbody tr', rs => rs.map(r => [...r.children].map(c => c.textContent.trim())));
ok(rowsC.length === 3 && rowsC.every(r => !r[2].startsWith('-')) && rowsC.every((r, k) => Math.abs(Number(r[2]) - cs.decades[k].d) < 0.006 && Number(r[1]) === cs.decades[k].age), 'decade table (0, 10, 20 years ago) = engine');
ok((await page.textContent('#presres')).includes(String(Number(pr10.toFixed(2)))), `Pressler growth percent over 10 years ${pr10.toFixed(2)} % = engine`);
await type('[data-grow="0"][data-k="a"]', '60'); await type('[data-grow="0"][data-k="n"]', '120'); await type('[data-grow="0"][data-k="b"]', '4.2'); await type('[data-grow="0"][data-k="v"]', '38');
await page.click('#a-gadd'); await type('[data-grow="1"][data-k="a"]', '85'); await type('[data-grow="1"][data-k="n"]', '40'); await type('[data-grow="1"][data-k="b"]', '6.1'); await type('[data-grow="1"][data-k="v"]', '71');
const G = [{ a: 60, n: 120, b: 4.2, v: 38 }, { a: 85, n: 40, b: 6.1, v: 71 }], sres = await page.$$eval('#standres tr', rs => rs.map(r => r.children[1].textContent.trim()));
ok(['arithmetic', 'number', 'basal', 'volume'].every((m, k) => Math.abs(Number(sres[k]) - Ag.standAge(G, m).A) < 0.051), `stand mean ages (arithmetic, number, basal, volume) = engine: ${sres.join(', ')}`);
await type('#a-gNow', '0.84'); await type('#a-gThen', '0.61'); await type('#a-gYears', '10');
const gp = await page.$$eval('#gpres tr', rs => rs.map(r => Number(r.children[1].textContent.replace('%', '').trim())));
ok(['past', 'present', 'mean'].every((pp, k) => Math.abs(gp[k] - Ag.growthPercent({ now: 0.84, then: 0.61, n: 10, principal: pp }).p) < 0.0006), 'growth percent with three principals = engine');
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'tree-age.png'), fullPage: true });

// bark (TM-03): one point by gauge, girths and from inside; sample trees (typed and pasted); applied by k, line and a set
await page.click('#tab-b'); await page.waitForSelector('#b-dob');
ok(await page.locator('#barkcoef').isVisible() && (await page.locator('#cf-none').count()) === 1, 'bark tab: coefficient library shown, no built-in sets (K1)');
await type('#b-dob', '32'); await page.fill('#b-reads', '4 5,5;6'); await page.press('#b-reads', 'Tab');
const bp = Bk.measurePoint({ mode: 'gauge', dob: 32, readings: [4, 5.5, 6] });
const fx = (x, d) => String(Number(x.toFixed(d)));
ok((await page.textContent('#bres')).includes(`${fx(bp.B1, 2)} mm`) && (await page.textContent('#bres')).includes(`kabuksuz çap ${fx(bp.dub, 2)} cm`) && (await page.textContent('#bres')).includes(fx(bp.pctArea, 2)), `gauge: three readings (decimal comma, ; and space), bark ${bp.B1.toFixed(2)} mm, d_ub ${bp.dub.toFixed(2)} cm = engine`);
await type('#b-L', '4'); const bv = Bk.measurePoint({ mode: 'gauge', dob: 32, readings: [4, 5.5, 6], L: 4 });
ok((await page.textContent('#bres')).includes(`kabuk hacmi ${fx(bv.Vbark, 4)} m³`), 'with a log length: bark volume = over − under-bark volume');
await page.check('input[name="b-mode"][value="girths"]'); await type('#b-cob', '100'); await type('#b-cub', '94');
ok((await page.textContent('#bres')).includes(`Kabuk kalınlığı ${fx(Bk.barkFromGirths(100, 94), 2)} mm`), 'two girths: peripheral bark thickness (c_ob − c_ub)/2π');
await type('#b-cub', '104'); ok((await page.textContent('#bres')).includes('kabukludan büyük'), 'girth under bark larger: refused with a message');
const P = [[22, 20.1], [31.5, 28.9], [40, 36.4], [27, 24.8]];
for (let i = 0; i < 3; i++) { await type(`[data-brow="${i}"][data-k="dob"]`, String(P[i][0]).replace('.', ',')); await type(`[data-brow="${i}"][data-k="dub"]`, String(P[i][1])); }
page.once('dialog', d => d.accept('27\t24,8\n19 30'));
await page.click('#b-paste'); await page.waitForSelector('[data-brow="4"]');
const F = Bk.fitBark([...P.map(([dob, dub]) => ({ dob, dub })), { dob: 19, dub: 30 }]);
const kt = await page.textContent('#bkres');
ok(kt.includes(`k = ${fx(F.k, 4)}`) && kt.includes(String(F.k)) && kt.includes(String(F.line.a)) && kt.includes(`R² = ${fx(F.line.r2, 4)}`) && kt.includes('satırlar') && kt.includes('5'), `sample trees (typed and pasted): k ${F.k.toFixed(4)} at full precision, line, row 5 (d_ub > d_ob) left out`);
await page.check('input[name="b-method"][value="k"]'); await type('#b-k', '0,9'); await type('#b-one', '30');
ok((await page.textContent('#bapres')).includes('kabuksuz 27 cm'), 'typed k 0.9: 30 → 27 cm');
const BL = Bk.barkList({ kind: 'k', k: 0.9 }, ds.map(d => ({ d })));
ok((await page.textContent('#blist')).includes(`${BL.N} ağaç`) && (await page.textContent('#blist')).includes(fx(BL.Gub, 4)), `tree list from the diameter tab: ${BL.N} trees, G under bark ${BL.Gub.toFixed(4)} m² = engine`);
await page.check('input[name="b-method"][value="line"]'); const lo = Bk.applyBark({ kind: 'line', a: F.line.a, b: F.line.b }, 30);
ok((await page.textContent('#bapres')).includes(`kabuksuz ${fx(lo.dub, 2)} cm`), 'fitted line applied');
await page.check('input[name="b-method"][value="set"]'); ok((await page.textContent('#bapres')).includes('katsayı seti seçin'), 'set method without a set: asks for one');
await page.selectOption('#cf-form', 'bark.b2.loglog'); await page.click('#cf-new');
await page.fill('#cf-p-a', '0.9'); await page.fill('#cf-p-b', '0.75'); await page.fill('#cf-cit', 'Test, not a real equation'); await page.click('#cf-save');
await page.waitForSelector('#b-setId option:nth-child(2)', { state: 'attached' }); await page.selectOption('#b-setId', { index: 1 });
const lset = Bk.applyBark({ kind: 'set', set: { ...(await import('../../assets/lab/core/coef.js')).blankSet('bark.b2.loglog'), params: { a: 0.9, b: 0.75 }, source: { citation: 'x' } } }, 30);
ok((await page.textContent('#bapres')).includes(`kabuksuz ${fx(lset.dub, 2)} cm`) && lset.dub !== lo.dub, `ln 2B set (no correction) from the library: ${lset.dub.toFixed(2)} cm = engine`);
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'tree-bark.png'), fullPage: true });

// crown (TM-04): radii and two diameters, crown length and ratio, solids, crown cover
await page.click('#tab-c'); await page.waitForSelector('#c-radii');
ok(await page.locator('#barkcoef').isHidden(), 'crown tab: the bark coefficient library is hidden');
await page.fill('#c-radii', '2,5 3.1\n2;2.8 3,4 2.2'); await page.press('#c-radii', 'Tab');
const cr = Cr.crownFromRadii([2.5, 3.1, 2, 2.8, 3.4, 2.2]), ct = await page.textContent('#cres');
ok(ct.includes('6 yarıçap') && ct.includes(`tepe çapı ${fx(cr.width, 3)} m`) && ct.includes(`${fx(cr.area, 3)} m²`), `six radii (mixed separators and decimal commas): width ${cr.width.toFixed(3)} m, area ${cr.area.toFixed(3)} m² (quadratic mean) = engine`);
await page.fill('#c-radii', '2 3'); await page.press('#c-radii', 'Tab'); ok((await page.textContent('#cres')).includes('en az 4 yönden'), 'two radii: warning (at least 4 directions)');
await page.check('input[name="c-mode"][value="diam"]'); await type('#c-d1', '6,4'); await type('#c-d2', '5');
const cd = Cr.crownFromDiameters(6.4, 5);
ok((await page.textContent('#cres')).includes(`${fx(cd.areaCircle, 3)} m²`) && (await page.textContent('#cres')).includes(`${fx(cd.areaEllipse, 3)} m²`), 'two diameters: circle and ellipse areas = engine');
await type('#c-H', '24'); await type('#c-base', '9'); await type('#c-dbh', '32');
ok((await page.textContent('#clen')).includes('Tepe uzunluğu 15 m; tepe oranı %62.5') && (await page.textContent('#clen')).includes(fx(5.7 / 0.32, 2)), 'crown length 15 m, ratio 62.5 %, crown diameter / dbh');
const sol = await page.$$eval('#csol tbody tr', rs => rs.map(r => [...r.children].map(c => c.textContent.trim())));
ok(sol.length === 3 && Cr.SHAPES.every((sh, k) => { const q = Cr.crownSolid(sh, 5.7, 15); return Math.abs(Number(sol[k][1]) - q.S) < 0.0006 && Math.abs(Number(sol[k][2]) - q.V) < 0.0006; }), 'cone, paraboloid, cylinder: surface and volume = engine');
await page.fill('#c-widths', '4 5,5 6\n3 x'); await page.press('#c-widths', 'Tab'); await type('#c-plot', '50');
const cc = Cr.crownCover([4, 5.5, 6, 3, NaN], 50);
ok((await page.textContent('#ccov')).includes(`tepe örtüsü ${fx(cc.cover, 3)}`) && (await page.textContent('#panel')).includes('sıra: 5') && (await page.textContent('#panel')).includes("1'den büyük"), `crown cover ${cc.cover.toFixed(3)} (overlap note), unreadable value reported`);
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'tree-crown.png'), fullPage: true });
await page.click('#tab-b'); await page.waitForSelector('#b-mode', { state: 'attached' }).catch(() => {});

// downloads: Excel sheets, JSON run record with the tree list fingerprint
const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]);
const wb = XLSX.read(await readFile(await dx.path()), { type: 'buffer' });
ok(['Bilgi', 'Boy', 'Gövde', 'Ağaç listesi', 'Kabuk', 'Tepe', 'Biçim', 'Yaş ve artım', 'Burgu'].every(n => wb.SheetNames.includes(n)) && XLSX.utils.sheet_to_json(wb.Sheets['Kabuk'], { header: 1 }).filter(r => r[5] === 'ok').length === BL.N && XLSX.utils.sheet_to_json(wb.Sheets['Tepe'], { header: 1 }).some(r => r[0] === 'crown_ratio_percent' && r[1] === 62.5) && XLSX.utils.sheet_to_json(wb.Sheets['Burgu'], { header: 1 }).filter(r => typeof r[0] === 'number' && typeof r[2] === 'number').length >= 21 && XLSX.utils.sheet_to_json(wb.Sheets['Ağaç listesi'], { header: 1 }).length === ds.length + 6, 'Excel: Info, Height, Stem, Tree list, Bark (every tree of the list), Crown, Form, Age and increment, Core (every year)');
const [dj] = await Promise.all([page.waitForEvent('download'), page.click('#x-json')]);
const J = JSON.parse(await readFile(await dj.path(), 'utf8')), txt = JSON.stringify(J);
ok(txt.includes(createHash('sha256').update(csv).digest('hex')) && txt.includes(TOOL.version) && txt.includes('Hamilton'), 'JSON run record: tool version, sources and the SHA-256 of the tree list file');
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'tree-form.png'), fullPage: true });

// session, English, phone
await page.waitForTimeout(400); await page.reload(); await page.waitForSelector('#b-cub'); ok((await page.textContent('#status')).includes('geri yüklendi') && (await page.inputValue('#b-cub')) === '104' && (await page.locator('#b-setId').inputValue()) !== '', 'session restored on the same tab (bark, with the chosen set)');
await page.click('#tab-a'); await page.waitForSelector('#a-cW'); ok((await page.inputValue('#a-cW')).includes('4,2'), 'age tab restored');
await page.waitForTimeout(400); await page.goto(URL + '?lang=en'); await page.waitForSelector('#a-cW'); ok((await page.textContent('#app')).includes('Increment core') && (await page.textContent('#app')).includes('Bark'), 'English page');
const ph = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); ph.on('pageerror', e => errors.push(e.message));
await ph.goto(URL + '?lang=tr'); await ph.waitForSelector('#app .tabs'); ok(await ph.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'phone: no horizontal scroll');
if (SHOTS) await ph.screenshot({ path: path.join(SHOTS, 'tree-phone.png'), fullPage: true });
ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
console.log(`tree e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
