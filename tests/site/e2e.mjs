// Browser test for the site shell of forestbiometry.online: tools index, About page, language, removed pages.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/site/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
// tool and category counts come from inc/site.php (site_tools(), site_cats()), so adding a tool does not break this test
const SITE = await readFile(new URL('../../inc/site.php', import.meta.url), 'utf8');
const N_TOOLS = (SITE.match(/'file' => '[a-z0-9-]+\.php', 'v' =>/g) || []).length, N_CATS = (SITE.slice(SITE.indexOf('function site_cats'), SITE.indexOf('function site_icon')).match(/\['id' => '/g) || []).length;
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };

// 1. tools index is the home page; every ready tool link opens
await page.goto(BASE + '/?lang=tr');
ok((await page.locator('h1').textContent()).trim() === 'Ormancılık Biyometrisi Araçları', 'home page is the tools index (TR)');
const links = await page.locator('.toollist li.ready h3 a').evaluateAll(a => a.map(x => x.getAttribute('href')));
ok(links.length === N_TOOLS && N_TOOLS >= 7, `${N_TOOLS} ready tools listed: ` + links.join(', '));
for (const l of links) { const r = await page.request.get(BASE + '/' + l); ok(r.status() === 200, l + ' opens'); }
ok((await page.locator('.toollist li.planned').count()) === 0, 'no planned tool left without a link');
ok((await page.locator('text=/Meşcere Postası|Stand Gazette|Bulmaca/').count()) === 0, 'no trace of the gazette');
await shot('site-1-dizin');

// 2. About: name and email; ORCID only when filled in (never a made-up id)
await page.click('.b-nav a[href="hakkinda.php"]');
ok((await page.locator('dl.kv dd').first().textContent()) === 'Onur Alkan', 'About: name');
ok((await page.locator('dl.kv a[href="mailto:onuralkan@isparta.edu.tr"]').count()) === 1, 'About: email link');
const orcid = await page.locator('dl.kv dt', { hasText: 'ORCID' }).count();
const orcidLink = await page.locator('dl.kv a[href^="https://orcid.org/"]').evaluateAll(a => a.map(x => x.getAttribute('href')));
ok(orcid === 0 || /^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcidLink[0] || ''), 'About: ORCID hidden or well-formed');
ok((await page.locator('.b-nav a[aria-current]').textContent()) === 'Hakkında', 'current page marked in the navigation');
await shot('site-2-hakkinda');

// 3. language switch keeps the page; footer names the author
await page.click('#langlink'); await page.waitForURL(/lang=en/);
ok((await page.locator('h1').textContent()).trim() === 'About' && (await page.locator('.b-foot', { hasText: 'Author and responsible person' }).count()) === 1, 'EN About with author in footer');

// 4. removed pages of the old personal site are gone
for (const f of ['admin.php', 'bulmaca.php', 'mescere.php', 'weibull.php', 'check.php', 'araclar/veri-denetcisi.php']) {
  const r = await page.request.get(BASE + '/' + f, { maxRedirects: 0 }); ok(r.status() === 404, f + ' is gone (' + r.status() + ')');
}
const inc = await page.request.get(BASE + '/inc/site.php'); ok(inc.status() !== 200 || (await inc.text()) === '', 'inc/site.php serves nothing');

// 5. phone + dark
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
phone.on('pageerror', e => errors.push(e.message));
for (const u of ['/?lang=tr', '/hakkinda.php?lang=tr']) {
  await phone.goto(BASE + u);
  ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal scroll on ' + u);
}
await shot('site-3-telefon-koyu', phone);

// 6. sidebar: categories, current tool, narrow mode remembered, drawer on phones; stem map labelled as illustration
await page.goto(BASE + '/?lang=tr');
ok((await page.locator('#side .b-cat').count()) === N_CATS && (await page.locator('#side .b-side-nav a').count()) === N_TOOLS, `sidebar: ${N_CATS} categories, ${N_TOOLS} tools`);
ok((await page.locator('.dir-group').count()) === 4, 'home directory grouped in 4 categories');
ok((await page.locator('svg.stemmap title', { hasText: 'çizim, gerçek ölçüm değil' }).count()) === 1 && (await page.locator('.stemmap .sm-t').count()) > 20, 'stem map drawn and labelled as an illustration');
await page.click('#side a[href="boy-cap.php"]'); await page.waitForURL(/boy-cap/);
ok((await page.locator('#side a[aria-current="page"]').getAttribute('href')) === 'boy-cap.php' && (await page.locator('.b-headico svg').count()) === 1, 'current tool marked in the sidebar, icon in the page head');
await page.click('#sidenarrow'); await page.reload();
ok(await page.evaluate(() => document.documentElement.classList.contains('side-narrow')) && (await page.locator('#sidenarrow').getAttribute('aria-pressed')) === 'true', 'narrow sidebar remembered after reload');
await page.click('#sidenarrow');
const ph = await browser.newPage({ viewport: { width: 390, height: 844 } });
ph.on('pageerror', e => errors.push(e.message));
await ph.goto(BASE + '/ornekleme.php?lang=tr');
ok(!(await ph.locator('#side').isVisible()) && (await ph.locator('#navopen').isVisible()), 'phone: sidebar hidden, menu button shown');
await ph.click('#navopen'); await ph.waitForTimeout(300);
ok(await ph.locator('#side').isVisible() && (await ph.locator('#navopen').getAttribute('aria-expanded')) === 'true', 'phone: menu opens the drawer');
await ph.keyboard.press('Escape'); await ph.waitForTimeout(300);
ok(!(await ph.locator('#side').isVisible()) && (await ph.locator('#scrim').isHidden()), 'phone: Escape closes the drawer');
await ph.click('#navopen'); await ph.waitForTimeout(300); await ph.click('#side a[href="cap-dagilimi.php"]'); await ph.waitForURL(/cap-dagilimi/);
ok(!(await ph.locator('#side').isVisible()), 'phone: following a link leaves the drawer closed on the new page');
ok(await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal scroll with the sidebar');

// 7. cite dialog: tool by default on a tool page, platform on the home page; language, date, copy, .bib download
const cp = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
const cpg = await cp.newPage(); cpg.on('pageerror', e => errors.push(e.message));
await cpg.goto(BASE + '/boy-cap.php?lang=tr'); await cpg.click('#citebtn');
await cpg.waitForSelector('#citedlg[open] .cite-row');
ok((await cpg.locator('#citedlg .cite-row').count()) === 8 && await cpg.isChecked('input[name="cscope"][value="tool"]'), 'cite: 8 formats, this tool chosen by default');
const apaTR = await cpg.locator('.cite-row[data-f="apa"] .cite-text').textContent();
ok(apaTR.startsWith('Alkan, O. (2026). Boy–Çap Modelleme (Sürüm 1.0.0) [Web uygulaması].') && apaTR.includes('https://forestbiometry.online/boy-cap.php adresinden erişildi'), 'cite: APA in Turkish with version and URL');
ok((await cpg.locator('.cite-row[data-f="apa"] .cite-text i').textContent()) === 'Boy–Çap Modelleme', 'cite: title in italics');
await cpg.check('input[name="clang"][value="en"]'); await cpg.fill('#cdate', '2026-03-05'); await cpg.locator('#cdate').dispatchEvent('change');
const apaEN = await cpg.locator('.cite-row[data-f="apa"] .cite-text').textContent();
ok(apaEN.includes('Height–Diameter Modelling (Version 1.0.0) [Web application]') && apaEN.includes('Retrieved March 5, 2026'), 'cite: English and chosen access date');
await cpg.click('.cite-row[data-f="apa"] [data-copy]');
await cpg.waitForFunction(() => document.querySelector('.cite-row[data-f="apa"] [data-copy]').textContent !== document.querySelector('.cite-row[data-f="mla"] [data-copy]').textContent, null, { timeout: 5000 }).catch(() => {});   // wait for the async write
{ const cb = await cpg.evaluate(() => navigator.clipboard.readText()); ok(cb === apaEN, 'cite: copy puts the citation on the clipboard: ' + JSON.stringify(cb).slice(0, 80)); }
const [bd] = await Promise.all([cpg.waitForEvent('download'), cpg.click('[data-dl="bibtex"]')]);
const bibt = await readFile(await bd.path(), 'utf8');
ok(bd.suggestedFilename() === 'boy-cap-en.bib' && bibt.startsWith('@misc{alkan2026boycap,') && bibt.includes('urldate      = {2026-03-05}'), 'cite: .bib download');
await cpg.check('input[name="cscope"][value="platform"]');
ok((await cpg.locator('.cite-row[data-f="apa"] .cite-text').textContent()).startsWith('Alkan, O. (2026). Forest Biometrics Tools [Web application].'), 'cite: whole platform');
await cpg.keyboard.press('Escape'); ok(!(await cpg.locator('#citedlg').evaluate(d => d.open)), 'cite: Escape closes the dialog');
await cpg.goto(BASE + '/?lang=tr'); await cpg.click('#citebtn'); await cpg.waitForSelector('#citedlg[open] .cite-row');
ok((await cpg.locator('input[name="cscope"]').count()) === 0 && (await cpg.locator('.cite-row[data-f="apa"] .cite-text').textContent()).startsWith('Alkan, O. (2026). Ormancılık Biyometrisi Araçları [Web uygulaması].'), 'cite: home page cites the platform');
await cpg.goto(BASE + '/hakkinda.php?lang=en');
ok((await cpg.locator('#cite-inline').textContent()).startsWith('Alkan, O. (2026). Forest Biometrics Tools [Web application].'), 'About: platform citation shown');
await cp.close();

// user guide: both languages, every section, linked from the menu and from each tool's header
for (const l of ['tr', 'en']) {
  await page.goto(BASE + '/kilavuz.php?lang=' + l);
  const ids = await page.evaluate(() => [...document.querySelectorAll('.guide-sec h2[id]')].map(h => h.id)), toc = await page.locator('.guide-toc a').count();
  ok(ids.join() === 'genel,is-akisi,veri-denetcisi,ornek-alan,model-degerlendirme,cap-dagilimi,boy-cap,ornekleme,nispi-siralama' && toc === ids.length, `guide (${l}): nine sections and a table of contents: ` + ids);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `guide (${l}): no horizontal scroll`);
}
ok((await page.locator('.b-nav a[href="kilavuz.php"]').count()) === 1 && (await page.locator('.b-side-foot a[href="kilavuz.php"]').count()) === 1, 'guide in the top menu and the sidebar');
await page.goto(BASE + '/boy-cap.php?lang=tr'); await page.click('.b-head .b-guide'); await page.waitForURL(/kilavuz\.php#boy-cap$/);
ok(Math.abs(await page.evaluate(() => document.getElementById('boy-cap').getBoundingClientRect().top)) < 120, 'tool header link opens the tool\'s section of the guide');
await page.goto(BASE + '/kilavuz.php?lang=tr'); await page.click('.guide-sec a.guide-open[href="ornekleme.php"]'); ok(page.url().includes('/ornekleme.php'), 'the guide links back to each tool');

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`site e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
