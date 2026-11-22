// Height–Diameter: a saved run record shown again (22 Nov 2026; Account → Saved results). The models with their
// parameters and errors, the fitted curves drawn from the saved parameters over the fitted diameter range, the
// cross-validation and the predicted heights of new diameters. The scatter of the trees needs the data, which a saved
// result does not keep. Pure HTML, no DOM.
import * as H from './calc.js';
import { T } from './i18n.js';
import { fmtNum, esc } from '../core/i18n.js';
import { plotChart, barChart } from '../core/chart.js';

const f = (x, d = 4) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const fig = (id, svg) => { const t = (svg.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; return `<figure class="chartbox" id="${id}"><p class="small rv-figt"><b>${t}</b></p>${svg}</figure>`; };
const mName = id => { const t = T('m.' + id); return t === 'm.' + id ? id : t; };
const tbl = (head, body, id = '') => `<div class="tscroll"><table class="grid"${id ? ` id="${id}"` : ''}><thead>${head}</thead><tbody>${body}</tbody></table></div>`;

export function viewRecord(rec) {
  const fits = rec.fits || [], st = rec.settings || {}, data = rec.data || {}, bh = st.breastHeight ?? 1.3;
  if (!fits.length) return null;
  const cols = st.columns || {};
  let h = `<section class="rv-sec"><h3>Settings</h3><dl class="kv small" id="rv-settings">
    <dt>Columns</dt><dd>d: ${esc(cols.d)} (${esc(st.units && st.units.d)}), h: ${esc(cols.h)} (${esc(st.units && st.units.h)})${cols.plot ? `, plot: ${esc(cols.plot)}` : ''}${cols.species ? `, species: ${esc(cols.species)}` : ''}</dd>
    ${st.species != null ? `<dt>Species</dt><dd>${esc(st.species)}</dd>` : ''}${st.filterValue != null ? `<dt>Filter</dt><dd>${esc(cols.filter)} = ${esc(st.filterValue)}</dd>` : ''}
    <dt>Breast height</dt><dd>${f(bh, 2)} m</dd><dt>Trees fitted</dt><dd>${esc(data.fitted)} (d ${f(data.dmin, 1)}–${f(data.dmax, 1)} cm${data.plots ? `, ${data.plots} plots` : ''})</dd>
    <dt>Cross-validation</dt><dd>${esc(st.cv || 'none')}</dd>${st.model ? `<dt>Chosen model</dt><dd>${esc(mName(st.model))}</dd>` : ''}</dl>`;
  if (data.excluded) h += `<details><summary class="small">Rows read and left out</summary><dl class="kv small">${Object.entries(data.excluded).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>`;
  h += '</section>';
  // models
  const inf = !!rec.inference;
  h += `<section class="rv-sec"><h3>Models</h3><p class="note small">e = observed − predicted height. ${inf ? '' : 'Standard errors, intervals and AIC/BIC were not computed in this run.'}</p>`
    + tbl(`<tr><th>Model</th><th>Formula</th><th>Parameters</th><th>n</th><th>Bias</th><th>MAE</th><th>RMSE</th><th>σ̂</th>${inf ? '<th>AIC</th><th>BIC</th>' : ''}</tr>`,
      fits.map(x => `<tr${st.model === x.id ? ' class="is-active"' : ''}><th>${esc(mName(x.id))}${st.model === x.id ? ' ★' : ''}</th><td class="small"><code>${esc(x.formula)}</code></td>
        <td class="small">${x.status !== 'ok' ? `<span class="warn">${esc(x.status)}</span>` : (x.names || []).map((n, i) => `${esc(n)} = ${f(x.theta && x.theta[i], 5)}${x.se && x.se[i] != null ? ` (SE ${f(x.se[i], 4)})` : ''}`).join('<br>')}</td>
        <td class="num">${esc(x.n)}</td><td class="num">${f(x.bias)}</td><td class="num">${f(x.mae)}</td><td class="num">${f(x.rmse)}</td><td class="num">${f(x.sigma)}</td>${inf ? `<td class="num">${f(x.aic, 2)}</td><td class="num">${f(x.bic, 2)}</td>` : ''}</tr>`).join(''), 'rv-fits');
  const ok = fits.filter(x => x.status === 'ok' && Array.isArray(x.theta));
  if (ok.length && Number.isFinite(data.dmin) && Number.isFinite(data.dmax) && data.dmax > data.dmin) {
    const xmin = Math.max(0, data.dmin), xmax = data.dmax, xs = Array.from({ length: 201 }, (_, i) => xmin + (xmax - xmin) * i / 200);
    const lines = ok.map((x, i) => { let m; try { m = H.modelById(x.id); } catch (e) { m = null; } return m ? { k: i, dash: st.model && st.model !== x.id, pts: xs.map(d => { const v = bh + m.f(x.theta, d); return [d, Number.isFinite(v) ? v : NaN]; }) } : null; }).filter(Boolean);
    h += fig('rv-ch-curves', plotChart({ title: 'Fitted height–diameter curves (fitted diameter range)', xmin, xmax, ymin: 0, lines, xLabel: 'Diameter d (cm)', yLabel: 'Height h (m)', fmt: v => fmtNum(v, 3), width: 760, height: 420 }))
      + `<p class="rv-keys small">${ok.map((x, i) => `<span><svg width="22" height="10" aria-hidden="true"><line class="ch-line ch-l${i % 6}${st.model && st.model !== x.id ? ' ch-dash' : ''}" x1="1" x2="21" y1="5" y2="5"/></svg> ${esc(mName(x.id))}</span>`).join('')}</p>`
      + `<p class="muted small">The trees themselves are not drawn: a saved result does not keep the data. Open the data in the tool to see them.</p>`;
  }
  h += '</section>';
  // cross-validation
  const cv = rec.crossValidation;
  if (cv) {
    h += `<section class="rv-sec"><h3>Cross-validation</h3>`;
    if (cv.problem) h += `<p class="note warn">Not computed: ${esc(cv.problem)}</p>`;
    else {
      h += `<p class="small">${cv.mode === 'plot' ? `By plot${cv.lopo ? ' (leave one plot out)' : ''}` : 'By tree'}, ${esc(cv.k)} folds. "Chosen" counts the folds in which the model had the smallest training error.</p>`
        + tbl('<tr><th>Model</th><th>n</th><th>Bias</th><th>MAE</th><th>RMSE</th><th>Chosen</th></tr>', (cv.models || []).map(x => `<tr><th>${esc(mName(x.id))}</th><td class="num">${esc(x.n)}</td><td class="num">${f(x.bias)}</td><td class="num">${f(x.mae)}</td><td class="num">${f(x.rmse)}</td><td class="num">${esc(x.chosen)}</td></tr>`).join('')
          + (cv.selection ? `<tr class="total"><th>Model selection in each fold</th><td class="num">${esc(cv.selection.n)}</td><td class="num">${f(cv.selection.bias)}</td><td class="num">${f(cv.selection.mae)}</td><td class="num">${f(cv.selection.rmse)}</td><td></td></tr>` : ''), 'rv-cv');
      const ms = (cv.models || []).filter(x => x.rmse != null);
      if (ms.length) h += fig('rv-ch-cv', barChart({ title: 'RMSE on the fitted trees and in cross-validation', categories: ms.map(x => mName(x.id)), series: [{ name: 'Fit', values: ms.map(x => { const fi = fits.find(y => y.id === x.id); return fi ? fi.rmse : null; }) }, { name: 'Cross-validation', values: ms.map(x => x.rmse) }], yLabel: 'RMSE (m)', fmt: v => fmtNum(v, 3), height: 300 }));
    }
    h += '</section>';
  }
  const nd = rec.newDiameters;
  if (nd && Array.isArray(nd.rows) && nd.rows.length) {
    h += `<section class="rv-sec"><h3>Predicted heights (${esc(mName(nd.model))})</h3>` + tbl('<tr><th>d (cm)</th><th>h (m)</th><th>Confidence interval</th><th>Prediction interval</th><th></th></tr>',
      nd.rows.slice(0, 200).map(x => `<tr><td class="num">${f(x.d, 2)}</td><td class="num">${f(x.h, 3)}</td><td class="num">${x.ci ? `${f(x.ci.lo, 3)} – ${f(x.ci.hi, 3)}` : '–'}</td><td class="num">${x.pi ? `${f(x.pi.lo, 3)} – ${f(x.pi.hi, 3)}` : '–'}</td><td class="small">${x.outside ? 'outside the fitted range' : ''}</td></tr>`).join(''), 'rv-nd')
      + (nd.rows.length > 200 ? `<p class="muted small">First 200 of ${nd.rows.length} rows.</p>` : '') + '</section>';
  }
  return h;
}
