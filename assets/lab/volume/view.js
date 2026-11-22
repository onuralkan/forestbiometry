// Volume Equations: a saved run record shown again (22 Nov 2026; Account → Saved results). The fitted forms with
// coefficients, standard errors, back-transformation correction and errors on the volume scale, compared in charts.
// The record keeps no trees, so no curves over diameter are drawn (their range is not known). Pure HTML, no DOM.
import * as V from './calc.js';
import { fmtNum, esc } from '../core/i18n.js';
import { barChart, intervalChart } from '../core/chart.js';

const f = (x, d = 4) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const g = x => x == null || !Number.isFinite(x) ? '–' : Math.abs(x) !== 0 && (Math.abs(x) < 1e-3 || Math.abs(x) >= 1e6) ? x.toExponential(4) : fmtNum(x, 6);
const fig = (id, svg) => { const t = (svg.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; return `<figure class="chartbox" id="${id}"><p class="small rv-figt"><b>${t}</b></p>${svg}</figure>`; };
const tbl = (head, body, id = '') => `<div class="tscroll"><table class="grid"${id ? ` id="${id}"` : ''}><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
const FN = { cf: 'Constant form factor', cv: 'Combined variable', ln: 'Logarithmic (Schumacher–Hall)', loc: 'Local (D only)' };
const name = x => `${FN[x.form] || x.form}${x.eq ? ` (eq. ${x.eq})` : ''}`;

export function viewRecord(rec) {
  const fits = (rec.fits || []).filter(x => x && x.form);
  if (!fits.length) return null;
  const src = rec.source || {};
  let h = `<section class="rv-sec"><h3>Data</h3><dl class="kv small" id="rv-settings"><dt>Source</dt><dd>${esc(src.name || src.kind || '–')}</dd><dt>Bark</dt><dd>${esc({ ob: 'over bark', ib: 'inside bark', na: 'not stated' }[src.bark] || src.bark || '–')}</dd><dt>Trees used</dt><dd>${esc(fits[0].n ?? '–')}</dd></dl></section>`;
  h += `<section class="rv-sec"><h3>Fitted equations</h3><p class="note small">Errors on the volume scale: e = observed − predicted volume (m³).</p>`
    + tbl('<tr><th>Form</th><th>Formula</th><th>Coefficients (SE)</th><th>Weights</th><th>n</th><th>Bias</th><th>MAE</th><th>RMSE</th><th>R²</th><th>s</th></tr>',
      fits.map(x => { const F = V.FORMS[x.form] || {}, m = x.metrics || {}, pn = Object.keys(x.params || {});
        return `<tr><th>${esc(name(x))}</th><td class="small"><code>${esc(F.formula || '')}</code>${x.correction ? `<br><span class="muted">back-transformation: ${esc(typeof x.correction === 'string' ? x.correction : x.correction.kind || '')}${x.cf != null ? `, CF = ${f(x.cf, 5)}` : ''}</span>` : ''}</td>
          <td class="small">${pn.map((k, i) => `${esc(k)} = ${g(x.params[k])}${x.se && x.se[i] != null && F.scale !== 'log' ? ` (${g(x.se[i])})` : ''}`).join('<br>')}</td>
          <td class="small">${esc(x.weight && x.weight.kind !== 'none' ? x.weight.kind + (x.weight.k != null ? `, k = ${x.weight.k}` : '') : 'none')}</td>
          <td class="num">${esc(x.n ?? m.n ?? '–')}</td><td class="num">${f(m.bias)}</td><td class="num">${f(m.mae)}</td><td class="num">${f(m.rmse)}</td><td class="num">${m.r2 == null ? '–' : f(m.r2)}</td><td class="num">${f(x.s)}</td></tr>`; }).join(''), 'rv-fits')
    + (fits.some(x => V.FORMS[x.form] && V.FORMS[x.form].scale === 'log') ? '<p class="muted small">Standard errors of the logarithmic form are on the log scale and are in the run record.</p>' : '');
  const ok = fits.filter(x => x.metrics && x.metrics.rmse != null);
  if (ok.length) {
    h += `<div class="charts2">${fig('rv-ch-err', barChart({ title: 'MAE and RMSE by form', categories: ok.map(x => FN[x.form] || x.form), series: [{ name: 'MAE', values: ok.map(x => x.metrics.mae) }, { name: 'RMSE', values: ok.map(x => x.metrics.rmse) }], yLabel: 'm³', fmt: v => fmtNum(v, 3), height: 300 }))}`
      + `${fig('rv-ch-res', intervalChart({ title: 'Bias with the smallest and largest error', items: ok.map(x => ({ label: FN[x.form] || x.form, est: x.metrics.bias, lo: x.metrics.eMin, hi: x.metrics.eMax })), xLabel: 'e (m³)', ref: 0, fmt: v => fmtNum(v, 3) }))}</div>`
      + '<p class="muted small">The trees are not drawn: a saved result does not keep the data. Open the data in the tool for the residual plots.</p>';
  }
  return h + '</section>';
}
