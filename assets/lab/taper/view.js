// Stem Taper: a saved run record shown again (22 Nov 2026; Account → Saved results). The profile sets (form,
// coefficients, bark, source), each tree's volumes, and the stem profile d(h) of the trees drawn from the saved sets;
// bucking results if any. Pure HTML, no DOM.
import * as TP from './calc.js';
import { fmtNum, esc } from '../core/i18n.js';
import { plotChart } from '../core/chart.js';

const f = (x, d = 3) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const fig = (id, svg) => { const t = (svg.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; return `<figure class="chartbox" id="${id}"><p class="small rv-figt"><b>${t}</b></p>${svg}</figure>`; };
const tbl = (head, body, id = '') => `<div class="tscroll"><table class="grid"${id ? ` id="${id}"` : ''}><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
const BARK = { ib: 'inside bark', ob: 'over bark' };
const MAX_TREES = 6;

export function viewRecord(rec) {
  const sets = rec.sets || [], trees = rec.trees || [], st = rec.settings || {};
  if (!sets.length || !trees.length) return null;
  const setOf = bark => sets.find(s => s.bark === bark);
  const asSet = s => ({ form: s.form, params: s.params, output: { bark: s.bark } });
  let h = `<section class="rv-sec"><h3>Profile equations</h3>` + tbl('<tr><th>Bark</th><th>Equation</th><th>Coefficients</th><th>Source</th></tr>', sets.map(s => { const F = TP.formOf(asSet(s));
    return `<tr><th>${esc(BARK[s.bark] || s.bark)}</th><td class="small">${esc(F ? F.name.en : s.form)}<br><code>${esc(F ? F.formula.en : '')}</code></td><td class="small">${Object.entries(s.params || {}).map(([k, v]) => `${esc(k)} = ${f(v, 6)}`).join('<br>')}</td><td class="small">${esc(s.source || '–')} <span class="muted">(${esc(s.origin || '')})</span></td></tr>`; }).join(''), 'rv-sets')
    + `<dl class="kv small"><dt>Stump height</dt><dd>${f(st.stump, 2)} m</dd><dt>Top diameter</dt><dd>${st.dTop != null ? f(st.dTop, 1) + ' cm' : '–'}</dd></dl></section>`;
  const barks = [...new Set(trees.flatMap(t => (t.by || []).map(b => b.bark)))];
  h += `<section class="rv-sec"><h3>Trees</h3>` + tbl(`<tr><th>Tree</th><th>D (cm)</th><th>H (m)</th>${barks.map(b => `<th>Volume ${esc(BARK[b] || b)} (m³)</th><th>Merchantable (m³)</th><th>Height to ${f(st.dTop, 0)} cm (m)</th>`).join('')}</tr>`,
    trees.slice(0, 300).map(t => `<tr><th>${esc(t.plot_id != null ? `${t.plot_id} / ` : '')}${esc(t.tree_id ?? t.row ?? '')}</th><td class="num">${f(t.D, 1)}</td><td class="num">${f(t.H, 1)}</td>${barks.map(b => { const x = (t.by || []).find(y => y.bark === b) || {};
      return x.status && x.status !== 'ok' ? `<td colspan="3" class="small warn">${esc(x.status)}</td>` : `<td class="num">${f(x.total, 4)}</td><td class="num">${f(x.merch, 4)}</td><td class="num">${f(x.hTop, 2)}</td>`; }).join('')}</tr>`).join(''), 'rv-trees')
    + (trees.length > 300 ? `<p class="muted small">First 300 of ${trees.length} trees.</p>` : '');
  // stem profiles from the saved sets
  const show = trees.filter(t => Number.isFinite(t.D) && Number.isFinite(t.H)).slice(0, MAX_TREES), lines = [];
  for (const b of barks) { const s = setOf(b); if (!s) continue; const S = asSet(s);
    show.forEach((t, i) => { const pts = Array.from({ length: 161 }, (_, j) => { const hh = t.H * j / 160; try { const r = TP.diameterAt(S, t.D, t.H, hh); return [hh, r.d == null ? NaN : r.d]; } catch (e) { return [hh, NaN]; } });
      lines.push({ k: i, dash: b === 'ob' && barks.length > 1, pts, label: `${t.tree_id ?? i + 1} · ${BARK[b] || b}` }); }); }
  if (lines.length) {
    const Hm = Math.max(...show.map(t => t.H)), Dm = Math.max(...show.map(t => t.D));
    h += fig('rv-ch-profile', plotChart({ title: 'Stem profiles from the saved equations', xmin: 0, xmax: Hm, ymin: 0, ymax: Dm * 1.25, lines, xLabel: 'Height above ground h (m)', yLabel: 'Diameter d (cm)', fmt: x => fmtNum(x, 3), width: 760, height: 380 }))
      + `<p class="rv-keys small">${lines.map(l => `<span><svg width="22" height="10" aria-hidden="true"><line class="ch-line ch-l${l.k % 6}${l.dash ? ' ch-dash' : ''}" x1="1" x2="21" y1="5" y2="5"/></svg> ${esc(l.label)}</span>`).join('')}</p>`
      + (trees.length > show.length ? `<p class="muted small">Profiles of the first ${show.length} of ${trees.length} trees.</p>` : '');
  }
  return { html: h + '</section>', rest: ['bucking'] };
}
