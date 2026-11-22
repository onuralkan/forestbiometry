// Browser test of the accounts (21–22 Nov 2026): ORCID sign-in (mock), approval by the administrator, monthly quota,
// the interpretation card in Model Evaluation (Claude mocked), the account's library (interpretations saved
// automatically, "Save to my account", raw data refused, owner only, storage limit, export), the top-bar menu, the
// backup script, form tokens, deleting an account, the administration panel (yonetim.php: limits, reset, temporary block,
// pause, announcement, sign-up modes, deletion, audit log), and the site without the service. Starts its own PHP server with a throw-away private folder (FB_PRIVATE): the mock settings
// never exist on a real server. The BASE argument (the suite's server, without the service) is used for the last check.
// Usage: node tests/account/e2e.mjs http://127.0.0.1:8092
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile, cp } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE0 = process.argv[2] || 'http://127.0.0.1:8092';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];

const ADMIN = '0000-0001-5798-3421', USER = '0000-0002-1825-0097';
const priv = await mkdtemp(path.join(os.tmpdir(), 'fb-private-'));
await writeFile(path.join(priv, 'config.php'), `<?php return ['anthropic_mock' => true, 'orcid_mock' => true, 'admin_orcid' => '${ADMIN}', 'monthly_quota' => 2, 'per_minute' => 10, 'max_results' => 3];\n`);
const port = await new Promise(r => { const srv = net.createServer(); srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => r(p)); }); }), BASE = `http://127.0.0.1:${port}`;
const php = spawn('php', ['-S', `127.0.0.1:${port}`], { cwd: root, env: { ...process.env, FB_PRIVATE: priv }, stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/hesap.php'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());   // the tool's reset and the account deletion ask for confirmation
  const signIn = async (id, name) => { await page.goto(`${BASE}/auth/orcid.php?mock=${id}&name=${encodeURIComponent(name)}`); await page.waitForURL(/hesap\.php/); };
  const signOut = async () => { await page.goto(BASE + '/hesap.php'); await page.click('#acc-signout'); await page.waitForSelector('#acc-signin'); };
  const runEval = async () => {
    await page.goto(BASE + '/model-degerlendirme.php');
    if (await page.locator('#steps [data-go="1"]').isEnabled()) await page.click('#steps [data-go="1"]');
    await page.click('#reset');
    await page.locator('#impbox details summary').click();
    await page.fill('#impbox textarea', 'obs\tm1\n10\t11\n12\t11.5\n14\t15\n9\t9.5\n11\t10\n13\t12.2');
    await page.click('#impbox [data-act="paste"]'); await page.waitForSelector('#impbox .fname');
    await page.click('#to2'); await page.selectOption('#obs', { label: 'obs' }); await page.check('[data-mc="1"]');
    if (!(await page.isChecked('input[name="dec"][value="."]'))) await page.check('input[name="dec"][value="."]');
    await page.click('#calc'); await page.waitForSelector('#panel table');
    await page.waitForSelector('.ai-card');
  };

  // 1. signed out: sign-in link in the top bar, the card asks to sign in, the API refuses
  await page.goto(BASE + '/hesap.php');
  ok((await page.textContent('#acctlink')).trim() === 'Sign in' && await page.isVisible('#acc-signin'), 'signed out: "Sign in" in the top bar and on the Account page');
  await runEval();
  ok(await page.isVisible('#ai-signin') && (await page.getAttribute('#ai-signin', 'href')).startsWith('auth/orcid.php?back=model-degerlendirme.php'), 'signed out: the card offers ORCID sign-in and comes back to the tool');
  ok((await page.evaluate(async () => (await fetch('api/interpret.php', { method: 'POST', body: '{}' })).status)) === 401, 'API without an account: 401');
  ok(await ctx.cookies().then(c => !c.some(x => x.name === 'fbsess')), 'no session cookie for a visitor who did not sign in');

  // 2. a new account is pending; the tool works, the card says so
  await signIn(USER, 'Test Researcher');
  ok((await page.textContent('#acc-status')).includes('Waiting for approval') && await page.isVisible('#acc-pending') && (await page.textContent('#acctlink')).trim() === 'Account', 'first sign-in: account waiting for approval');
  await runEval();
  ok(await page.isVisible('#ai-pending') && !(await page.isVisible('#ai-go')), 'pending account: no interpretation button');
  const st = await page.evaluate(async () => (await fetch('api/interpret.php')).json());
  const pend = await page.evaluate(async t => { const r = await fetch('api/interpret.php', { method: 'POST', headers: { 'X-CSRF': t, 'Content-Type': 'application/json' }, body: JSON.stringify({ tool: 'model-degerlendirme', summary: {} }) }); return [r.status, (await r.json()).error]; }, st.csrf);
  ok(pend[0] === 403 && pend[1] === 'pending', 'API for a pending account: 403 pending');
  await signOut();

  // 3. the administrator approves the account
  await signIn(ADMIN, 'Site Author');
  ok((await page.textContent('#acc-status')).includes('administrator'), 'administrator: approved at once');
  await page.click('#tab-admin'); await page.waitForURL(/yonetim\.php/);
  ok(await page.isVisible('#adm-stats') && await page.isVisible('#adm-backup'), 'administrator: the panel overview shows the counts and the backup');
  const row = page.locator(`#adm-wait tr[data-orcid="${USER}"]`);
  ok((await row.count()) === 1 && (await page.textContent('#adm-tab-accounts')).includes('1 waiting'), 'the new account is listed as waiting');
  await row.locator('[data-quick="approved"]').click(); await page.waitForSelector('#adm-done');
  ok(await page.isVisible('#adm-nowait'), 'approved from the overview; nobody waits');
  await page.goto(BASE + '/yonetim.php?view=accounts');
  ok((await page.locator(`#adm-list tr[data-orcid="${USER}"]`).textContent()).includes('Approved'), 'approved by the administrator');
  await signOut();

  // 4. approved: interpretation (Claude mocked), quota of 2, then used up
  await signIn(USER, 'Test Researcher');
  await runEval();
  ok((await page.textContent('#ai-left')).includes('2 of 2'), 'approved: 2 of 2 left');
  const sent = [];
  page.on('request', r => { if (r.url().endsWith('api/interpret.php') && r.method() === 'POST') sent.push(JSON.parse(r.postData())); });
  await page.click('#ai-go'); await page.waitForSelector('.ai-text');
  ok((await page.textContent('.ai-text')).includes('Mock interpretation of Model Evaluation') && await page.locator('.ai-text h4').count() === 4 && (await page.textContent('#ai-left')).includes('1 of 2'), 'interpretation shown with its headings; 1 of 2 left');
  ok(sent.length === 1 && sent[0].tool === 'model-degerlendirme' && sent[0].summary.models[0].overall.rmse > 0 && !JSON.stringify(sent[0]).includes('"rows":[[') && !('inputs' in sent[0].summary), 'what is sent: the result summary of the run record, no rows or input files');
  await page.click('#tab-charts'); await page.click('#tab-summary'); await page.waitForSelector('.ai-text');
  ok((await page.textContent('#ai-go')).includes('Interpret again'), 'the interpretation stays after switching tabs');
  await page.click('#ai-go'); await page.waitForFunction(() => /0 of 2/.test(document.getElementById('ai-left').textContent));
  ok(await page.isDisabled('#ai-go'), 'quota used up: the button is disabled');
  const st2 = await page.evaluate(async () => (await fetch('api/interpret.php')).json());
  const over = await page.evaluate(async t => { const r = await fetch('api/interpret.php', { method: 'POST', headers: { 'X-CSRF': t, 'Content-Type': 'application/json' }, body: JSON.stringify({ tool: 'model-degerlendirme', summary: { a: 1 } }) }); return [r.status, (await r.json()).error]; }, st2.csrf);
  ok(over[0] === 429 && over[1] === 'quota' && st2.used === 2 && st2.quota === 2, 'API past the quota: 429 quota');
  const noTok = await page.evaluate(async () => (await fetch('api/interpret.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"tool":"model-degerlendirme","summary":{}}' })).status);
  ok(noTok === 403, 'API without the form token: 403');
  const badTool = await page.evaluate(async t => (await fetch('api/interpret.php', { method: 'POST', headers: { 'X-CSRF': t, 'Content-Type': 'application/json' }, body: '{"tool":"nope","summary":{}}' })).status, st2.csrf);
  ok(badTool === 400, 'API for a tool not on the list: 400');
  await page.goto(BASE + '/hesap.php');
  ok((await page.textContent('#acc-used')).includes('2 of 2'), 'Account page: 2 of 2 used');

  // 5. the library: interpretations saved automatically, results saved from the tool, owner only, limits, export
  await page.click('#tab-interpretations');
  ok(await page.locator('#int-list li').count() === 2, 'both interpretations are kept in the account');
  await page.locator('#int-list li a').first().click();
  ok((await page.textContent('#int-text')).includes('Mock interpretation') && await page.locator('#int-result').count() === 0, 'an interpretation opens with its text (no saved result yet)');
  await runEval(); await page.click('#tab-export');
  ok(await page.isVisible('.rec-save'), 'approved account: "Save to my account" next to the JSON button');
  await page.check('[data-rec-embed]');   // even with "include the input data" checked, the saved record carries none
  const saved = page.waitForResponse(r => r.url().endsWith('api/library.php') && r.request().method() === 'POST');
  await page.click('.rec-save'); const sr = await (await saved).json();
  await page.waitForSelector('.rec-save-msg.ok');
  ok(sr.id && sr.storage.results === 1, 'the result is saved to the account');
  await page.uncheck('[data-rec-embed]');
  const lib = await page.evaluate(async id => (await fetch('api/library.php?result=' + id)).json(), sr.id);
  ok(lib.record.format === 'run-record/1' && lib.record.inputs.every(i => !('data' in i)) && lib.interpretations.length === 2, 'saved record: no input data, linked to the two interpretations of the same result');
  const tok = (await page.evaluate(async () => (await fetch('api/interpret.php')).json())).csrf;
  const post = (b, t = tok) => page.evaluate(async ([b, t]) => { const r = await fetch('api/library.php', { method: 'POST', headers: { 'X-CSRF': t, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return [r.status, await r.json()]; }, [b, t]);
  const raw = await post({ act: 'save', record: { ...lib.record, inputs: [{ role: 'data', sha256: 'x', data: 'obs\n1' }] } });
  ok(raw[0] === 422 && raw[1].error === 'raw-data', 'a record with input data is refused (422 raw-data)');
  ok((await post({ act: 'save', record: lib.record }, 'bad'))[0] === 403, 'saving without the form token: 403');
  ok((await post({ act: 'save', record: { format: 'other' } }))[0] === 400, 'not a run record: 400');
  await post({ act: 'save', record: lib.record }); await post({ act: 'save', record: lib.record });
  const full = await post({ act: 'save', record: lib.record });
  ok(full[0] === 409 && full[1].error === 'storage-full', 'storage limit (3 results in this test): 409 storage-full');
  await page.goto(BASE + '/hesap.php?tab=results');
  ok(await page.locator('#res-list tbody tr').count() === 3, 'Saved results tab lists 3 results');
  await page.goto(`${BASE}/hesap.php?tab=results&id=${sr.id}`);
  await page.waitForSelector('#res-view[data-kind]');
  ok((await page.getAttribute('#res-view', 'data-kind')) === 'tool' && await page.isVisible('#rv-measures') && await page.locator('#res-view figure.chartbox svg').count() >= 2, 'saved result shown as in the tool: measures table and charts');
  await page.waitForFunction(() => document.getElementById('rv-seal').textContent !== '');
  ok((await page.textContent('#rv-measures')).includes('m1') && (await page.textContent('#rv-seal')).includes('Seal holds'), 'the view shows the saved numbers; the seal holds');
  ok(!(await page.isVisible('#res-body')), 'the JSON is folded away');
  const svgDl = page.waitForEvent('download'); await page.locator('#res-view figure.chartbox button').first().click(); ok((await svgDl).suggestedFilename().endsWith('.svg'), 'charts download as SVG');
  await page.click('#res-editbox summary');
  await page.fill('#res-title', 'Pilot evaluation'); await page.fill('#res-note', 'first test'); await page.click('#res-save');
  await page.waitForSelector('#h-res');
  ok((await page.textContent('#h-res')).includes('Pilot evaluation') && (await page.textContent('#res-notetext')).includes('first test') && await page.locator('#res-ints a').count() === 2 && (await page.textContent('#res-body')).includes('run-record/1'), 'result page: title and note edited, interpretations and the record shown');
  // a tool without its own view: the generic view of its tables
  const gen = await post({ act: 'delete', kind: 'result', id: (await page.evaluate(async () => (await fetch('api/library.php?list=results')).json())).items.find(x => x.title !== 'Pilot evaluation').id });
  const g2 = await post({ act: 'save', record: { format: 'run-record/1', tool: { id: 'example-tool', version: '1.0.0' }, created: '2026-11-22T10:00:00Z', inputs: [], settings: { response: 'h' }, fits: [{ id: 'naslund', status: 'ok', rmse: 1.2 }] } });
  await page.goto(`${BASE}/hesap.php?tab=results&id=${g2[1].id}`); await page.waitForSelector('#res-view[data-kind]');
  ok(gen[0] === 200 && (await page.getAttribute('#res-view', 'data-kind')) === 'generic' && (await page.textContent('#res-view')).includes('naslund') && (await page.textContent('#rv-seal')) === '', 'other tools: the generic view lists the record\'s tables (an unsealed record shows no seal line)');
  const dl = page.waitForEvent('download'); await page.click('#res-download'); ok((await dl).suggestedFilename().startsWith('example-tool-'), 'the saved record downloads as JSON');
  const ex = await page.evaluate(async () => (await fetch('api/library.php?export=1')).json());
  ok(ex.format === 'forest-biometry-account-export/1' && ex.results.length === 3 && ex.interpretations.length === 2 && ex.account.orcid === USER, 'export: everything the account keeps');
  // the top-bar menu
  await page.click('#acctlink');
  ok(await page.isVisible('#acctmenu') && (await page.getAttribute('#acctlink', 'aria-expanded')) === 'true' && (await page.textContent('#acctquota')).includes('2 of 2'), 'top-bar menu opens with name and use');
  await page.keyboard.press('Escape');
  ok(!(await page.isVisible('#acctmenu')) && (await page.getAttribute('#acctlink', 'aria-expanded')) === 'false', 'Escape closes the menu');
  await page.click('#acctlink'); await page.click('#acctmenu a[href="hesap.php?tab=interpretations"]'); await page.waitForSelector('#int-list');
  ok(page.url().includes('tab=interpretations'), 'menu link opens My interpretations');
  // owner only: the administrator cannot open another account's item through the library
  await signOut(); await signIn(ADMIN, 'Site Author');
  ok((await page.evaluate(async id => (await fetch('api/library.php?result=' + id)).status, sr.id)) === 404, 'another account cannot open the result (404)');
  await page.goto(`${BASE}/hesap.php?tab=results&id=${sr.id}`); ok(await page.isVisible('#res-none'), 'nor through the Account page');
  // the backup script (cron)
  const bk = spawnSync('php', ['inc/backup.php'], { cwd: root, env: { ...process.env, FB_PRIVATE: priv }, encoding: 'utf8' });
  ok(bk.status === 0 && readdirSync(path.join(priv, 'backups')).some(f => /^fb-\d{4}-\d{2}-\d{2}\.sqlite\.gz$/.test(f)), 'backup script writes a compressed copy: ' + bk.stdout + bk.stderr);
  // as cron runs it on the host: no FB_PRIVATE, the private folder next to the site folder (DOCUMENT_ROOT is '' on the CLI)
  { const lay = await mkdtemp(path.join(os.tmpdir(), 'fb-host-')), web = path.join(lay, 'public_html'), pv = path.join(lay, 'forestbiometry-private');
    await cp(path.join(root, 'inc'), path.join(web, 'inc'), { recursive: true }); await cp(path.join(priv, 'config.php'), path.join(pv, 'config.php'));
    const env = { ...process.env }; delete env.FB_PRIVATE;
    const r = spawnSync('php', [path.join(web, 'inc/backup.php')], { env, encoding: 'utf8' });
    ok(r.status === 0 && readdirSync(path.join(pv, 'backups')).length === 1, 'backup by cron without FB_PRIVATE finds the private folder next to the site: ' + r.stdout + r.stderr); }
  await signOut();

  // 5b. administration panel (22 Nov 2026): limits, reset, temporary block, service off, announcement, sign-up modes, delete, audit
  { const OTHER = '0000-0003-1415-9269', NEWCOMER = '0000-0002-9079-593X';
    const api = () => page.evaluate(async () => (await fetch('api/interpret.php')).json());
    const ask = () => page.evaluate(async () => { const s = await (await fetch('api/interpret.php')).json(); const r = await fetch('api/interpret.php', { method: 'POST', headers: { 'X-CSRF': s.csrf, 'Content-Type': 'application/json' }, body: JSON.stringify({ tool: 'model-degerlendirme', summary: { a: 1 } }) }); return [r.status, await r.json()]; });
    const acct = async o => { await page.goto(`${BASE}/yonetim.php?view=account&orcid=${o}`); await page.waitForSelector('#adm-acc'); };
    const sql = q => spawnSync('php', ['-r', `$d = new PDO('sqlite:' . getenv('FB_PRIVATE') . '/fb.sqlite'); $d->exec(${JSON.stringify(q)});`], { env: { ...process.env, FB_PRIVATE: priv } });
    // a user cannot open the panel
    await signIn(USER, 'Test Researcher');
    ok((await page.goto(BASE + '/yonetim.php')).status() === 403, 'the panel answers 403 to a user who is not the administrator');
    await signOut();
    await signIn(ADMIN, 'Site Author'); await acct(USER);
    ok((await page.textContent('#adm-accuse')).includes('2 of 2 this month'), 'account page: use this month');
    await page.fill('#adm-limits [name="extra"]', '1'); await page.fill('#adm-limits [name="q_day"]', '1'); await page.fill('#adm-limits [name="reason"]', 'conference week');
    await page.click('#adm-limits button'); await page.waitForSelector('#adm-done');
    ok((await page.textContent('#adm-accuse')).includes('2 of 3 this month (including 1 extra)') && (await page.textContent('#adm-acclog')).includes('extra this month 0 → 1'), 'limits saved: one extra this month, 1 a day; in the audit log');
    await signOut(); await signIn(USER, 'Test Researcher');
    let s = await api(), r = await ask();
    ok(s.quota === 3 && s.quotaDay === 1 && s.usedDay === 2 && r[0] === 429 && r[1].error === 'daily', 'user: 3 a month, 1 a day; today\'s 2 already used → 429 daily');
    await signOut(); await signIn(ADMIN, 'Site Author'); await acct(USER);
    await page.click('[data-reset="day"]'); await page.waitForSelector('#adm-done');
    await signOut(); await signIn(USER, 'Test Researcher');
    r = await ask(); s = await api();
    ok(r[0] === 200 && s.used === 3 && s.usedDay === 1, "after the reset of today's use one more interpretation (3 of 3)");
    await signOut(); await signIn(ADMIN, 'Site Author'); await acct(USER);
    const until = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    await page.check('#adm-status [value="blocked"]'); await page.fill('#adm-status [name="until"]', until); await page.fill('#adm-status [name="reason"]', 'Unusual use, please write to the author');
    await page.click('#adm-status button'); await page.waitForSelector('#adm-done');
    ok((await page.textContent('#adm-state')).includes('Blocked until ' + until), 'temporary block saved');
    await signOut(); await signIn(USER, 'Test Researcher');
    ok((await page.textContent('#acc-status')).includes('Blocked until ' + until) && (await page.textContent('#acc-reason')).includes('Unusual use'), 'user sees the block, its end and the reason');
    r = await ask(); ok(r[0] === 403 && r[1].error === 'blocked' && r[1].reason.startsWith('Unusual'), 'API for a blocked account: 403 blocked with the reason');
    sql(`UPDATE users SET until = '2020-01-01T00:00:00+00:00' WHERE orcid = '${USER}'`);
    await page.goto(BASE + '/hesap.php');
    ok((await page.textContent('#acc-status')).startsWith('Approved'), 'a temporary block ends by itself when its date has passed');
    await signOut(); await signIn(ADMIN, 'Site Author');
    await page.goto(BASE + '/yonetim.php?view=settings');
    await page.uncheck('#adm-settings [name="ai_enabled"]'); await page.fill('#adm-settings [name="ai_off_message"]', 'maintenance until Monday');
    await page.fill('#adm-settings [name="announcement"]', 'New: daily limits.'); await page.check('#adm-settings [value="closed"]');
    await page.click('#adm-settings button[type="submit"]'); await page.waitForSelector('#adm-done');
    ok((await page.inputValue('#adm-settings [name="ai_off_message"]')) === 'maintenance until Monday', 'settings saved');
    await signOut();
    await page.goto(`${BASE}/auth/orcid.php?mock=${NEWCOMER}&name=Newcomer`); await page.waitForURL(/signin=closed/);
    ok(await page.isVisible('#acc-closed') && await page.isVisible('#acc-signin'), 'sign-up closed: a new ORCID iD gets no account');
    await signIn(USER, 'Test Researcher');
    ok((await page.textContent('#acc-announce')).includes('New: daily limits.') && (await page.textContent('#acc-paused')).includes('maintenance until Monday'), 'existing users still sign in; they see the announcement and the pause');
    await sql(`UPDATE usage SET n = 0 WHERE orcid = '${USER}'`); await sql(`DELETE FROM usage_day WHERE orcid = '${USER}'`);
    await runEval();
    ok(await page.isVisible('#ai-off') && (await page.textContent('#ai-announce')).includes('New: daily limits.'), 'the card says the service is paused and shows the announcement');
    r = await ask(); ok(r[0] === 503 && r[1].error === 'off' && r[1].message === 'maintenance until Monday', 'API while paused: 503 off with the message');
    await signOut(); await signIn(ADMIN, 'Site Author');
    await page.goto(BASE + '/yonetim.php?view=settings');
    await page.check('#adm-settings [name="ai_enabled"]'); await page.fill('#adm-settings [name="announcement"]', ''); await page.check('#adm-settings [value="auto"]');
    await page.click('#adm-settings button[type="submit"]'); await page.waitForSelector('#adm-done');
    await signOut(); await signIn(OTHER, 'Auto Approved');
    ok((await page.textContent('#acc-status')).startsWith('Approved'), 'sign-up "auto": a new account is approved at once');
    await signOut(); await signIn(ADMIN, 'Site Author');
    await page.goto(BASE + '/yonetim.php?view=settings'); await page.check('#adm-settings [value="approval"]'); await page.click('#adm-settings button[type="submit"]'); await page.waitForSelector('#adm-done');
    await acct(OTHER);
    await page.fill('#adm-delete [name="confirm"]', 'wrong'); await page.click('#adm-delete button'); await page.waitForSelector('#adm-done');
    ok((await page.textContent('#adm-done')).includes('Type the ORCID iD') && await page.isVisible('#adm-acc'), 'deletion refused without the ORCID iD typed');
    await page.fill('#adm-delete [name="confirm"]', OTHER); await page.fill('#adm-delete [name="reason"]', 'test account'); await page.click('#adm-delete button'); await page.waitForSelector('#adm-list');
    ok((await page.locator(`#adm-list tr[data-orcid="${OTHER}"]`).count()) === 0, 'the administrator deleted the account');
    await page.goto(BASE + '/yonetim.php?view=audit');
    const audit = await page.textContent('#adm-audit');
    ok(['status', 'limits', 'reset', 'settings', 'delete', 'unblock'].every(a => audit.includes(a)) && audit.includes('(deleted)') && audit.includes('automatic approval'), 'audit log: every change, the automatic ones, the deleted account marked');
    const csv = await page.evaluate(async () => (await fetch('yonetim.php?view=audit&csv=1')).text());
    ok(csv.split('\n')[0].includes('"time (UTC)",by,action,account,detail'), 'audit log downloads as CSV');
    await page.goto(BASE + '/hesap.php');
    ok(!(await page.isVisible('#acc-paused')) && (await page.locator('#acc-announce').count()) === 0, 'service on again, no announcement');
    // 5c. stage 2: call log, tokens, prices, site-wide cap, retention by hand
    await page.goto(BASE + '/yonetim.php?view=usage');
    const oc = await page.textContent('#adm-outcomes');
    ok(/ok 3\b/.test(oc) && ['quota', 'daily', 'off'].every(x => oc.includes(x)), 'usage: outcomes of this month (3 answered; refusals by quota, daily limit and pause) ' + oc);
    ok((await page.locator('#adm-days tbody tr').first().textContent()).includes('3') && !(await page.textContent('#adm-month')).includes(' 0 tokens in'), 'usage: today\'s row and the token totals');
    ok((await page.locator(`#adm-top tr[data-orcid="${USER}"]`).count()) === 1 && (await page.locator('#adm-probs tbody tr').count()) >= 3, 'usage: accounts this month and the recent refusals');
    const ccsv = await page.evaluate(async () => (await fetch('yonetim.php?view=usage&csv=1')).text());
    ok(ccsv.split('\n')[0].includes('account,tool,outcome,"input tokens","output tokens"') && !ccsv.includes('Mock interpretation'), 'call log CSV: no summaries or texts');
    await page.goto(BASE + '/yonetim.php?view=settings');
    await page.fill('#adm-settings [name="price_in"]', 'x'); await page.click('#adm-settings button[type="submit"]'); await page.waitForSelector('#adm-done');
    ok((await page.textContent('#adm-done')).includes('Prices'), 'a price that is not a number is refused');
    await page.fill('#adm-settings [name="price_in"]', '3'); await page.fill('#adm-settings [name="price_out"]', '15'); await page.fill('#adm-settings [name="site_cap"]', '3');
    await page.click('#adm-settings button[type="submit"]'); await page.waitForSelector('#adm-done');
    await page.goto(BASE + '/yonetim.php');
    ok(/estimated cost \$\d/.test(await page.textContent('#adm-tok')) && (await page.textContent('#adm-use')).includes('site-wide cap of 3'), 'overview: estimated cost from the entered prices; the cap');
    await signOut(); await signIn(USER, 'Test Researcher');
    sql(`UPDATE usage SET n = 0 WHERE orcid = '${USER}'`); sql(`DELETE FROM usage_day WHERE orcid = '${USER}'`);
    r = await ask(); ok(r[0] === 503 && r[1].error === 'cap', 'site-wide cap reached (3 answered this month): 503 cap for everyone');
    await signOut(); await signIn(ADMIN, 'Site Author');
    await page.goto(BASE + '/yonetim.php?view=settings'); await page.fill('#adm-settings [name="site_cap"]', '0'); await page.click('#adm-settings button[type="submit"]'); await page.waitForSelector('#adm-done');
    await acct(USER); ok((await page.textContent('#adm-acccalls')).includes('3 answered') && (await page.textContent('#adm-acccalls')).includes('$'), 'account page: calls this month with the estimate');
    await page.goto(BASE + '/yonetim.php?view=usage'); await page.click('#adm-purge'); await page.waitForSelector('#adm-done');
    ok((await page.textContent('#adm-done')).includes('Retention rule run: 0'), 'retention rule run by hand (nothing old to delete)');
    // 5d. stage 3: switches of the service per tool and for all, bulk state change
    await page.goto(BASE + '/yonetim.php');
    ok((await page.locator('#adm-service tr[data-tool="model-degerlendirme"]').textContent()).includes('on'), 'overview: one switch per tool with the interpretation (Model Evaluation on)');
    await page.click('#adm-service [data-switch="model-degerlendirme"]'); await page.waitForSelector('#adm-done');
    ok((await page.locator('#adm-service tr[data-tool="model-degerlendirme"]').textContent()).includes('off'), 'Model Evaluation switched off');
    await signOut(); await signIn(USER, 'Test Researcher');
    await runEval(); ok(await page.isVisible('#ai-off') && !(await page.isVisible('#ai-go')), 'the card of the switched-off tool says it is paused');
    r = await ask(); ok(r[0] === 503 && r[1].error === 'tool-off', 'API for the switched-off tool: 503 tool-off');
    await signOut(); await signIn(ADMIN, 'Site Author'); await page.goto(BASE + '/yonetim.php');
    await page.click('#adm-service [data-switch="model-degerlendirme"]'); await page.waitForSelector('#adm-done');
    await page.click('#adm-service [data-switch="all"]'); await page.waitForSelector('#adm-done');
    ok(await page.isVisible('#adm-paused') && (await page.locator('#adm-service tr[data-tool="all"]').textContent()).includes('off'), 'whole service switched off from the overview');
    await page.click('#adm-service [data-switch="all"]'); await page.waitForSelector('#adm-done');
    ok(!(await page.isVisible('#adm-paused')), 'and on again');
    await signOut();
    for (const [id, n] of [['0000-0001-2345-6789', 'Bulk One'], ['0000-0002-3456-7890', 'Bulk Two']]) { await signIn(id, n); await signOut(); }
    await signIn(ADMIN, 'Site Author'); await page.goto(BASE + '/yonetim.php?view=accounts&state=pending');
    await page.check('#adm-all'); await page.selectOption('#adm-bulk [name="status"]', 'approved'); await page.click('#adm-bulk button[type="submit"]'); await page.waitForSelector('#adm-done');
    ok((await page.textContent('#adm-done')).includes('State changed for 2 account(s)') && (await page.locator('#adm-list tr', { hasText: 'Bulk One' }).textContent()).includes('Approved'), 'bulk: both waiting accounts approved at once');
    await page.goto(BASE + '/yonetim.php?view=audit');
    const au2 = await page.textContent('#adm-audit');
    ok(au2.includes('interpretation in model-degerlendirme switched off') && au2.includes('interpretation service switched off') && au2.includes('(bulk)'), 'audit log: the switches and the bulk change');
    await page.goto(BASE + '/yonetim.php?view=accounts'); await page.click('#adm-bulk button[type="submit"]'); await page.waitForSelector('#adm-done');
    ok((await page.textContent('#adm-done')).includes('Select at least one'), 'bulk without a selection: nothing changes');
    await signOut(); }
  await signIn(USER, 'Test Researcher');

  // 6. deleting the account removes it; signing in again starts as pending
  await page.click('#acc-delete'); await page.waitForSelector('#acc-deleted');
  ok(await page.isVisible('#acc-signin'), 'account deleted and signed out');
  await signIn(USER, 'Test Researcher');
  ok((await page.textContent('#acc-status')).includes('Waiting for approval') && (await page.textContent('#acc-used')).includes('0 of 2') && (await page.textContent('#acc-storage')).startsWith('0 of 3'), 'after deletion the account starts again, pending, with no usage and nothing saved');
  ok((await page.evaluate(async () => (await fetch('api/library.php?list=results')).status)) === 403, 'library for a pending account: 403');

  // 7. the suite's server has no private settings: no account link, no card, the API says not configured
  const p0 = await ctx.newPage(); p0.on('pageerror', e => errors.push(e.message));
  await p0.goto(BASE0 + '/hesap.php');
  ok(await p0.locator('#acctlink').count() === 0 && await p0.isVisible('#acc-off'), 'without the service: no account link, the Account page says so');
  ok((await p0.evaluate(async () => (await fetch('api/interpret.php')).json())).configured === false && (await p0.evaluate(async () => (await fetch('api/interpret.php', { method: 'POST', body: '{}' })).status)) === 503, 'without the service: the API says not configured (GET) and refuses requests (POST 503)');
  await p0.goto(BASE0 + '/gizlilik.php'); ok((await p0.textContent('h1')).trim() === 'Privacy' && await p0.locator('footer a[href="gizlilik.php"]').count() === 1, 'privacy notice linked from the footer');
} finally {
  await browser.close(); php.kill();
}
ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
console.log(`account e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
