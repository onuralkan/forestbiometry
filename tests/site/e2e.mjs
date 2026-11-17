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
const TOOL_IDS = [...SITE.matchAll(/'file' => '([a-z0-9-]+)\.php', 'v' =>/g)].map(m => m[1]);
const CAT = await readFile(new URL('../../inc/catalog.php', import.meta.url), 'utf8');
const N_TOOLS = (SITE.match(/'file' => '[a-z0-9-]+\.php', 'v' =>/g) || []).length, N_CATS = (CAT.slice(CAT.indexOf('function site_modules'), CAT.indexOf('function site_catalog')).match(/\['id' => '/g) || []).length;
const CATALOG = [...CAT.matchAll(/\['([A-Z]{2}-\d\d)', '(live|dev|planned|out)', '[^']*', '[^']*'(?:, '([a-z-]+\.php)')?\]/g)].map(m => ({ id: m[1], status: m[2], page: m[3] || null }));
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };

// 1. tools index is the home page; every ready tool link opens
await page.goto(BASE + '/?lang=tr');
ok((await page.locator('h1').textContent()).trim() === 'Ormancılık Biyometrisi Araçları', 'home page is the tools index (TR)');
const links = await page.locator('.dir-cards a.hz-card').evaluateAll(a => a.map(x => x.getAttribute('href')));
ok(links.length === N_TOOLS && N_TOOLS >= 7, `${N_TOOLS} ready tools listed: ` + links.join(', '));
for (const l of links) { const r = await page.request.get(BASE + '/' + l); ok(r.status() === 200, l + ' opens'); }
ok((await page.locator('.dir-cards a.hz-card').evaluateAll(a => a.every(x => x.querySelectorAll('svg.hz-fig *').length > 5 && x.querySelector('.hz-sub').textContent.trim().length > 10 && x.querySelector('.hz-sub').textContent.length <= 90 && (x.getAttribute('title') || '').length > 40))), 'tools index: every tool a card with a drawing, a short caption (≤ 90 characters) and the full description as a tooltip');
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
ok((await page.locator('#side .b-cat').count()) === N_CATS && N_CATS === 11 && (await page.locator('#side .b-live a').count()) === N_TOOLS, `sidebar: ${N_CATS} modules, ${N_TOOLS} tool pages`);
ok((await page.locator('.dir-group').count()) === N_CATS, `home directory grouped in ${N_CATS} modules`);
{ const g = page.locator('.dir-group[data-mod="SS"]'), b = g.locator('.dir-cat');
  ok((await page.locator('.dir-group.collapsed').count()) === N_CATS && !(await g.locator('.dir-cards').isVisible()), 'home: modules closed by default');
  await b.click(); ok(await g.locator('.dir-cards').isVisible() && (await b.getAttribute('aria-expanded')) === 'true', 'home: a module opens from its heading');
  await page.reload(); ok(await page.locator('.dir-group[data-mod="SS"] .dir-cards').isVisible(), 'home: an open module stays open after a reload');
  await page.click('#dir-open'); ok((await page.locator('.dir-group.collapsed').count()) === 0, 'home: open all');
  await page.click('#dir-close'); ok((await page.locator('.dir-group.collapsed').count()) === N_CATS, 'home: close all'); }
{ const pl = CATALOG.filter(c => !c.page && c.status !== 'out'), out = CATALOG.filter(c => c.status === 'out');
  ok(CATALOG.length === 74 && out.length === 6, `catalogue: 74 tool ids, 6 out of scope (${out.map(c => c.id).join(', ')})`);
  ok((await page.locator('#side .b-pl').count()) === pl.length && (await page.locator('#side .b-pl a').count()) === 0 && (await page.locator('.dir-cards .hz-card.soon').count()) === pl.length && (await page.locator('.dir-cards .hz-card.soon a, .dir-cards a.hz-card.soon').count()) === 0 && (await page.locator('.dir-cards .hz-card.soon .hz-badge').count()) === pl.length && (await page.locator('.dir-cards .hz-card.soon svg.hz-fig').evaluateAll(a => a.every(x => x.childElementCount > 0))), `${pl.length} planned tools greyed in the sidebar and the directory, without links`);
  const titles = await page.locator('#side .b-pl .b-planned').evaluateAll(a => a.map(x => x.getAttribute('title')));
  ok(!out.some(c => titles.some(t => t.startsWith(c.id + ' '))), 'out-of-scope tools are not shown');
  ok(CATALOG.filter(c => c.page).every(c => TOOL_IDS.includes(c.page.replace('.php', ''))), 'every catalogue page exists in site_tools()'); }
{ const g = page.locator('#side .b-group[data-mod="TM"]'), b = g.locator('.b-cat');
  const was = await b.getAttribute('aria-expanded'); await b.click();
  ok((await b.getAttribute('aria-expanded')) !== was && (await g.evaluate(x => x.classList.contains('collapsed'))) === (was === 'true'), 'a module opens and closes from its heading');
  await page.reload(); ok((await page.locator('#side .b-group[data-mod="TM"] .b-cat').getAttribute('aria-expanded')) !== was, 'the state of the module is remembered in this browser'); }
{ // home showcase: one card per live tool it names, each a link to an existing tool page; labelled as illustrations
  const cards = await page.locator('.hz-show .hz-card').evaluateAll(a => a.map(x => [x.getAttribute('href'), x.querySelectorAll('svg.hz-fig *').length]));
  ok(cards.length === 5 && cards.every(([h, n]) => TOOL_IDS.includes(h.replace('.php', '')) && n > 5), 'home showcase: 5 drawings linking to live tools');
  ok((await page.locator('.hz-cap').textContent()).includes('benzetim'), 'showcase labelled as illustrations (points simulated)');
  const st = await page.locator('.hz-stats b').allTextContents();
  ok(+st[0] === CATALOG.filter(c => c.status === 'live').length && +st[1] === CATALOG.length, 'home figures from the catalogue (live, all)'); }
// default language: English without ?lang and without a cookie, whatever the browser language (16 Nov 2026)
{ const c = await browser.newContext({ locale: 'tr-TR', extraHTTPHeaders: { 'Accept-Language': 'tr-TR,tr;q=0.9' } }), q = await c.newPage();
  await q.goto(BASE + '/'); ok(await q.getAttribute('html', 'lang') === 'en', 'default language is English even for a Turkish browser');
  await q.goto(BASE + '/?lang=tr'); await q.goto(BASE + '/'); ok(await q.getAttribute('html', 'lang') === 'tr', 'Turkish once chosen is remembered (cookie)');
  await c.close(); }
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
ok(apaTR.startsWith('Alkan, O. (2026). Boy–Çap Modelleme (Sürüm 1.1.0) [Web uygulaması].') && apaTR.includes('https://forestbiometry.online/boy-cap.php adresinden erişildi'), 'cite: APA in Turkish with version and URL');
ok((await cpg.locator('.cite-row[data-f="apa"] .cite-text i').textContent()) === 'Boy–Çap Modelleme', 'cite: title in italics');
await cpg.check('input[name="clang"][value="en"]'); await cpg.fill('#cdate', '2026-03-05'); await cpg.locator('#cdate').dispatchEvent('change');
const apaEN = await cpg.locator('.cite-row[data-f="apa"] .cite-text').textContent();
ok(apaEN.includes('Height–Diameter Modelling (Version 1.1.0) [Web application]') && apaEN.includes('Retrieved March 5, 2026'), 'cite: English and chosen access date');
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

// user guide: start page with task cards and a section tree; one page per section in both languages; old #links
for (const l of ['tr', 'en']) {
  await page.goto(BASE + '/kilavuz.php?lang=' + l);
  const nav = await page.$$eval('.guide-toc .guide-grp a', as => as.map(a => new URL(a.href).searchParams.get('k')));
  ok(nav.length === TOOL_IDS.length + 2 && nav[0] === 'genel' && nav[1] === 'is-akisi' && TOOL_IDS.every(id => nav.includes(id)), `guide (${l}): the section tree holds general, workflow and every tool: ` + nav);
  const cardLinks = await page.$$eval('.gcards a', as => as.map(a => new URL(a.href).searchParams.get('k')));
  ok(await page.locator('.gcard').count() >= 5 && TOOL_IDS.every(id => cardLinks.includes(id)), `guide (${l}): task cards on the start page reach every tool`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `guide (${l}): no horizontal scroll`);
  for (const id of ['genel', ...TOOL_IDS]) {
    const r = await page.request.get(`${BASE}/kilavuz.php?k=${id}&lang=${l}`), t = await r.text();
    ok(r.status() === 200 && t.includes(`<h2 id="${id}"`) && (t.match(/class="card guide-sec"/g) || []).length === 1 && t.includes(`rel="canonical" href="https://forestbiometry.online/kilavuz.php?k=${id}&amp;lang=${l}"`), `guide (${l}): page of ${id} holds only its section, with its own canonical address`);
  }
}
await page.goto(BASE + '/kilavuz.php?k=nope&lang=tr'); ok(await page.locator('#guide-unknown').count() === 1 && await page.locator('.gcard').count() >= 5, 'unknown section: a note and the start page');
await page.goto(BASE + '/kilavuz.php?lang=tr'); await page.fill('#guide-find', 'GOVDE'); ok(await page.locator('.guide-toc li:not([hidden]) a').count() >= 1 && (await page.locator('.guide-toc li:not([hidden]) a').allTextContents()).every(t => /gövde/i.test(t)), 'section search ignores case and Turkish letters');
ok((await page.locator('.b-nav a[href="kilavuz.php"]').count()) === 1 && (await page.locator('.b-side-foot a[href="kilavuz.php"]').count()) === 1, 'guide in the top menu and the sidebar');
await page.goto(BASE + '/boy-cap.php?lang=tr'); await page.click('.b-head .b-guide'); await page.waitForURL(/kilavuz\.php\?k=boy-cap$/);
ok(await page.locator('h2#boy-cap').count() === 1 && await page.locator('.guide-toc a[aria-current="page"]').getAttribute('href') === 'kilavuz.php?k=boy-cap', 'tool header link opens the tool\'s guide page, marked in the tree');
await page.goto(BASE + '/kilavuz.php?lang=tr#ornekleme'); await page.waitForURL(/k=ornekleme/); ok(await page.locator('h2#ornekleme').count() === 1, 'an old link kilavuz.php#id is sent on to its page');
await page.click('.guide-sec a.guide-open[href="ornekleme.php"]'); ok(page.url().includes('/ornekleme.php'), 'the guide links back to each tool');
await page.goto(BASE + '/kilavuz.php?k=genel&lang=tr'); await page.click('.guide-pager a[rel="next"]'); await page.waitForURL(/k=is-akisi/); ok(true, 'next-section link');

// module loading: every script and style of every page carries a version tag (import map from inc/site.php), so that
// versioned files can be cached for long; a module missing from the graph would be requested without a tag
{ const site = (await import('node:fs')).readFileSync(new URL('../../inc/site.php', import.meta.url), 'utf8');
  const files = ['', 'kilavuz.php', 'hakkinda.php', ...[...site.matchAll(/'file' => '([a-z-]+\.php)', 'v' =>/g)].map(m => m[1])];
  const q = await browser.newPage(); q.on('pageerror', e => errors.push(e.message));
  for (const f of files) { const un = []; let mods = 0; const h = r => { const u = r.url(); if (/\.(m?js|css)(\?|$)/.test(u)) { mods++; if (!/[?&]v=/.test(u)) un.push(u.replace(BASE, '')); } };
    q.on('request', h); await q.goto(BASE + '/' + f, { waitUntil: 'networkidle' }); q.off('request', h);
    const im = await q.evaluate(() => { const s = document.querySelector('script[type="importmap"]'); return s ? Object.keys(JSON.parse(s.textContent).imports).length : 0; });
    // bundled (the server, or FB_BUNDLE=1): one file from assets/build/ instead of the module tree, so a page makes only
    // a few requests (the host's bot protection answers bursts with an HTML page; docs/PROGRESS.md, 16 Nov 2026)
    const bundled = await q.evaluate(() => !!document.querySelector('script[type="module"][src^="assets/build/"]'));
    if (bundled) ok(un.length === 0 && mods <= 4, `${f || 'index.php'}: bundled, ${mods} scripts and styles, all versioned${un.length ? '; unversioned: ' + un.join(' ') : ''}`);
    else ok(un.length === 0 && im > 0, `${f || 'index.php'}: ${mods} scripts and styles, all versioned (import map of ${im} modules)${un.length ? '; unversioned: ' + un.join(' ') : ''}`); }
  await q.close(); }

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`site e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
