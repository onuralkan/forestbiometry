// Browser test of the AI interpretation service (21 Nov 2026): ORCID sign-in (mock), approval by the administrator,
// monthly quota, the interpretation card in Model Evaluation (Claude mocked), form tokens, deleting an account, and the
// site without the service. Starts its own PHP server with a throw-away private folder (FB_PRIVATE): the mock settings
// never exist on a real server. The BASE argument (the suite's server, without the service) is used for the last check.
// Usage: node tests/account/e2e.mjs http://127.0.0.1:8092
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
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
await writeFile(path.join(priv, 'config.php'), `<?php return ['anthropic_mock' => true, 'orcid_mock' => true, 'admin_orcid' => '${ADMIN}', 'monthly_quota' => 2, 'per_minute' => 10];\n`);
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
  ok((await page.textContent('#acc-status')).includes('administrator') && await page.isVisible('#acc-list'), 'administrator: approved at once, sees the account list');
  const row = page.locator(`#acc-list tr[data-orcid="${USER}"]`);
  ok((await row.textContent()).includes('Waiting for approval'), 'the new account is listed as waiting');
  await row.locator('[data-act="approved"]').click(); await page.waitForURL(/hesap\.php/);
  ok((await page.locator(`#acc-list tr[data-orcid="${USER}"]`).textContent()).includes('Approved'), 'approved by the administrator');
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

  // 5. deleting the account removes it; signing in again starts as pending
  await page.click('#acc-delete'); await page.waitForSelector('#acc-deleted');
  ok(await page.isVisible('#acc-signin'), 'account deleted and signed out');
  await signIn(USER, 'Test Researcher');
  ok((await page.textContent('#acc-status')).includes('Waiting for approval') && (await page.textContent('#acc-used')).includes('0 of 2'), 'after deletion the account starts again, pending, with no usage');

  // 6. the suite's server has no private settings: no account link, no card, the API says not configured
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
