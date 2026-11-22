// Stand Structure: a saved run record shown again (22 Nov 2026; Account → Saved results). Per plot: the stand and
// structure measures, the spatial indices and competition, the diameter distribution and the Lorenz curve of basal
// area, from the saved numbers. The tree lists stay in the run record (folded below). Pure HTML, no DOM.
import { fmtNum, esc } from '../core/i18n.js';
import { barChart, plotChart } from '../core/chart.js';

const f = (x, d = 3) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const fig = (id, svg) => { const t = (svg.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; return `<figure class="chartbox" id="${id}"><p class="small rv-figt"><b>${t}</b></p>${svg}</figure>`; };
const tbl = (head, body, id = '') => `<div class="tscroll"><table class="grid"${id ? ` id="${id}"` : ''}><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
const MEAS = [['Nha', 'N (trees/ha)', 0, 'st'], ['Gha', 'G (m²/ha)', 2, 'st'], ['Dq', 'Dq (cm)', 1, 'st'], ['H0', 'H0 (m)', 1, 'st'], ['d_mean', 'Mean d (cm)', 1], ['d_sd', 'SD of d (cm)', 2], ['cv', 'CV of d', 3], ['skew', 'Skewness', 3], ['kurt', 'Excess kurtosis', 3],
  ['gini', 'Gini (basal area)', 3], ['shannonD', 'Shannon (diameter classes)', 3], ['speciesN', 'Species', 0], ['shannonSp', 'Shannon (species)', 3], ['simpson', 'Simpson 1 − Σp²', 3], ['sdi', 'SDI (Reineke)', 0], ['rd', 'RD (Curtis)', 2], ['spacingA', 'Spacing a (m)', 2], ['hartPct', 'Hart–Becking S %', 1]];
const SPAT = [['R', 'Clark–Evans R', 'ce'], ['W', 'Uniform angle W', 'means'], ['M', 'Mingling M', 'means'], ['T', 'Size differentiation T', 'means'], ['U', 'Dominance U', 'means']];

export function viewRecord(rec) {
  const units = (rec.units || []).filter(u => u.st);
  if (!units.length) return null;
  const s = (rec.settings || {}).structure || {};
  let h = `<section class="rv-sec"><h3>Settings</h3><dl class="kv small" id="rv-settings"><dt>Diameter classes</dt><dd>from ${esc(s.classStart)} cm, width ${esc(s.classWidth)} cm</dd>
    <dt>SDI</dt><dd>β = ${esc(s.sdiBeta)}, reference Dq ${esc(s.sdiRef)} cm</dd><dt>Spatial</dt><dd>k = ${esc(((rec.settings || {}).spatial || {}).k)} neighbours, edge: ${esc(((rec.settings || {}).spatial || {}).edge)}</dd>
    <dt>Competition</dt><dd>Hegyi, ${esc(((rec.settings || {}).competition || {}).mode === 'radius' ? `radius ${((rec.settings || {}).competition || {}).radius} m` : `${((rec.settings || {}).competition || {}).k} nearest neighbours`)}</dd></dl>`;
  if ((rec.skipped || []).length) h += `<p class="note warn small">Plots not computed: ${rec.skipped.map(x => esc(x.plot_id ?? x)).join(', ')}.</p>`;
  h += '</section>';
  const lab = u => `${u.plot_id}${u.period != null ? ` / ${u.period}` : ''}`;
  h += `<section class="rv-sec"><h3>Measures by plot</h3>` + tbl(`<tr><th></th>${units.map(u => `<th>${esc(lab(u))}</th>`).join('')}</tr>`,
    MEAS.map(([k, l, d, src]) => `<tr><th>${esc(l)}</th>${units.map(u => { const v = src === 'st' ? u.st[k] : u.st.measures && u.st.measures[k]; return `<td class="num">${f(v, d)}</td>`; }).join('')}</tr>`).join('')
    + `<tr><th>Trees</th>${units.map(u => `<td class="num">${f(u.n, 0)}</td>`).join('')}</tr>`, 'rv-measures');
  if (units.some(u => u.sp && u.sp.status === 'ok')) h += `<h4>Spatial structure</h4>` + tbl(`<tr><th></th>${units.map(u => `<th>${esc(lab(u))}</th>`).join('')}</tr>`,
    SPAT.map(([k, l, src]) => `<tr><th>${esc(l)}</th>${units.map(u => `<td class="num">${f(u.sp && u.sp[src] && u.sp[src][k])}</td>`).join('')}</tr>`).join('')
    + `<tr><th>Reference trees (not at the edge)</th>${units.map(u => `<td class="num">${f(u.sp && u.sp.nRef, 0)}</td>`).join('')}</tr>`
    + `<tr><th>Mean Hegyi index</th>${units.map(u => { const t = (u.ci && u.ci.trees || []).filter(x => x.ref && Number.isFinite(x.hegyi)); return `<td class="num">${t.length ? f(t.reduce((a, x) => a + x.hegyi, 0) / t.length) : '–'}</td>`; }).join('')}</tr>`, 'rv-spatial')
    + '<p class="muted small">R &lt; 1 clustered, R &gt; 1 regular (Clark and Evans 1954). The mean Hegyi index is the mean over the reference trees of the record.</p>';
  h += '</section><section class="rv-sec"><h3>Charts</h3>';
  const cls = (units.find(u => (u.st.classes || []).length) || {}).st;
  if (cls) {
    const C = cls.classes, last = C.reduce((a, c, i) => units.some(u => u.st.classes[i] && u.st.classes[i].Nha > 0) ? i : a, 0), CC = C.slice(0, last + 1);
    h += fig('rv-ch-cls', barChart({ title: 'Diameter distribution (trees/ha)', categories: CC.map(c => c.hi == null || c.hi === Infinity ? `≥ ${c.lo}` : `${c.lo}–${c.hi}`), series: units.slice(0, 6).map(u => ({ name: lab(u), values: CC.map((c, i) => u.st.classes[i] ? u.st.classes[i].Nha : null) })), xLabel: 'Diameter class (cm)', yLabel: 'trees/ha', fmt: v => fmtNum(v, 0), height: 320 }));
  }
  const lz = units.filter(u => Array.isArray(u.lorenz) && u.lorenz.length > 1).slice(0, 6);
  if (lz.length) h += fig('rv-ch-lorenz', plotChart({ title: 'Lorenz curves of basal area', xmin: 0, xmax: 1, ymin: 0, ymax: 1, lines: [{ k: 5, dash: true, pts: [[0, 0], [1, 1]] }, ...lz.map((u, i) => ({ k: i, pts: u.lorenz }))], xLabel: 'Share of trees (ascending d)', yLabel: 'Share of basal area', fmt: v => fmtNum(v, 2), width: 520, height: 420 }))
    + `<p class="rv-keys small">${lz.map((u, i) => `<span><svg width="22" height="10" aria-hidden="true"><line class="ch-line ch-l${i % 6}" x1="1" x2="21" y1="5" y2="5"/></svg> ${esc(lab(u))} (Gini ${f(u.st.measures && u.st.measures.gini)})</span>`).join('')}<span>- - - equality</span></p>`;
  if (units.some(u => u.sp && u.sp.means)) h += fig('rv-ch-spat', barChart({ title: 'Mean structure indices by plot', categories: ['W', 'M', 'T', 'U'], series: units.slice(0, 6).map(u => ({ name: lab(u), values: ['W', 'M', 'T', 'U'].map(k => u.sp && u.sp.means ? u.sp.means[k] : null) })), yLabel: 'mean', fmt: v => fmtNum(v, 2), height: 280 }));
  h += '<p class="muted small">Tree lists (relative sizes, BAL, neighbour indices, Hegyi) are in the run record; the stem map needs the coordinates, which a saved result does not show.</p></section>';
  return h;
}
