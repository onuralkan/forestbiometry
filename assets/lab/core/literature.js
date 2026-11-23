// Literature box of the tool pages (23 Nov 2026, user decision): administrator only. The page renders the box (inc/site.php)
// only for the administrator when the Elsevier key is configured; this script loads the lists from api/literature.php
// when the box is opened (no Scopus call on a page view), switches between recent and most cited, refreshes, and edits
// the tool's search query. No imports: loaded directly in both the module and the bundled mode.
const box = document.getElementById('fb-lit');
if (box) {
  const tool = box.dataset.tool, csrf = box.dataset.csrf, out = box.querySelector('.lit-out'), qf = box.querySelector('#lit-q');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let sort = 'recent', loaded = false;
  const msg = e => e === 'no-query' ? 'No search query for this tool.' : e;
  async function load(refresh = false) {
    out.innerHTML = '<p class="muted small">Loading from Scopus…</p>';
    try {
      const r = await fetch(`api/literature.php?tool=${encodeURIComponent(tool)}&sort=${sort}${refresh ? '&refresh=1' : ''}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const j = await r.json(); loaded = true;
      if (j.query != null) { qf.value = j.query; box.querySelector('#lit-custom').hidden = !j.custom; }
      if (!j.ok) { out.innerHTML = `<p class="note warn small">Scopus did not answer: ${esc(msg(j.error || ('HTTP ' + r.status)))}</p>`; return; }
      const when = j.fetched ? new Date(j.fetched).toLocaleString() : '';
      out.innerHTML = `<p class="muted small" id="lit-meta">${Number(j.total).toLocaleString('en')} records in Scopus · ${j.entries.length} shown · ${sort === 'cited' ? 'most cited' : 'most recent'} · ${j.cached ? 'cached' : 'fetched'} ${esc(when)}</p>`
        + (j.entries.length ? `<ol class="lit-list">${j.entries.map(e => `<li><span class="lit-t">${e.scopus ? `<a href="${esc(e.scopus)}" target="_blank" rel="noopener">${esc(e.title)}</a>` : esc(e.title)}</span>
          <span class="muted small">${esc([e.creator, e.journal, e.year, e.volume && ('vol. ' + e.volume), e.pages && ('pp. ' + e.pages)].filter(Boolean).join(' · '))}</span>
          <span class="muted small">Cited by ${e.cited ?? '–'}${e.type ? ' · ' + esc(e.type) : ''}${e.doi ? ` · <a href="https://doi.org/${esc(e.doi)}" target="_blank" rel="noopener">doi:${esc(e.doi)}</a>` : ''}</span></li>`).join('')}</ol>` : '<p class="muted small">No records.</p>')
        + '<p class="muted small">Data from Scopus (Elsevier), for the administrator\'s own use; not shown to visitors.</p>';
    } catch (err) { out.innerHTML = `<p class="note warn small">The list could not be loaded (${esc(err.message)}).</p>`; }
  }
  box.addEventListener('toggle', () => { if (box.open && !loaded) load(); });
  box.querySelectorAll('input[name="lit-sort"]').forEach(x => x.addEventListener('change', () => { sort = x.value; load(); }));
  box.querySelector('#lit-refresh').addEventListener('click', () => load(true));
  async function saveQuery(q) {
    const r = await fetch('api/literature.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF': csrf }, body: JSON.stringify({ tool, query: q }) });
    if (!r.ok) { out.innerHTML = `<p class="note warn small">The query was not saved (HTTP ${r.status}).</p>`; return; }
    load();
  }
  box.querySelector('#lit-save').addEventListener('click', () => saveQuery(qf.value));
  box.querySelector('#lit-default').addEventListener('click', () => saveQuery(''));
}
