// Browser test for the site shell of forestbiometry.online: tools index, About page, English-only language rule, removed pages.
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
const CATALOG = [...CAT.matchAll(/\['([A-Z]{2}-\d\d)', '(live|dev|planned|out)', '[^']*'(?:, '([a-z-]+\.php)')?\]/g)].map(m => ({ id: m[1], status: m[2], page: m[3] || null }));
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };

// 1. home page (20 Nov 2026, user decision): short intro, a search over every tool, six direct links, the way to the
//    tools index (araclar.php), first steps, scientific basis; the sidebar as on every page (user correction), no bulk reset on it
await page.goto(BASE + '/');
ok((await page.locator('h1').textContent()).trim() === 'Calculation and modelling for your forest measurements.' && (await page.title()) === 'Forest Biometry | Forest Biometrics Tools', 'home page: short intro heading, title "Forest Biometry | <subtitle>"');
ok(await page.locator('#side').isVisible() && (await page.locator('#side .b-live a').count()) === N_TOOLS && (await page.locator('.b-resetall, #hm-sessions, .hm-reset').count()) === 0, 'home: the sidebar as on the other pages; no bulk reset box or button');
ok((await page.textContent('.hp-data')).includes('Your raw data are not sent to a server.') && (await page.locator('text=/No built-in coefficients/i').count()) === 0, 'home: the data note; "no built-in coefficients" is not a headline');
{ const res = () => page.$$eval('.hp-res .hm-item:not([hidden]) a', a => a.map(x => x.getAttribute('href')));
  ok((await page.locator('label[for="tool-q"]').textContent()).trim() === 'Find a tool or method' && (await page.getAttribute('#tool-q', 'placeholder')) === 'E.g. Weibull, site index, RMSE' && await page.isHidden('#hp-results'), 'home search: visible label, placeholder, no results before typing');
  ok((await page.locator('.hp-res .hm-item').count()) === N_TOOLS, `home search covers all ${N_TOOLS} tools, not only the six direct links`);
  await page.fill('#tool-q', 'weibull'); ok((await res()).includes('cap-dagilimi.php') && (await res()).includes('boy-cap.php'), 'home search by method: Weibull finds Diameter Distribution and Height–Diameter: ' + (await res()).join(', '));
  await page.fill('#tool-q', 'RMSE'); ok((await res()).includes('model-degerlendirme.php'), 'home search: RMSE finds Model Evaluation');
  await page.fill('#tool-q', 'STEM TAPER'); ok((await res())[0] === 'govde-profili.php' && (await page.textContent('#tool-count')).includes(`of ${N_TOOLS} tools`), 'home search: case ignored; the tool named so first: ' + (await res()).join(', '));
  await page.press('#tool-q', 'Enter'); ok(await page.evaluate(() => document.activeElement.getAttribute('href')) === 'govde-profili.php', 'home search: Enter moves to the first result');
  await page.fill('#tool-q', 'zzzz'); ok(await page.isVisible('#hm-none') && (await res()).length === 0, 'home search without a match says so');
  await page.focus('#tool-q'); await page.press('#tool-q', 'Escape'); ok((await page.inputValue('#tool-q')) === '' && await page.isHidden('#hp-results'), 'home search: Escape clears');
  const picks = await page.$$eval('.hp-group a', a => a.map(x => x.getAttribute('href')));
  ok(picks.join() === 'ornek-alan.php,cap-dagilimi.php,seksiyon-hacmi.php,bonitet.php,boy-cap.php,model-degerlendirme.php' && (await page.locator('.hp-group').count()) === 3 && (await page.$$eval('.hp-group p', p => p.every(x => x.textContent.length > 40))), 'home: six direct links in three groups, each with its scope');
  ok((await page.locator('.hp-picks .hm-ti, .hp-picks code').count()) === 0 && (await page.locator('text=/popüler|en çok kullanılan|most used|popular/i').count()) === 0, 'home: no catalogue codes in the direct links, no popularity claim');
  ok((await page.getAttribute('.hp-all', 'href')) === 'araclar.php' && (await page.textContent('.hp-all')).includes(`(${N_TOOLS})`), 'home: "Browse all tools" leads to the tools index');
  const tasks = await page.$$eval('.hp-tasks a', a => a.map(x => x.getAttribute('href')));
  ok(tasks.length >= 5 && tasks.every(h => /^araclar\.php\?task=[a-z]+$/.test(h)) && (await page.textContent('.hp-start')).includes('You can load your table straight into a tool.'), 'home: "which tool suits my data" leads to the task filters; the Data Checker is not a required first step');
  const sci = await page.$$eval('.hp-sci li > a', a => a.map(x => x.getAttribute('href')));
  ok(sci.join() === 'kilavuz.php,hakkinda.php#h-tests,hakkinda.php#h-cite', 'home: scientific basis links: guide, how tests are done, how to cite');
  for (const h of sci.filter(x => x.includes('#'))) { await page.goto(BASE + '/' + h); ok(await page.locator('#' + h.split('#')[1]).count() === 1, h + ' exists'); }
  ok((await page.locator('section', { has: page.locator('#h-tests') }).textContent()).includes('it does not show that the method suits your data'), 'About: tests are told apart from the method suiting the data'); }
{ // recently used: only real history, at most four, next to the search
  const c = await browser.newContext(), r = await c.newPage(); await r.goto(BASE + '/');
  ok(await r.isHidden('#hm-recent'), 'recently used: hidden without history (no placeholders)');
  { // hero box (22 Nov 2026): title, search and recently used in one box, the brand mark beside them (decorative)
    const box = await r.$eval('.hp-hero', e => { const m = e.querySelector('.hp-mark').getBoundingClientRect(), b = e.getBoundingClientRect(); return { h1: !!e.querySelector('#hp-h'), q: !!e.querySelector('#tool-q'), rec: !!e.querySelector('#hm-recent'), hid: e.querySelector('.hp-hero-mark').getAttribute('aria-hidden'), mh: m.height, bh: b.height, inside: m.right <= b.right && m.top >= b.top && m.bottom <= b.bottom }; });
    ok(box.h1 && box.q && box.rec && box.hid === 'true' && box.inside && box.mh > 0.6 * box.bh && box.mh < box.bh, `hero box holds the title, the search and recently used; mark inside the box, a little lower than it (${Math.round(box.mh)} of ${Math.round(box.bh)} px)`); }
  for (const t of ['bonitet', 'boy-cap', 'pano', 'rapor', 'ornekleme']) await r.goto(BASE + '/' + t + '.php');
  await r.goto(BASE + '/'); const rec = await r.$$eval('#hm-recent-list a', a => a.map(x => x.getAttribute('href')));
  ok(await r.isVisible('#hm-recent') && rec.join() === 'ornekleme.php,rapor.php,pano.php,boy-cap.php' && !(await r.textContent('#hm-recent')).match(/devam|continue/i), 'recently used: the last four tools, plain links: ' + rec.join(', '));
  await c.close(); }
{ // old links of the home page: ?q=, ?m=, ?task= and #mod-XX go to the tools index with the same meaning
  await page.goto(BASE + '/?m=SV'); ok(page.url().includes('araclar.php?m=SV') && (await page.getAttribute('.hm-chip[data-mod="SV"]', 'aria-pressed')) === 'true', 'old link ?m=SV: tools index with the module filter');
  await page.goto(BASE + '/?task=agac'); ok(page.url().includes('araclar.php') && (await page.getAttribute('.hm-task[data-task="agac"]', 'aria-pressed')) === 'true', 'old link ?task=agac: tools index with the task filter');
  await page.goto(BASE + '/?q=weibull'); ok(page.url().includes('araclar.php') && (await page.inputValue('#tool-q')) === 'weibull', 'old link ?q=: tools index with the search');
  await page.goto(BASE + '/#mod-SQ'); await page.waitForURL(/araclar\.php\?m=SQ/); ok((await page.getAttribute('.hm-chip[data-mod="SQ"]', 'aria-pressed')) === 'true', 'old link #mod-SQ: tools index with the module filter'); }
// tools index: every tool, by module, with search and module and task filters; the sidebar as on the other pages
await page.goto(BASE + '/araclar.php');
ok((await page.locator('h1').textContent()).trim() === 'Tools' && await page.locator('#side').isVisible() && (await page.locator('.b-nav a[href="araclar.php"]').getAttribute('aria-current')) === 'page', 'tools index: own page with the sidebar, "Tools" marked in the top menu');
ok((await page.locator('.b-brand').getAttribute('href')) === './', 'the logo leads to the home page, "Tools" to the tools index');
{ // brand (20 Nov 2026): the mark is a drawing in the page (no image, no tile), hidden from screen readers; the home link has a name;
  // favicon files exist; tool pages are titled "<tool> | Forest Biometry"
  const br = await page.evaluate(() => { const a = document.querySelector('.b-brand'), svg = a.querySelector('svg.b-logo');
    return { label: a.getAttribute('aria-label'), name: a.querySelector('.b-brand-name').textContent, hidden: svg && svg.getAttribute('aria-hidden') === 'true', shapes: svg ? svg.querySelectorAll('path, circle').length : 0, img: a.querySelectorAll('img, image').length,
      icons: [...document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')].map(l => l.getAttribute('href').split('?')[0]) }; });
  ok(br.label === 'Forest Biometry, home page' && br.name === 'Forest Biometry' && br.hidden && br.shapes === 5 && br.img === 0, 'top bar: Forest Biometry mark (vector shapes, aria-hidden) and wordmark; home link named');
  ok(br.icons.join() === 'favicon.ico,assets/brand/favicon.svg,assets/brand/apple-touch-icon.png', 'favicon links: ' + br.icons.join(', '));
  for (const f of br.icons) { const r = await page.request.get(BASE + '/' + f); ok(r.status() === 200 && (await r.body()).length > 200, f + ' served'); }
  const tp = await browser.newPage(); await tp.goto(BASE + '/boy-cap.php'); ok((await tp.title()) === 'Height–Diameter Modelling | Forest Biometry', 'tool page title: ' + await tp.title());
  for (const [w, name] of [[360, true], [350, true], [340, false]]) { await tp.setViewportSize({ width: w, height: 700 });
    ok(await tp.evaluate(n => { const b = document.querySelector('.b-brand').getBoundingClientRect(), t = document.querySelector('.b-tools').getBoundingClientRect(), l = document.querySelector('.b-logo').getBoundingClientRect();
      return b.right <= t.left && l.width > 20 && (getComputedStyle(document.querySelector('.b-brand-name')).display !== 'none') === n && document.querySelector('.b-brand').getAttribute('aria-label') === 'Forest Biometry, home page' && document.documentElement.scrollWidth <= innerWidth + 1; }, name),
      `phone ${w} px: ${name ? 'mark and name' : 'mark only'}, no overlap with the controls, link name kept`); }
  await tp.close(); }
const links = await page.locator('.hm-item a.hm-tool').evaluateAll(a => a.map(x => x.getAttribute('href')));
ok(links.length === N_TOOLS && N_TOOLS >= 7, `${N_TOOLS} ready tools listed: ` + links.join(', '));
for (const l of links) { const r = await page.request.get(BASE + '/' + l); ok(r.status() === 200, l + ' opens'); }
ok((await page.locator('.hm-item a.hm-tool').evaluateAll(a => a.every(x => x.querySelector('.hm-ico svg') && x.querySelector('.hm-tc').textContent.trim().length > 10 && x.querySelector('.hm-tc').textContent.length <= 90 && (x.getAttribute('title') || '').length > 40))), 'tools index: every tool a card with its icon, a short caption (≤ 90 characters) and the full description as a tooltip');
ok((await page.locator('text=/Meşcere Postası|Stand Gazette|Bulmaca/').count()) === 0, 'no trace of the gazette');
await shot('site-1-dizin');

// 2. About: name and email; ORCID only when filled in (never a made-up id)
await page.click('.b-nav a[href="hakkinda.php"]');
ok((await page.locator('dl.kv dd').first().textContent()) === 'Onur Alkan', 'About: name');
ok((await page.locator('dl.kv a[href="mailto:onuralkan@isparta.edu.tr"]').count()) === 1, 'About: email link');
const orcid = await page.locator('dl.kv dt', { hasText: 'ORCID' }).count();
const orcidLink = await page.locator('dl.kv a[href^="https://orcid.org/"]').evaluateAll(a => a.map(x => x.getAttribute('href')));
ok(orcid === 0 || /^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcidLink[0] || ''), 'About: ORCID hidden or well-formed');
ok((await page.locator('.b-nav a[aria-current]').textContent()) === 'About', 'current page marked in the navigation');
await shot('site-2-hakkinda');
// 2b. References page (APA 7), linked next to About
await page.click('.b-nav a[href="kaynakca.php"]');
{ const n = await page.locator('ol.refs > li').count(), first = await page.locator('ol.refs > li').first().textContent();
  ok(n >= 100 && (await page.locator('.b-nav a[aria-current]').textContent()) === 'References' && /\(\d{4}|n\.d\.\)/.test(first) && (await page.locator('#refs-n').count()) === 0 && !(await page.locator('ol.refs').textContent()).includes('METHODS §'), `References: ${n} sources in APA style, no usage or status notes, nav item current`);
  { const t = await page.locator('ol.refs > li').allTextContents(), k = t.map(x => x.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
    ok(k.every((x, i) => !i || k[i - 1].localeCompare(x, 'en') <= 0 || k[i - 1].slice(0, 12) === x.slice(0, 12)), 'References: in alphabetical order'); }
  ok((await page.locator('ol.refs a[href^="https://doi.org/"]').count()) > 0 && (await page.locator('#side a[href="kaynakca.php"]').count()) === 1 && (await page.locator('footer a[href="kaynakca.php"]').count()) === 1, 'References: DOI links; linked from the side menu and the footer'); }
await page.click('.b-nav a[href="hakkinda.php"]');

// 3. no language switch any more (English-only site, 20 Nov 2026); footer names the author
ok((await page.locator('#langlink').count()) === 0, 'no language link in the top bar');
ok((await page.locator('h1').textContent()).trim() === 'About' && (await page.locator('.b-foot', { hasText: 'Author and responsible person' }).count()) === 1, 'About with author in footer');

// 4. removed pages of the old personal site are gone
for (const f of ['admin.php', 'bulmaca.php', 'mescere.php', 'weibull.php', 'check.php', 'araclar/veri-denetcisi.php']) {
  const r = await page.request.get(BASE + '/' + f, { maxRedirects: 0 }); ok(r.status() === 404, f + ' is gone (' + r.status() + ')');
}
const inc = await page.request.get(BASE + '/inc/site.php'); ok(inc.status() !== 200 || (await inc.text()) === '', 'inc/site.php serves nothing');

// 5. phone + dark
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
phone.on('pageerror', e => errors.push(e.message));
for (const u of ['/', '/hakkinda.php']) {
  await phone.goto(BASE + u);
  ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal scroll on ' + u);
}
await shot('site-3-telefon-koyu', phone);

// 6. sidebar: categories, current tool, narrow mode remembered, drawer on phones; stem map labelled as illustration
await page.goto(BASE + '/araclar.php');
ok((await page.locator('#side .b-cat').count()) === N_CATS && N_CATS === 8 && (await page.locator('#side .b-live a').count()) === N_TOOLS, `sidebar: ${N_CATS} modules, ${N_TOOLS} tool pages`);
ok((await page.locator('.hm-mod').count()) === N_CATS && (await page.locator('.hm-mod[hidden], .hm-item[hidden]').count()) === 0, `home directory: ${N_CATS} modules, every tool visible without a click`);
{ const vis = () => page.$$eval('.hm-item:not([hidden]) a', a => a.map(x => x.getAttribute('href')));
  ok((await page.locator('.hm-chip[data-mod]').count()) === N_CATS + 1, 'module filters: all + one per module');
  await page.fill('#tool-q', 'STEM TAPER'); ok((await vis()).includes('govde-profili.php') && (await page.textContent('#tool-count')).includes(`of ${N_TOOLS} tools`), 'search: case ignored, count of the shown tools');
  await page.fill('#tool-q', 'zzzz'); ok(await page.isVisible('#hm-none'), 'search without a match says so');
  await page.click('#hm-reset'); await page.click('.hm-chip[data-mod="SV"]'); ok((await vis()).length === (await page.locator('.hm-mod[data-mod="SV"] .hm-item').count()) && page.url().includes('m=SV'), 'module filter, kept in the address');
  await page.click('.hm-task[data-task="agac"]'); ok((await vis()).includes('agac-olcumu.php') && (await vis()).includes('biyokutle-karbon.php') && await page.isVisible('#hm-task-note'), 'task filter across modules (guide task cards)');
  await page.click('#hm-task-clear'); await page.click('.hm-chip[data-mod=""]'); ok((await vis()).length === N_TOOLS, 'filters cleared: every tool'); }
{ const pl = CATALOG.filter(c => !c.page && c.status !== 'out'), out = CATALOG.filter(c => c.status === 'out');
  ok(new Set(CATALOG.map(c => c.id)).size === 74 && out.length === 34 && pl.length === 0, `catalogue: 74 tool ids kept, 34 out of scope (6 earlier + 27 removed on 17 Nov 2026 + SM-05), 0 planned: ${pl.map(c => c.id).join(', ')}`);
  ok(CATALOG.filter(c => c.id === 'SM-06').map(c => c.page).join() === 'model-degerlendirme.php,nispi-siralama.php', 'SM-06 model evaluation covers Model Evaluation and Relative Ranking (19 Nov 2026)');
  { const sm = await page.locator('.hm-mod[data-mod="SM"] .hm-item a').evaluateAll(a => a.map(x => x.getAttribute('href'))), i = sm.indexOf('model-degerlendirme.php');
    ok(i >= 0 && sm[i + 1] === 'nispi-siralama.php' && (await page.locator('.hm-item a[href="nispi-siralama.php"]').locator('xpath=ancestor::*[contains(@class,"hm-item")]').first().textContent()).includes('SM-06'), 'Relative Ranking stands right after Model Evaluation and carries SM-06: ' + sm.join(' ')); }
  ok(['GY', 'ML', 'DS'].every(m => !CATALOG.some(c => c.id.startsWith(m + '-') && c.status !== 'out')) && (await page.locator('#side .b-group[data-mod="GY"], #side .b-group[data-mod="ML"], #side .b-group[data-mod="DS"], .hm-mod[data-mod="GY"]').count()) === 0, 'modules left without a tool (GY, ML, DS) are not listed');
  ok((await page.locator('#side .b-pl').count()) === pl.length && (await page.locator('#side .b-pl a').count()) === 0 && (await page.locator('.hm-planned').count()) === pl.length && (await page.locator('.hm-planned a').count()) === 0 && (await page.locator('.hm-planned .hm-badge').count()) === pl.length, `${pl.length} planned tools greyed in the sidebar and the directory, without links`);
  const titles = await page.locator('#side .b-pl .b-planned').evaluateAll(a => a.map(x => x.getAttribute('title')));
  ok(!out.some(c => titles.some(t => t.startsWith(c.id + ' '))), 'out-of-scope tools are not shown');
  ok(CATALOG.filter(c => c.page).every(c => TOOL_IDS.includes(c.page.replace('.php', ''))), 'every catalogue page exists in site_tools()'); }
await page.goto(BASE + '/ornekleme.php');   // the sidebar beside the content: tool pages
{ const g = page.locator('#side .b-group[data-mod="TM"]'), b = g.locator('.b-cat');
  const was = await b.getAttribute('aria-expanded'); await b.click();
  ok((await b.getAttribute('aria-expanded')) !== was && (await g.evaluate(x => x.classList.contains('collapsed'))) === (was === 'true'), 'a module opens and closes from its heading');
  await page.reload(); ok((await page.locator('#side .b-group[data-mod="TM"] .b-cat').getAttribute('aria-expanded')) !== was, 'the state of the module is remembered in this browser'); }
await page.goto(BASE + '/araclar.php');
{ // tools index: no decorative showcase or tool-count figures; module filters count the tools of each module
  ok((await page.locator('.hz-show, .hz-stats').count()) === 0, 'no decorative showcase or tool-count figures on the home page');
  const counts = await page.locator('.hm-chip[data-mod]:not([data-mod=""])').evaluateAll(cs => cs.map(c => [c.dataset.mod, +c.querySelector('span').textContent]));
  const real = await page.locator('.hm-mod').evaluateAll(ms => ms.map(m => [m.dataset.mod, m.querySelectorAll('.hm-item:not(.hm-planned)').length]));
  ok(JSON.stringify(counts) === JSON.stringify(real), 'module filters show the number of tools of each module: ' + counts.map(c => c.join(' ')).join(', ')); }
// language (20 Nov 2026, user decision): the site is English only, whatever the parameters, the browser language or an
// old language cookie; old Turkish links (?lang=tr) are sent with a 301 to the same page without the parameter
{ const c0 = await browser.newContext(), q0 = await c0.newPage();
  await q0.goto(BASE + '/'); ok(await q0.getAttribute('html', 'lang') === 'en', 'html lang is en without parameters');
  await c0.close();
  const c = await browser.newContext({ locale: 'tr-TR', extraHTTPHeaders: { 'Accept-Language': 'tr-TR,tr;q=0.9' } }), q = await c.newPage();
  await q.goto(BASE + '/'); ok(await q.getAttribute('html', 'lang') === 'en', 'English for a Turkish browser');
  await c.addCookies([{ name: 'lang', value: 'tr', url: BASE }]);
  await q.goto(BASE + '/boy-cap.php'); ok(await q.getAttribute('html', 'lang') === 'en', 'English with an old lang=tr cookie');
  ok((await q.locator('#langlink').count()) === 0, 'no language link on a tool page');
  const r = await q.request.get(BASE + '/boy-cap.php?lang=tr&x=1', { maxRedirects: 0 });
  ok(r.status() === 301 && new URL(r.headers()['location'], BASE).pathname + new URL(r.headers()['location'], BASE).search === '/boy-cap.php?x=1', `?lang=tr answers 301 to the page without the parameter (${r.status()} ${r.headers()['location']})`);
  await q.goto(BASE + '/boy-cap.php?lang=tr'); ok(new URL(q.url()).search === '' && await q.getAttribute('html', 'lang') === 'en', 'an old Turkish link lands on the English page: ' + q.url());
  await c.close(); }
await page.click('.hm-item a[href="boy-cap.php"]'); await page.waitForURL(/boy-cap/);
ok((await page.locator('#side a[aria-current="page"]').getAttribute('href')) === 'boy-cap.php' && (await page.locator('.b-headico svg').count()) === 1, 'current tool marked in the sidebar, icon in the page head');
await page.click('#sidenarrow'); await page.reload();
ok(await page.evaluate(() => document.documentElement.classList.contains('side-narrow')) && (await page.locator('#sidenarrow').getAttribute('aria-pressed')) === 'true', 'narrow sidebar remembered after reload');
await page.click('#sidenarrow');
const ph = await browser.newPage({ viewport: { width: 390, height: 844 } });
ph.on('pageerror', e => errors.push(e.message));
await ph.goto(BASE + '/ornekleme.php');
ok(!(await ph.locator('#side').isVisible()) && (await ph.locator('#navopen').isVisible()), 'phone: sidebar hidden, menu button shown');
await ph.click('#navopen'); await ph.waitForTimeout(300);
ok(await ph.locator('#side').isVisible() && (await ph.locator('#navopen').getAttribute('aria-expanded')) === 'true', 'phone: menu opens the drawer');
await ph.keyboard.press('Escape'); await ph.waitForTimeout(300);
ok(!(await ph.locator('#side').isVisible()) && (await ph.locator('#scrim').isHidden()), 'phone: Escape closes the drawer');
await ph.click('#navopen'); await ph.waitForTimeout(300); await ph.click('#side a[href="cap-dagilimi.php"]'); await ph.waitForURL(/cap-dagilimi/);
ok(!(await ph.locator('#side').isVisible()), 'phone: following a link leaves the drawer closed on the new page');
ok(await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal scroll with the sidebar');

// 7. cite dialog: tool by default on a tool page, platform on the home page; no citation-language choice; date, copy, .bib download
const cp = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
const cpg = await cp.newPage(); cpg.on('pageerror', e => errors.push(e.message));
await cpg.goto(BASE + '/boy-cap.php'); await cpg.click('#citebtn');
await cpg.waitForSelector('#citedlg[open] .cite-row');
ok((await cpg.locator('#citedlg .cite-row').count()) === 8 && await cpg.isChecked('input[name="cscope"][value="tool"]') && (await cpg.locator('input[name="clang"]').count()) === 0, 'cite: 8 formats, this tool chosen by default, no citation-language choice');
const apa0 = await cpg.locator('.cite-row[data-f="apa"] .cite-text').textContent();
ok(apa0.startsWith('Alkan, O. (2026). Height–Diameter Modelling (Version 1.1.1) [Web application].') && apa0.includes('https://forestbiometry.online/boy-cap.php'), 'cite: APA with version and URL: ' + apa0);
ok((await cpg.locator('.cite-row[data-f="apa"] .cite-text i').textContent()) === 'Height–Diameter Modelling', 'cite: title in italics');
await cpg.fill('#cdate', '2026-03-05'); await cpg.locator('#cdate').dispatchEvent('change');
const apaEN = await cpg.locator('.cite-row[data-f="apa"] .cite-text').textContent();
ok(apaEN.includes('Height–Diameter Modelling (Version 1.1.1) [Web application]') && apaEN.includes('Retrieved March 5, 2026'), 'cite: chosen access date');
await cpg.click('.cite-row[data-f="apa"] [data-copy]');
await cpg.waitForFunction(() => document.querySelector('.cite-row[data-f="apa"] [data-copy]').textContent !== document.querySelector('.cite-row[data-f="mla"] [data-copy]').textContent, null, { timeout: 5000 }).catch(() => {});   // wait for the async write
{ const cb = await cpg.evaluate(() => navigator.clipboard.readText()); ok(cb === apaEN, 'cite: copy puts the citation on the clipboard: ' + JSON.stringify(cb).slice(0, 80)); }
const [bd] = await Promise.all([cpg.waitForEvent('download'), cpg.click('[data-dl="bibtex"]')]);
const bibt = await readFile(await bd.path(), 'utf8');
ok(bd.suggestedFilename() === 'boy-cap-en.bib' && bibt.startsWith('@misc{alkan2026boycap,') && bibt.includes('urldate      = {2026-03-05}'), 'cite: .bib download');
await cpg.check('input[name="cscope"][value="platform"]');
ok((await cpg.locator('.cite-row[data-f="apa"] .cite-text').textContent()).startsWith('Alkan, O. (2026). Forest Biometrics Tools [Web application].'), 'cite: whole platform');
await cpg.keyboard.press('Escape'); ok(!(await cpg.locator('#citedlg').evaluate(d => d.open)), 'cite: Escape closes the dialog');
await cpg.goto(BASE + '/'); await cpg.click('#citebtn'); await cpg.waitForSelector('#citedlg[open] .cite-row');
ok((await cpg.locator('input[name="cscope"]').count()) === 0 && (await cpg.locator('.cite-row[data-f="apa"] .cite-text').textContent()).startsWith('Alkan, O. (2026). Forest Biometrics Tools [Web application].'), 'cite: home page cites the platform');
await cpg.goto(BASE + '/hakkinda.php');
ok((await cpg.locator('#cite-inline').textContent()).startsWith('Alkan, O. (2026). Forest Biometrics Tools [Web application].'), 'About: platform citation shown');
await cp.close();

// user guide: start page with task cards and a section tree; one page per section; old #links
for (const l of ['en']) {
  await page.goto(BASE + '/kilavuz.php');
  const nav = await page.$$eval('.guide-toc .guide-grp a', as => as.map(a => new URL(a.href).searchParams.get('k')));
  ok(nav.length === TOOL_IDS.length + 3 && nav[0] === 'genel' && nav[1] === 'is-akisi' && nav[2] === 'sorun-giderme' && TOOL_IDS.every(id => nav.includes(id)), `guide (${l}): the section tree holds general, workflow and every tool: ` + nav);
  const cardLinks = await page.$$eval('.gcards a', as => as.map(a => new URL(a.href).searchParams.get('k')));
  ok(await page.locator('.gcard').count() >= 5 && TOOL_IDS.every(id => cardLinks.includes(id)), `guide (${l}): task cards on the start page reach every tool`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `guide (${l}): no horizontal scroll`);
  ok(await page.locator('.guide-body p.note a[href="kilavuz.php?k=sorun-giderme"]').count() === 1, `guide (${l}): the start page points to troubleshooting (QUIC)`);
  for (const id of ['genel', 'sorun-giderme', ...TOOL_IDS]) {
    const r = await page.request.get(`${BASE}/kilavuz.php?k=${id}`), t = await r.text();
    ok(r.status() === 200 && t.includes(`<h2 id="${id}"`) && (t.match(/class="card guide-sec"/g) || []).length === 1 && t.includes(`rel="canonical" href="https://forestbiometry.online/kilavuz.php?k=${id}"`), `guide (${l}): page of ${id} holds only its section, with its own canonical address`);
  }
}
await page.goto(BASE + '/kilavuz.php?k=nope'); ok(await page.locator('#guide-unknown').count() === 1 && await page.locator('.gcard').count() >= 5, 'unknown section: a note and the start page');
await page.goto(BASE + '/kilavuz.php'); await page.fill('#guide-find', 'STEM'); ok(await page.locator('.guide-toc li:not([hidden]) a').count() >= 1 && (await page.locator('.guide-toc li:not([hidden]) a').allTextContents()).every(t => /stem/i.test(t)), 'section search ignores case');
ok((await page.locator('.b-nav a[href="kilavuz.php"]').count()) === 1 && (await page.locator('.b-side-foot a[href="kilavuz.php"]').count()) === 1, 'guide in the top menu and the sidebar');
await page.goto(BASE + '/boy-cap.php');
{ const hd = await page.$eval('.b-head', e => ({ box: e.classList.contains('b-toolhead'), meta: e.querySelector('.b-meta').textContent.trim(), kick: !!e.querySelector('.b-kicker'), ids: e.getAttribute('data-ids'), text: e.textContent }));
  ok(hd.box && /^version \S+\s*Guide$/.test(hd.meta) && !hd.kick && hd.ids && !hd.text.includes(hd.ids) && !hd.text.includes('Modelling and evaluation'), 'tool head: box with title, "version … · Guide" and the description; no tool ids, module or kicker shown: ' + hd.meta); }
await page.click('.b-head .b-guide'); await page.waitForURL(/kilavuz\.php\?k=boy-cap$/);
ok(await page.locator('h2#boy-cap').count() === 1 && await page.locator('.guide-toc a[aria-current="page"]').getAttribute('href') === 'kilavuz.php?k=boy-cap', 'tool header link opens the tool\'s guide page, marked in the tree');
await page.goto(BASE + '/kilavuz.php#ornekleme'); await page.waitForURL(/k=ornekleme/); ok(await page.locator('h2#ornekleme').count() === 1, 'an old link kilavuz.php#id is sent on to its page');
await page.click('.guide-sec a.guide-open[href="ornekleme.php"]'); ok(page.url().includes('/ornekleme.php'), 'the guide links back to each tool');
await page.goto(BASE + '/kilavuz.php?k=genel'); await page.click('.guide-pager a[rel="next"]'); await page.waitForURL(/k=is-akisi/); ok(true, 'next-section link');

// module loading: every script and style of every page carries a version tag (import map from inc/site.php), so that
// versioned files can be cached for long; a module missing from the graph would be requested without a tag
{ const site = (await import('node:fs')).readFileSync(new URL('../../inc/site.php', import.meta.url), 'utf8');
  const files = ['', 'araclar.php', 'kilavuz.php', 'hakkinda.php', 'kaynakca.php', ...[...site.matchAll(/'file' => '([a-z-]+\.php)', 'v' =>/g)].map(m => m[1])];
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

// contrast (20 Nov 2026): button texts and small texts of the home page and the reset buttons, light and dark, ≥ 4.5:1
{ const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  for (const scheme of ['light', 'dark']) { const p = await c.newPage(); await p.emulateMedia({ colorScheme: scheme });
    const bad = [];
    for (const [u, sel] of [['/', '.hp-all, .hp-data, .hp-group p, .hp-group h3, .hp-group a, .hp-sci li p, .hp-tasks a, .hp-qlabel, .hp-keep'], ['/boy-cap.php', '#reset, .b-resetall, .b-nav a, .b-meta .b-ver, .b-meta .b-guide, .b-toolhead .b-lede']]) {
      await p.goto(BASE + u); await p.waitForSelector(sel.split(',')[0]);
      await p.evaluate(() => { const b = document.querySelector('.b-resetall'); if (b) b.disabled = false; });
      bad.push(...await p.evaluate(sel => {
        const rgb = c => (c.match(/[\d.]+/g) || []).map(Number), lum = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
        const bg = e => { for (let x = e; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c.length === 3 || c[3] > .5) return c.slice(0, 3); } return [255, 255, 255]; };
        return [...document.querySelectorAll(sel)].map(e => { const a = lum(rgb(getComputedStyle(e).color)), b = lum(bg(e)), r = (Math.max(a, b) + .05) / (Math.min(a, b) + .05); return [e.className || e.id || e.tagName, Math.round(r * 100) / 100]; }).filter(x => x[1] < 4.5);
      }, sel).then(x => x.map(y => `${scheme} ${u} ${y.join(' ')}`))); }
    ok(!bad.length, `contrast ≥ 4.5:1 (${scheme}): home texts, primary and reset buttons` + (bad.length ? ': ' + bad.join('; ') : ''));
    await p.close(); }
  await c.close(); }

// 8. full reset of the site in this browser (MR-003; on the tool pages, a factory reset since 20 Nov 2026, user
//    decision): a red button next to every tool's own "Reset session"; after the confirmation every tool session, every
//    data package (active or not), every coefficient set and the preferences are gone; cancelling changes nothing; the
//    open tool does not write anything back; after the reload the tool is in its starting state
{ const c = await browser.newContext({ viewport: { width: 1280, height: 900 } }), h = await c.newPage(); h.on('pageerror', e => errors.push(e.message));
  await h.goto(BASE + '/boy-cap.php'); await h.waitForSelector('.b-resetall');
  const kv = (op, ...a) => h.evaluate(async ([op, a]) => { const s = await import('./assets/lab/core/store.js'); return s[op](...a); }, [op, a]);
  const ds = { schema: 'forest-dataset/1', created: '2026-11-20T10:00:00Z', trees: [], plots: [] };
  await kv('put', 'session:test-a', { v: 1 }); await kv('put', 'session:test-b', { v: 1 });
  await kv('put', 'project:test', { schema: 'forest-project/1', id: 'test', name: 'Test package', dataset: ds }); await kv('put', 'project:active', 'test'); await kv('put', 'dataset:approved', ds);
  await kv('put', 'project:keep', { schema: 'forest-project/1', id: 'keep', name: 'Other package', dataset: ds }); await kv('put', 'coef:test', { schema: 'model-coef/1', id: 'test' });
  await h.evaluate(() => { localStorage.setItem('theme', 'light'); localStorage.setItem('sideMods', '{"TM":0}'); localStorage.setItem('side', 'wide'); });
  await h.reload(); await h.click('#sample'); await h.waitForSelector('#impbox .fname');
  await h.waitForFunction(() => document.querySelector('.b-resetall').textContent === 'Delete all data and reset the site' && !document.querySelector('.b-resetall').disabled);
  await h.waitForTimeout(300); const all0 = await kv('keys', '');
  const pos = await h.evaluate(() => { const r = document.getElementById('reset'), a = document.querySelector('.b-resetall'), rr = r.getBoundingClientRect(), ar = a.getBoundingClientRect();
    return { group: r.parentElement === a.parentElement && r.nextElementSibling === a, side: Math.abs(rr.top - ar.top) < 2 && ar.left > rr.right && ar.left - rr.right < 20, bg: getComputedStyle(a).backgroundColor, n: document.querySelectorAll('.b-resetall').length }; });
  ok(pos.group && pos.side && pos.n === 1 && pos.bg === 'rgb(209, 36, 47)', `tool page: one red button right of "Reset session" in the same group (${pos.bg})`);
  // cancel: nothing changes
  let msg = ''; h.once('dialog', d => { msg = d.message(); d.dismiss(); }); await h.click('.b-resetall'); await h.waitForTimeout(200);
  ok(['state of its first visit', 'all tools (3)', 'Inventory Data Manager (2)', 'the active package "Test package" included', 'Coefficient Library (1)', 'theme', 'cannot be undone', 'download backups', 'another tab', 'the language stay'].every(x => msg.includes(x)),
    'confirmation: sessions, packages (active by name), coefficient sets, preferences, what stays, backups, other tabs, cannot be undone');
  ok(JSON.stringify(await kv('keys', '')) === JSON.stringify(all0) && await h.evaluate(() => localStorage.getItem('theme') === 'light') && await h.locator('#impbox .fname').count() === 1, 'cancelled: nothing changed');
  // the tool's own reset: only its own session
  const hdKey = all0.find(k => k.startsWith('session:') && !k.startsWith('session:test-'));
  await h.click('#reset'); await h.waitForTimeout(300);
  const k1 = await kv('keys', '');
  ok(!k1.includes(hdKey) && k1.length === all0.length - 1, `"Reset session" deletes only this tool's session (${hdKey})`);
  // full reset, from a tool with loaded data that autosaves
  await h.click('#sample'); await h.waitForSelector('#impbox .fname'); await h.waitForTimeout(300);
  h.once('dialog', d => d.accept()); await Promise.all([h.waitForEvent('load'), h.click('.b-resetall')]);
  await h.waitForSelector('#resetall-done'); await h.waitForTimeout(500);
  const k2 = await kv('keys', '');
  ok(k2.length === 0 && (await h.locator('#impbox .fname').count()) === 0, 'full reset: nothing left in the site store (sessions, packages, active package, coefficient sets); the open tool wrote nothing back and opens in its starting state: ' + k2.join(','));
  ok(await h.evaluate(() => localStorage.getItem('theme') === null && localStorage.getItem('side') === null && localStorage.getItem('sideMods') === null && JSON.parse(localStorage.getItem('recentTools') || '[]').join() === 'boy-cap.php'),
    'full reset: preferences gone (recent tools start again with this page)');
  ok((await h.textContent('#resetall-done')).includes('The site was reset') && await h.isDisabled('.b-resetall'), 'after the reload: a note; nothing left to delete, so the button is disabled');
  await h.goto(BASE + '/pano.php'); await h.waitForSelector('#srccard');
  ok(await h.locator('#srcnone').count() === 1 && await h.locator('#panels').count() === 0, 'Data Visualization after the reset: no package left to show');
  await h.goto(BASE + '/katsayi-kutuphanesi.php'); await h.waitForSelector('.b-resetall'); await h.waitForTimeout(400);
  ok(!(await h.textContent('#main')).includes('test') || (await kv('keys', 'coef:')).length === 0, 'Coefficient Library after the reset: no set left');
  await h.goto(BASE + '/boy-cap.php'); await h.waitForSelector('.b-resetall');
  ok((await h.textContent('.b-resetall')) === 'Delete all data and reset the site' && (await h.textContent('#reset')) === 'Reset session', 'button labels');
  // every tool page of the catalogue: exactly one bulk button; next to "Reset session" where the tool has one, else at the end of the page
  const where = [];
  for (const id of TOOL_IDS) { await h.goto(`${BASE}/${id}.php`); await h.waitForSelector('.b-resetall', { timeout: 10000 }).catch(() => {});
    await h.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});   // tools that draw #reset after loading (Diameter Distribution) under a loaded test run
    where.push([id, await h.evaluate(() => { const r = document.getElementById('reset'), a = document.querySelectorAll('.b-resetall');
      return a.length !== 1 ? 'missing' : r ? (r.nextElementSibling === a[0] ? 'next' : 'apart') : a[0].parentElement.classList.contains('b-resetrow') ? 'end' : 'other'; })]); }
  ok(where.every(([, w]) => w === 'next' || w === 'end') && where.filter(([, w]) => w === 'next').length >= 19, 'every tool page has the bulk reset: ' + where.map(w => w.join(' ')).join(', '));
  // phone: the two buttons stay in one group, texts not cut
  await h.setViewportSize({ width: 360, height: 780 }); await h.goto(BASE + '/boy-cap.php'); await h.waitForSelector('.b-resetall');
  ok(await h.evaluate(() => { const g = document.querySelector('.b-resetgrp'), bs = [...g.querySelectorAll('.btn')];
    return bs.length === 2 && bs.every(b => b.scrollWidth <= b.clientWidth + 1 && b.getBoundingClientRect().right <= innerWidth) && document.documentElement.scrollWidth <= innerWidth + 1; }), 'phone: both reset buttons in one group, texts not cut, no horizontal scroll');
  await c.close(); }

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`site e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
