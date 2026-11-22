// AI interpretation of a tool's result (21 Nov 2026, user decision; server side: api/interpret.php, accounts: hesap.php).
// A tool puts interpretSlot() where the card should go and calls mountInterpret(slot, tool, getSummary) after drawing.
// getSummary() returns the same object the tool writes into its JSON run record (settings and result tables, no row
// data); it is sent only when the user presses the button. Without the service on the server the card stays hidden.
// The server keeps every interpretation in the account (hesap.php → Interpretations; 22 Nov 2026, user decision), with
// the key of its summary, so that a result saved with "Save to my account" (core/record-ui.js) links to it.
import { esc } from './i18n.js';

import { getState, keyOf, state } from './account.js';

const API = 'api/interpret.php';
const done = new Map();              // summary key → { text, model, at }: survives redraws of the tool

/** The model's plain text as HTML: headings on their own line become h4, the rest paragraphs; everything escaped. */
export function textToHtml(t) {
  const HEAD = /^(summary|comparison|uncertainty|limits)\s*:?$/i;
  return String(t).trim().split(/\n\s*\n/).map(block => {
    const lines = block.split('\n').map(x => x.trim()).filter(Boolean);
    if (!lines.length) return '';
    let out = '';
    if (HEAD.test(lines[0].replace(/^#+\s*/, '').replace(/\*\*/g, ''))) { out += `<h4>${esc(lines.shift().replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/:$/, ''))}</h4>`; }
    if (lines.length) out += `<p>${lines.map(x => esc(x.replace(/\*\*/g, ''))).join('<br>')}</p>`;
    return out;
  }).join('');
}

export const interpretSlot = () => '<div class="ai-slot" hidden></div>';

/** Fills the first empty .ai-slot inside el. tool: { id, version }; getSummary: () => object. */
export async function mountInterpret(el, tool, getSummary) {
  const slot = el.querySelector('.ai-slot'); if (!slot) return;
  const st = await getState();
  if (!st.configured || !slot.isConnected) return;
  const back = location.pathname.split('/').pop() || 'index.php';
  const summary = getSummary(), key = tool.id + '|' + keyOf(summary), prev = done.get(key);
  const leftOf = j => Math.max(0, Math.min(j.quota - j.used, j.quotaDay > 0 ? j.quotaDay - j.usedDay : Infinity));
  const leftText = j => `${Math.max(0, j.quota - j.used)} of ${j.quota} interpretations left this month${j.quotaDay > 0 ? `; ${Math.max(0, j.quotaDay - j.usedDay)} of ${j.quotaDay} today` : ''}`;
  const left = st.signedIn ? leftOf(st) : 0;
  const note = st.signedIn && st.announcement ? `<p class="note" id="ai-announce">${esc(st.announcement)}</p>` : '';
  let body;
  if (!st.signedIn) body = `<p>Sign in with ORCID to ask for an AI interpretation of these results (accounts are approved by the site's author).</p>
    <p class="b-actions"><a class="btn ghost" href="auth/orcid.php?back=${encodeURIComponent(back)}" id="ai-signin">Sign in with ORCID</a></p>`;
  else if (st.status === 'pending') body = '<p id="ai-pending">Your account is waiting for approval; the interpretation works once it is approved. <a href="hesap.php">Account</a></p>';
  else if (st.status !== 'approved') body = `<p id="ai-blocked">Your account cannot use the interpretation service${st.reason ? `: ${esc(st.reason)}` : '.'}${st.until ? ` (until ${esc(st.until.slice(0, 10))})` : ''} <a href="hesap.php">Account</a></p>`;
  else if (!st.service) body = `<p class="note warn" id="ai-off">The interpretation service is paused${st.serviceMessage ? `: ${esc(st.serviceMessage)}` : '.'}</p>`;
  else body = `<p class="b-actions"><button type="button" class="btn" id="ai-go"${left ? '' : ' disabled'}>${prev ? 'Interpret again' : 'Interpret these results'}</button>
      <span class="muted small" id="ai-left">${leftText(st)}</span></p>`;
  slot.innerHTML = `<section class="card ai-card" aria-labelledby="ai-h"><h3 id="ai-h">AI interpretation</h3>
    <p class="muted small">Written by Anthropic's Claude from the summary of these results (settings and result tables, no row data), sent only when you press the button. A language model can be wrong: check the text against the numbers. <a href="gizlilik.php">Privacy</a></p>
    ${note}${body}<div id="ai-out" aria-live="polite"></div></section>`;
  slot.hidden = false;
  const out = slot.querySelector('#ai-out');
  const show = r => {
    out.innerHTML = `<div class="ai-text">${textToHtml(r.text)}</div><p class="muted small">${esc(r.model)} · ${esc(new Date(r.at).toLocaleString('en-GB'))}${r.truncated ? ' · cut short at the length limit' : ''}
      · ${r.saved ? `<a href="hesap.php?tab=interpretations&amp;id=${esc(r.id)}" id="ai-saved">saved to My interpretations</a> · ` : r.saved === false ? '<span id="ai-saved">not saved: your account\'s storage is full</span> · ' : ''}<button type="button" class="linkbtn" id="ai-copy">Copy text</button></p>`;
    out.querySelector('#ai-copy').addEventListener('click', () => navigator.clipboard && navigator.clipboard.writeText(r.text));
  };
  if (prev) show(prev);
  const go = slot.querySelector('#ai-go'); if (!go) return;
  go.addEventListener('click', async () => {
    go.disabled = true; out.innerHTML = '<p class="muted" id="ai-wait">Writing the interpretation… (this can take up to a minute)</p>';
    let r, j;
    try {
      r = await fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF': st.csrf },
        body: JSON.stringify({ tool: tool.id, version: tool.version, summary, key: keyOf(summary) }) });
      j = await r.json();
    } catch (e) { j = { error: 'network' }; }
    if (j && j.text) {
      const res = { text: j.text, model: j.model, truncated: !!j.truncated, at: Date.now(), saved: j.saved, id: j.id };
      done.set(key, res); show(res);
      Object.assign(state(), { used: j.used, quota: j.quota, usedDay: j.usedDay, quotaDay: j.quotaDay }); const l = leftOf(j);
      slot.querySelector('#ai-left').textContent = leftText(j);
      go.textContent = 'Interpret again'; go.disabled = !l;
      return;
    }
    const msg = { quota: 'This month\'s interpretations are used up.', daily: 'Today\'s interpretations are used up; try again tomorrow (UTC).',
      off: 'The interpretation service is paused' + (j && j.message ? ': ' + j.message : '.'), rejected: 'Your account was not approved.', cap: 'The site\'s interpretations for this month are used up; the service opens again next month.', rate: 'Too many requests in a minute; wait a moment and try again.', signin: 'Your session has ended; sign in again.',
      pending: 'Your account is waiting for approval.', blocked: 'Your account cannot use the service.', token: 'The page is out of date; reload it.', 'too-large': 'These results are too large to send for an interpretation.',
      refusal: 'The model declined to interpret these results.', upstream: 'The interpretation service did not answer; you were not charged. Try again later.', network: 'No connection to the server.' }[j && j.error] || 'The interpretation failed.';
    out.innerHTML = `<p class="note err" id="ai-err">${esc(msg)}${j && j.detail ? `<br><span class="small">Details: ${esc(j.detail)}</span>` : ''}</p>`;
    go.disabled = !!(j && ['quota', 'daily', 'blocked', 'rejected', 'off', 'cap'].includes(j.error));
  });
}
