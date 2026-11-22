// Biomass & Carbon: a saved run record shown again (22 Nov 2026; Account → Saved results). The components with their
// carbon fractions, the coefficient sets and their sources, the species mapping, what could not be computed, and per
// plot the biomass, carbon and CO₂ per hectare, with charts. Nothing is recomputed. Pure HTML, no DOM.
import { fmtNum, esc } from '../core/i18n.js';
import { barChart } from '../core/chart.js';

const f = (x, d = 2) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const fig = (id, svg) => { const t = (svg.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; return `<figure class="chartbox" id="${id}"><p class="small rv-figt"><b>${t}</b></p>${svg}</figure>`; };
const tbl = (head, body, id = '') => `<div class="tscroll"><table class="grid"${id ? ` id="${id}"` : ''}><thead>${head}</thead><tbody>${body}</tbody></table></div>`;

export function viewRecord(rec) {
  const st = rec.settings || {}, units = rec.units || [], comps = st.components || [], sets = rec.sets || [];
  if (!units.length) return null;
  const cl = c => c.label || c.key;
  let h = `<section class="rv-sec"><h3>Settings</h3><dl class="kv small" id="rv-settings"><dt>Approach</dt><dd>${esc(st.approach === 'volume' ? 'from volume (wood density, expansion factors)' : st.approach === 'both' ? 'allometric and from volume' : 'allometric equations')}</dd>
    <dt>Components</dt><dd>${comps.map(c => `${esc(cl(c))} (carbon fraction ${f(c.CF, 3)})`).join(', ') || '–'}</dd>
    <dt>Plot × period without records</dt><dd>${esc(st.emptyCombos || '–')}</dd></dl>`;
  if (sets.length) h += `<h4>Coefficient sets</h4>` + tbl('<tr><th>Set</th><th>Form</th><th>Coefficients</th><th>Source</th></tr>', sets.map(s => `<tr><th>${esc(s.id)}</th><td class="small">${esc(s.form)}${s.transform ? ` · ${esc(s.transform.kind)}` : ''}</td><td class="small">${Object.entries(s.params || {}).map(([k, v]) => `${esc(k)} = ${f(v, 5)}`).join(', ')}</td><td class="small">${esc(s.source && (s.source.citation || s.source))}</td></tr>`).join(''), 'rv-sets');
  const map = st.map || {};
  if (Object.keys(map).length) h += `<h4>Species → set</h4>` + tbl(`<tr><th>Species</th>${comps.map(c => `<th>${esc(cl(c))}</th>`).join('')}</tr>`, Object.entries(map).map(([sp, m]) => `<tr><th>${esc(sp)}</th>${comps.map(c => `<td>${esc(m[c.key] || '–')}</td>`).join('')}</tr>`).join(''));
  h += '</section>';
  // what was computed
  const counts = rec.counts || {};
  if (Object.keys(counts).length) h += `<section class="rv-sec"><h3>Trees</h3>` + tbl('<tr><th>Component</th><th>Trees</th><th>Computed</th><th>No set for the species</th><th>No height</th><th>Outside the valid range</th><th>Invalid</th></tr>',
    comps.map(c => { const n = counts[c.key] || {}; return `<tr><th>${esc(cl(c))}</th><td class="num">${f(n.n, 0)}</td><td class="num">${f(n.ok, 0)}</td><td class="num">${f(n.unmapped, 0)}</td><td class="num">${f(n.noheight, 0)}</td><td class="num">${f(n.outside, 0)}</td><td class="num">${f(n.invalid, 0)}</td></tr>`; }).join(''))
    + ((rec.unmapped || []).length ? `<p class="note warn small">No coefficient set for: ${rec.unmapped.map(u => `${esc(u.species)} (${esc(u.component)}, ${u.rows ? u.rows.length : 0} tree(s))`).join('; ')}. Plots with such trees have no total.</p>` : '') + '</section>';
  // per plot
  const pers = [...new Set(units.map(u => u.period ?? null))];
  pers.forEach((per, pi) => {
    const us = units.filter(u => (u.period ?? null) === per);
    h += `<section class="rv-sec"><h3>${per == null ? 'Per plot' : `Period ${esc(per)}`}</h3>` + tbl(`<tr><th>Plot</th><th>State</th><th>Trees</th>${comps.map(c => `<th>${esc(cl(c))} (t/ha)</th>`).join('')}<th>Biomass (t/ha)</th><th>Carbon (t/ha)</th><th>CO₂ (t/ha)</th></tr>`,
      us.map(u => `<tr><th>${esc(u.plot_id)}</th><td class="small">${esc(u.state)}</td><td class="num">${f(u.n, 0)}</td>${comps.map(c => { const x = u.comps && u.comps[c.key] || {}; return `<td class="num">${f(x.perHa)}${x.nMissing ? ` <span class="warn small">(${x.nMissing} missing)</span>` : ''}</td>`; }).join('')}<td class="num">${f(u.B)}</td><td class="num">${f(u.C)}</td><td class="num">${f(u.CO2)}</td></tr>`).join(''), 'rv-units-' + pi);
    const okU = us.filter(u => u.B != null || u.C != null);
    if (okU.length) h += fig('rv-ch-bc-' + pi, barChart({ title: `Biomass and carbon per hectare${per != null ? ` · ${per}` : ''}`, categories: okU.map(u => String(u.plot_id)), series: [{ name: 'Biomass', values: okU.map(u => u.B) }, { name: 'Carbon', values: okU.map(u => u.C) }], yLabel: 't/ha', fmt: v => fmtNum(v, 1), height: 300 }));
    if (us.some(u => u.B == null && u.state === 'measured')) h += '<p class="muted small">"–": the plot has trees that could not be computed (see above), so it has no total.</p>';
    h += '</section>';
  });
  return { html: h, rest: ['missing', 'noheight'].filter(k => rec[k] && (!Array.isArray(rec[k]) || rec[k].length)) };
}
