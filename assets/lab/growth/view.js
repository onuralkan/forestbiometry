// Growth Function Fitter: a saved run record shown again (22 Nov 2026; Account → Saved results). The fitted forms with
// parameters, errors and derived values, and their curves with current and mean annual increment drawn from the saved
// parameters. The record does not keep the ages of the data, so the curves run to 1.5 × the latest culmination age of
// the mean increment (or a clear multiple of the inflection age); the observations are not drawn. Pure HTML, no DOM.
import * as G from './calc.js';
import { fmtNum, esc } from '../core/i18n.js';
import { plotChart, barChart } from '../core/chart.js';

const f = (x, d = 4) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const fig = (id, svg) => { const t = (svg.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; return `<figure class="chartbox" id="${id}"><p class="small rv-figt"><b>${t}</b></p>${svg}</figure>`; };
const tbl = (head, body, id = '') => `<div class="tscroll"><table class="grid"${id ? ` id="${id}"` : ''}><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
const fname = id => (G.FORMS[id] && G.FORMS[id].name) || id;
const keys = (ok, cls) => `<p class="rv-keys small">${ok.map((x, i) => `<span><svg width="22" height="10" aria-hidden="true"><line class="ch-line ch-l${i % 6}" x1="1" x2="21" y1="5" y2="5"/></svg> ${esc(fname(x.form))}</span>`).join('')}</p>`;

export function viewRecord(rec) {
  const fits = rec.fits || [], st = rec.settings || {}, cols = st.columns || {};
  if (!fits.length) return null;
  const v = rec.variable || 'y', u = rec.unit ? ` (${rec.unit})` : '';
  let h = `<section class="rv-sec"><h3>Settings</h3><dl class="kv small" id="rv-settings"><dt>Variable</dt><dd>${esc(v)}${esc(u)}</dd>
    <dt>Columns</dt><dd>age: ${esc(cols.t)}, size: ${esc(cols.y)}${cols.series ? `, series: ${esc(cols.series)}` : ''}</dd><dt>Observations</dt><dd>${esc(rec.n)}</dd></dl></section>`;
  const ok = fits.filter(x => x.status === 'ok' && Array.isArray(x.theta) && G.FORMS[x.form]);
  const best = ok.length ? ok.reduce((a, b) => (b.aic ?? Infinity) < (a.aic ?? Infinity) ? b : a) : null;
  h += `<section class="rv-sec"><h3>Fitted forms</h3>` + tbl('<tr><th>Form</th><th>Formula</th><th>Parameters (SE)</th><th>n</th><th>Bias</th><th>RMSE</th><th>AIC</th><th>Asymptote</th><th>Inflection age</th><th>Max CAI</th><th>MAI culminates</th><th>Max MAI</th></tr>',
    fits.map(x => { const F = G.FORMS[x.form] || {}, d = x.derived || {};
      return `<tr><th>${esc(fname(x.form))}${best === x ? ' ★' : ''}</th><td class="small"><code>${esc(F.formula || '')}</code></td>
        <td class="small">${x.status !== 'ok' ? `<span class="warn">${esc(x.status)}</span>` : Object.entries(x.params || {}).map(([k, p]) => `${esc(k)} = ${f(p, 5)}${x.se && x.se[k] != null ? ` (${f(x.se[k], 4)})` : ''}`).join('<br>')}</td>
        <td class="num">${esc(x.n ?? '–')}</td><td class="num">${f(x.bias)}</td><td class="num">${f(x.rmse)}</td><td class="num">${f(x.aic, 2)}</td><td class="num">${f(d.asymptote, 3)}</td><td class="num">${f(d.inflection, 1)}</td><td class="num">${f(d.caiMax, 4)}</td><td class="num">${f(d.maiCulmination, 1)}</td><td class="num">${f(d.maiMax, 4)}</td></tr>`; }).join(''), 'rv-fits')
    + `<p class="muted small">★ smallest AIC. e = observed − predicted. ${fits.some(x => x.seNote === 'independent-observations') ? 'Standard errors assume independent observations; repeated measurements of one series are not independent.' : ''}</p>`;
  if (ok.length) {
    const ends = ok.map(x => { const d = x.derived || {}; return d.maiCulmination ? 1.5 * d.maiCulmination : d.inflection ? 4 * d.inflection : null; }).filter(Number.isFinite);
    const tEnd = ends.length ? Math.max(...ends) : 100, step = tEnd / 200;
    const C = ok.map(x => G.curve(x.form, x.theta, tEnd, step));
    const L = k => C.map((c, i) => ({ k: i, pts: c.map(p => [p.t, Number.isFinite(p[k]) ? p[k] : NaN]) }));
    // increments near age 0 can be very large (y/t with y(0) > 0): the scale follows the values from 10 % of the range on
    const top = k => 1.15 * Math.max(...C.flatMap(c => c.filter(p => p.t >= tEnd * 0.1).map(p => p[k])).filter(Number.isFinite));
    h += fig('rv-ch-curve', plotChart({ title: `Fitted growth curves · ${v}${u}`, xmin: 0, xmax: tEnd, ymin: 0, lines: L('y'), xLabel: 'Age (years)', yLabel: v + u, fmt: x => fmtNum(x, 3), width: 760, height: 400 })) + keys(ok)
      + `<div class="charts2">${fig('rv-ch-cai', plotChart({ title: 'Current annual increment (CAI)', xmin: 0, xmax: tEnd, ymin: 0, ymax: top('cai'), lines: L('cai'), xLabel: 'Age (years)', yLabel: 'CAI' + u, fmt: x => fmtNum(x, 3) }))}${fig('rv-ch-mai', plotChart({ title: 'Mean annual increment (MAI)', xmin: 0, xmax: tEnd, ymin: 0, ymax: top('mai'), lines: L('mai'), xLabel: 'Age (years)', yLabel: 'MAI' + u, fmt: x => fmtNum(x, 3) }))}</div>`
      + `<p class="muted small">The record does not keep the ages of the data: the curves run to age ${fmtNum(tEnd, 0)} and may go beyond the observed range; the observations are not drawn.</p>`
      + fig('rv-ch-rmse', barChart({ title: 'RMSE by form', categories: ok.map(x => fname(x.form)), series: [{ name: 'RMSE', values: ok.map(x => x.rmse) }], yLabel: 'RMSE' + u, fmt: x => fmtNum(x, 3), height: 260 }));
  }
  return h + '</section>';
}
