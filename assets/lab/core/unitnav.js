// Unit navigator shared by the tools that show one unit (plot) at a time: a searchable, sortable list with a
// "problems only" filter beside the results, a previous / next bar above them, and the keyboard (← → on the page,
// ↑ ↓ in the list). The tool supplies the items, the sort orders, the texts and what happens on selection.
//   const nav = createUnitNav({
//     items: () => [{ id, label, barLabel?, search?, state: 'ok'|'warning'|'error', stateTitle, meta: [text, text?], barMeta?: html }],
//     sorts: [{ key, label, cmp(a, b) }],          // the first one is the default
//     texts: { search, sort, bad, count: ({k, n}) => text, none, prev, next, keys, outside },
//     prefs: () => object kept in the session ({ q, sort, bad } are written there),
//     getSel: () => id, setSel: id => void (store the choice and redraw the result panel), save: () => void });
//   nav.renderAside(box)  nav.bar(extraHtml)  nav.bindBar()  nav.select(id)  nav.step(±1)  nav.handleKey(e)
import { esc, lang } from './i18n.js';

export const DOT = { ok: '●', warning: '▲', error: '◆' };
const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

export function createUnitNav(o) {
  let box = null;
  const prefs = () => { const p = o.prefs(); if (p.q == null) p.q = ''; if (!p.sort || !o.sorts.some(s => s.key === p.sort)) p.sort = o.sorts[0].key; if (p.bad == null) p.bad = false; return p; };
  /** Items in the order the list shows them (search, "problems only", sort). */
  function order() {
    const p = prefs(), q = p.q.trim().toLocaleLowerCase(lang), cmp = o.sorts.find(s => s.key === p.sort).cmp;
    return o.items().filter(u => (!q || String(u.search ?? u.label).toLocaleLowerCase(lang).includes(q)) && (!p.bad || u.state !== 'ok')).sort((a, b) => cmp(a, b) || natural(a.id, b.id));
  }
  function mark(focusList) {
    if (!box) return;
    box.querySelectorAll('[data-u]').forEach(b => {
      const on = b.dataset.u === String(o.getSel());
      b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) { b.scrollIntoView({ block: 'nearest' }); if (focusList) b.focus(); }
    });
  }
  function select(id, focusList = false) {
    if (id == null || String(id) === String(o.getSel())) { if (focusList) mark(true); return; }
    o.setSel(id); o.save(); mark(focusList);
  }
  /** Next / previous in the list order; wraps around. Outside the filter, starts from the first item. */
  function step(d) {
    const list = order(); if (!list.length) return;
    const i = list.findIndex(u => String(u.id) === String(o.getSel()));
    select(list[i < 0 ? 0 : (i + d + list.length) % list.length].id);
  }
  function itemsHtml(list) {
    return list.map(u => `<button type="button" class="uitem${String(u.id) === String(o.getSel()) ? ' on' : ''}" data-u="${esc(u.id)}" aria-current="${String(u.id) === String(o.getSel())}">
      <span class="ust st-${u.state}" title="${esc(u.stateTitle || '')}" aria-label="${esc(u.stateTitle || '')}">${DOT[u.state]}</span><span class="uid">${esc(u.label)}</span><span class="un">${esc(u.meta[0] ?? '')}</span>
      <span class="uks">${esc(u.meta[1] ?? '')}</span></button>`).join('') || `<p class="muted small">${esc(o.texts.none)}</p>`;
  }
  function renderAside(el) {
    const p = prefs(), list = order(), all = o.items().length, t = o.texts;
    if (el && el !== box) box = el;
    if (!box) return;
    if (!box.firstChild) {
      box.innerHTML = `<div class="unav-in"><input type="search" class="uq" placeholder="${esc(t.search)}" value="${esc(p.q)}" aria-label="${esc(t.search)}">
        <div class="unav-opts"><label>${esc(t.sort)} <select class="usort">${o.sorts.map(s => `<option value="${s.key}"${p.sort === s.key ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>
        <label class="chk"><input type="checkbox" class="ubad"${p.bad ? ' checked' : ''}> ${esc(t.bad)}</label></div>
        <p class="muted small ucount"></p></div><div class="ulist"></div>`;
      // the same ids as before, so existing pages and tests keep working
      box.querySelector('.uq').id = 'uq'; box.querySelector('.usort').id = 'usort'; box.querySelector('.ubad').id = 'ubad'; box.querySelector('.ulist').id = 'ulist';
      box.querySelector('.uq').addEventListener('input', e => { prefs().q = e.target.value; o.save(); renderAside(); });
      box.querySelector('.usort').addEventListener('change', e => { prefs().sort = e.target.value; o.save(); renderAside(); });
      box.querySelector('.ubad').addEventListener('change', e => { prefs().bad = e.target.checked; o.save(); renderAside(); });
      box.querySelector('.ulist').addEventListener('keydown', e => {                       // ↑ / ↓ move through the list
        const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0; if (!d) return;
        e.preventDefault(); const l = order(), i = l.findIndex(u => String(u.id) === String(o.getSel()));
        const nx = l[Math.min(l.length - 1, Math.max(0, i + d))]; if (nx) select(nx.id, true);
      });
      box.querySelector('.ulist').addEventListener('click', e => { const b = e.target.closest('[data-u]'); if (b) select(b.dataset.u); });
    }
    box.querySelector('.ulist').innerHTML = itemsHtml(list);
    box.querySelector('.ucount').textContent = t.count({ k: list.length, n: all });
    mark(false);
  }
  /** Previous / next bar for the top of the result panel. extra: html placed under the label (e.g. a period switch). */
  function bar(extra = '') {
    const list = order(), all = o.items(), u = all.find(x => String(x.id) === String(o.getSel())), t = o.texts;
    if (!u) return '';
    if (all.length < 2) return `<div class="navbar single"><div class="navlab"><b>${esc(u.barLabel ?? u.label)}</b>${u.barMeta ? ` · ${u.barMeta}` : ''}</div>${extra}</div>`;
    const i = list.findIndex(x => String(x.id) === String(u.id));
    return `<div class="navbar"><button type="button" class="btn ghost navbtn" id="uprev" aria-label="${esc(t.prev)}" title="${esc(t.prev)} (←)">◀</button>
      <div class="navlab"><b>${esc(u.barLabel ?? u.label)}</b> <span class="ust st-${u.state}" title="${esc(u.stateTitle || '')}">${DOT[u.state]}</span>${u.barMeta ? ` · ${u.barMeta}` : ''}<span class="muted small"> · ${i < 0 ? esc(t.outside) : `${i + 1} / ${list.length}`}</span></div>
      <button type="button" class="btn ghost navbtn" id="unext" aria-label="${esc(t.next)}" title="${esc(t.next)} (→)">▶</button><span class="muted small navhint">${esc(t.keys)}</span>${extra}</div>`;
  }
  function bindBar() { const p = document.getElementById('uprev'), n = document.getElementById('unext'); p && p.addEventListener('click', () => step(-1)); n && n.addEventListener('click', () => step(1)); }
  /** ← → (and PageUp / PageDown) on the page, not while typing, on the tab bar or inside the list. Returns true when used. */
  function handleKey(e, ignore = '') {
    if (e.altKey || e.ctrlKey || e.metaKey || o.items().length < 2) return false;
    const tg = e.target; if (tg.closest && tg.closest('input, select, textarea, .tabs, .ulist, [role="radiogroup"]' + (ignore ? ', ' + ignore : ''))) return false;
    const d = e.key === 'ArrowRight' || e.key === 'PageDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'PageUp' ? -1 : 0;
    if (!d) return false;
    e.preventDefault(); step(d); return true;
  }
  return { order, select, step, renderAside, bar, bindBar, handleKey, reset() { box = null; } };
}
