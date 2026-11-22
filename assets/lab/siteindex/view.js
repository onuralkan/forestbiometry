// Site Index: a saved run record shown again (22 Nov 2026; Account → Saved results). The equation (form, coefficients,
// source, base age, age type), the classes, the site index of each unit with its class, and the guide curves of the
// class limits drawn from the saved equation, with the units as points. Pure HTML, no DOM.
import * as S from './calc.js';
import { fmtNum, esc } from '../core/i18n.js';
import { plotChart, barChart } from '../core/chart.js';

const f = (x, d = 2) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const fig = (id, svg) => { const t = (svg.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; return `<figure class="chartbox" id="${id}"><p class="small rv-figt"><b>${t}</b></p>${svg}</figure>`; };
const tbl = (head, body, id = '') => `<div class="tscroll"><table class="grid"${id ? ` id="${id}"` : ''}><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
const AGE = { total: 'total age', bh: 'breast-height age' };

export function viewRecord(rec) {
  const m = rec.model, res = rec.results || [], set = rec.set || {}, cls = rec.classes || [];
  if (!m || !m.form || !res.length) return null;
  const F = S.FORMS[m.form] || {};
  let h = `<section class="rv-sec"><h3>Equation</h3><dl class="kv small" id="rv-settings">
    <dt>Form</dt><dd>${esc(F.formula ? F.formula.en : m.form)}</dd><dt>Coefficients</dt><dd>${Object.entries(m.params || {}).map(([k, v]) => `${esc(k)} = ${f(v, 6)}`).join(', ')}</dd>
    <dt>Base age</dt><dd>${esc(m.baseAge)} years (${esc(AGE[m.ageType] || m.ageType)})</dd>
    ${set.meta && set.meta.topDef ? `<dt>Top height</dt><dd>${esc(set.meta.topDef)}</dd>` : ''}${set.valid && set.valid.A ? `<dt>Valid ages</dt><dd>${set.valid.A.map(esc).join('–')}</dd>` : ''}
    <dt>Source</dt><dd>${esc(set.source ? set.source.citation || set.source : '–')} <span class="muted">(${esc(set.origin || '')})</span></dd>
    ${cls.length ? `<dt>Classes (SI, m)</dt><dd>${cls.map(c => `${esc(c.name)}: ${f(c.lo, 1)}–${f(c.hi, 1)}`).join(', ')}</dd>` : ''}
    <dt>Uncertainty</dt><dd>${esc(rec.uncertainty && rec.uncertainty.method || 'none')}</dd></dl></section>`;
  const unc = res.some(r => r.ci || r.boot);
  h += `<section class="rv-sec"><h3>Site index</h3>` + tbl(`<tr><th>Unit</th><th>Age (years)</th><th>Height (m)</th><th>Site index (m)</th><th>Class</th>${unc ? '<th>Interval</th>' : ''}<th>Notes</th></tr>`,
    res.slice(0, 300).map(r => `<tr><th>${esc(r.unit ?? r.key)}${r.period != null ? ` / ${esc(r.period)}` : ''}</th><td class="num">${f(r.A, 1)}</td><td class="num">${f(r.H, 2)}</td><td class="num"><b>${r.status === 'ok' ? f(r.si, 2) : '–'}</b></td><td>${esc(r.cls ?? '–')}</td>
      ${unc ? `<td class="num">${r.ci ? `${f(r.ci.lo, 2)} – ${f(r.ci.hi, 2)}` : '–'}</td>` : ''}<td class="small">${[r.status !== 'ok' ? r.status : '', ...(r.problems || []).map(p => p.code), ...(r.warnings || []).map(w => w.code || w)].filter(Boolean).map(esc).join(', ')}</td></tr>`).join(''), 'rv-si')
    + (res.length > 300 ? `<p class="muted small">First 300 of ${res.length} units.</p>` : '');
  // guide curves of the class limits, the units as points
  const okR = res.filter(r => r.status === 'ok' && Number.isFinite(r.A) && Number.isFinite(r.H));
  const lims = [...new Set(cls.flatMap(c => [c.lo, c.hi]).filter(Number.isFinite))].sort((a, b) => a - b);
  const amax = Math.max(m.baseAge * 2, ...(set.valid && set.valid.A ? [set.valid.A[1]] : []), ...okR.map(r => r.A * 1.2));
  const ages = Array.from({ length: 121 }, (_, i) => Math.max(1, amax * i / 120));
  if (lims.length || okR.length) {
    const sis = lims.length ? lims : [...new Set(okR.map(r => +r.si.toFixed(1)))].slice(0, 8);
    let lines = [];
    try { lines = sis.map((si, i) => ({ k: i, pts: S.curve(m, si, ages).map(([a, v]) => [a, v == null ? NaN : v]) })); } catch (e) { lines = []; }
    h += fig('rv-ch-si', plotChart({ title: `Site index curves (SI at base age ${m.baseAge})`, xmin: 0, xmax: amax, ymin: 0, lines, points: okR.map(r => [r.A, r.H]), xLabel: `Age (years, ${AGE[m.ageType] || m.ageType})`, yLabel: 'Top height (m)', fmt: x => fmtNum(x, 3), width: 760, height: 420 }))
      + `<p class="rv-keys small">${sis.map((si, i) => `<span><svg width="22" height="10" aria-hidden="true"><line class="ch-line ch-l${i % 6}" x1="1" x2="21" y1="5" y2="5"/></svg> SI = ${f(si, 1)} m</span>`).join('')}<span>● units</span></p>`
      + (set.valid && set.valid.A ? `<p class="muted small">The equation is stated as valid for ages ${set.valid.A.map(esc).join('–')}.</p>` : '');
  }
  if (cls.length && okR.length > 1) {
    const counts = cls.map(c => okR.filter(r => r.cls === c.name).length);
    h += fig('rv-ch-cls', barChart({ title: 'Units by site class', categories: cls.map(c => c.name), series: [{ name: 'Units', values: counts }], yLabel: 'Units', fmt: x => fmtNum(x, 0), height: 240 }));
  }
  return { html: h + '</section>', rest: rec.uncertainty && rec.uncertainty.method !== 'none' ? ['uncertainty'] : [] };
}
