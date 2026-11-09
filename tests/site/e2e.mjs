// Browser test for the site shell of forestbiometry.online: tools index, About page, language, removed pages.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/site/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
import { createRequire } from 'node:module';
import path from 'node:path';
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
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };

// 1. tools index is the home page; every ready tool link opens
await page.goto(BASE + '/?lang=tr');
ok((await page.locator('h1').textContent()).trim() === 'Ormancılık Biyometrisi Araçları', 'home page is the tools index (TR)');
const links = await page.locator('.toollist li.ready h3 a').evaluateAll(a => a.map(x => x.getAttribute('href')));
ok(links.length === 7, 'seven ready tools listed: ' + links.join(', '));
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
ok((await page.locator('#side .b-cat').count()) === 4 && (await page.locator('#side .b-side-nav a').count()) === 7, 'sidebar: 4 categories, 7 tools');
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

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`site e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
