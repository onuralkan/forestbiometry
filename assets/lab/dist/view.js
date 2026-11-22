// Diameter Distribution: a saved run record shown again (22 Nov 2026; Account → Saved results). Per plot and period:
// the fits with their parameters and fit statistics, and the fitted density and cumulative curves drawn from the saved
// parameters (thresholded fits conditionally, as in the tool). The histogram, the empirical curves and the Q–Q / P–P
// plots need the diameters, which a saved result does not keep. Bootstrap runs and sources are left to the generic
// view (rest). Pure HTML, no DOM.
import * as D from './index.js';
import { T } from './i18n.js';
import { fmtNum, esc } from '../core/i18n.js';
import { plotChart } from '../core/chart.js';

const f = (x, d = 4) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const fig = (id, svg) => { const t = (svg.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; return `<figure class="chartbox" id="${id}"><p class="small rv-figt"><b>${t}</b></p>${svg}</figure>`; };
const MAX_CHART_UNITS = 20;

const famOf = r => { try { const F = D.family(r.family); return r.truncation && r.truncation.logMass != null ? D.trunc.truncated(F, r.params, r.truncation) : F; } catch (e) { return null; } };
const parLabel = (fam, k) => { try { const q = D.family(fam).params.find(x => x.key === k); return q ? `${q.label ?? q.key}${q.unit ? ` (${q.unit})` : ''}` : k; } catch (e) { return k; } };
const name = r => `${T('fam.' + r.family)} · ${T('m.' + r.method)}${Object.keys(r.fixed || {}).length ? ` (${Object.entries(r.fixed).map(([k, v]) => `${k} = ${f(v && v.value)}`).join(', ')})` : ''}`;
const unitName = (plot, period) => `${plot == null ? T('unit.pool') : T('unit.plot', { p: plot })}${period != null ? ` / ${period}` : ''}`;

export function viewRecord(rec) {
  const res = Array.isArray(rec.results) ? rec.results : [];
  if (!res.length) return null;
  const st = rec.settings || {};
  let h = `<section class="rv-sec"><h3>Settings</h3><dl class="kv small" id="rv-settings">
    <dt>Source</dt><dd>${esc(rec.source || '–')}</dd><dt>Data</dt><dd>${st.dataType === 'classes' ? 'Diameter classes' : 'Measured diameters'}${st.unit ? ` · ${esc(st.unit)}` : ''}</dd>
    ${st.threshold ? `<dt>Measurement threshold</dt><dd>${esc(Object.entries(st.threshold).filter(([, v]) => v != null).map(([k, v]) => `${k} = ${v}`).join(', '))}</dd>` : ''}
    ${st.fixedLocation != null ? `<dt>Fixed location a</dt><dd>${f(st.fixedLocation)}</dd>` : ''}
    <dt>Methods</dt><dd>${Object.keys(st.methods || {}).map(id => esc(T('m.' + id))).join(', ') || '–'}</dd></dl></section>`;
  // units in the order of the record
  const units = [];
  for (const r of res) { const k = JSON.stringify([r.data && r.data.plot, r.data && r.data.period]); let u = units.find(x => x.k === k); if (!u) units.push(u = { k, plot: r.data ? r.data.plot : null, period: r.data ? r.data.period : null, results: [] }); u.results.push(r); }
  h += `<section class="rv-sec"><h3>Fits by plot and period</h3><p class="muted small">${units.length} unit(s), ${res.length} fit(s). ${T('p.note')}</p>`;
  units.forEach((u, ui) => {
    const ok = u.results.filter(r => r.status === 'ok' && r.params);
    h += `<details class="rv-unit"${ui < 3 ? ' open' : ''}><summary><b>${esc(unitName(u.plot, u.period))}</b> <span class="muted small">n = ${esc(u.results[0].data && u.results[0].data.n)} · ${ok.length} of ${u.results.length} fits completed</span></summary>`;
    h += `<div class="tscroll"><table class="grid rv-fits"><thead><tr><th>Fit</th><th>Status</th><th>Parameters</th><th>log L</th><th>AIC</th><th>BIC</th><th>KS D</th><th>AD A²</th><th>CvM W²</th></tr></thead><tbody>`
      + u.results.map(r => { const g = r.fit || {};
        return `<tr><th>${esc(name(r))}</th><td>${r.status === 'ok' ? 'ok' : `<span class="warn">${esc(r.status)}${r.error ? ': ' + esc(r.error.code) : ''}</span>`}</td>
          <td class="small">${r.params ? Object.entries(r.params).map(([k, v]) => `${esc(parLabel(r.family, k))} = ${f(v)}`).join('<br>') : '–'}</td>
          <td class="num">${f(r.logLik, 3)}</td><td class="num">${f(g.aic, 3)}</td><td class="num">${f(g.bic, 3)}</td><td class="num">${f(g.ks)}</td><td class="num">${f(g.ad)}</td><td class="num">${f(g.cvm)}</td></tr>`
          + (r.warnings && r.warnings.length ? `<tr><td></td><td colspan="8" class="small muted">${r.warnings.map(w => esc(w.code)).join(', ')}</td></tr>` : ''); }).join('')
      + '</tbody></table></div>';
    if (ok.length && ui < MAX_CHART_UNITS) {
      const fams = ok.map(r => [r, famOf(r)]).filter(([, F]) => F);
      // x range: the median of the fits' 0.2 % and 99.8 % quantiles, so one heavy-tailed fit does not flatten the others
      const qs = []; for (const [r, F] of fams) { try { const a = F.quantile(0.002, r.params), b = F.quantile(0.998, r.params); if (Number.isFinite(a) && Number.isFinite(b)) qs.push([a, b]); } catch (e) { /* skip */ } }
      const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; };
      const lo = med(qs.map(q => q[0])), hi = med(qs.map(q => q[1])) * 1.1;
      if (Number.isFinite(lo) && Number.isFinite(hi) && hi > lo) {
        const xmin = Math.max(0, lo - (hi - lo) * 0.03), xmax = hi + (hi - lo) * 0.03, xs = Array.from({ length: 301 }, (_, i) => xmin + (xmax - xmin) * i / 300);
        const line = fn => fams.map(([r, F], i) => ({ k: i, dash: r.estimator !== 'ml', pts: xs.map(x => { try { const v = F[fn](x, r.params); return [x, Number.isFinite(v) ? v : NaN]; } catch (e) { return [x, NaN]; } }) }));
        const fm = v => fmtNum(v, 3);
        h += `<div class="charts2">${fig('rv-ch-pdf-' + ui, plotChart({ title: `Fitted densities · ${unitName(u.plot, u.period)}`, xmin, xmax, lines: line('pdf'), xLabel: T('ch.d'), yLabel: T('ch.dens'), fmt: fm }))}`
          + `${fig('rv-ch-cdf-' + ui, plotChart({ title: `Fitted cumulative distributions · ${unitName(u.plot, u.period)}`, xmin, xmax, ymin: 0, ymax: 1, lines: line('cdf'), xLabel: T('ch.d'), yLabel: T('ch.F'), fmt: fm }))}</div>`
          + `<p class="rv-keys small">${fams.map(([r], i) => `<span><svg width="22" height="10" aria-hidden="true"><line class="ch-line ch-l${i % 6}${r.estimator !== 'ml' ? ' ch-dash' : ''}" x1="1" x2="21" y1="5" y2="5"/></svg> ${esc(name(r))}</span>`).join('')}</p>`;
      }
    } else if (ok.length && ui === MAX_CHART_UNITS) h += `<p class="muted small">Curves are drawn for the first ${MAX_CHART_UNITS} units only.</p>`;
    h += '</details>';
  });
  h += `<p class="muted small">Dashed curves: methods that do not maximise the likelihood. The histogram, the empirical curves and the Q–Q and P–P plots need the diameters, which a saved result does not keep: open the data in the tool to see them.</p></section>`;
  return { html: h, rest: ['bootstrap', 'sources'] };
}
