// Plot & Stand Metrics: a saved run record shown again (22 Nov 2026; Account → Saved results). Per period: the plot
// table, N/ha and G/ha by plot, the diameter classes, the between-plot summary and the design-based forest estimate,
// all from the saved numbers. Nothing is recomputed. Pure HTML, no DOM.
import { fmtNum, esc } from '../core/i18n.js';
import { barChart, intervalChart } from '../core/chart.js';

const f = (x, d = 2) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const fig = (id, svg) => { const t = (svg.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; return `<figure class="chartbox" id="${id}"><p class="small rv-figt"><b>${t}</b></p>${svg}</figure>`; };
const tbl = (head, body, id = '') => `<div class="tscroll"><table class="grid"${id ? ` id="${id}"` : ''}><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
const STATE = { measured: 'measured', empty: 'empty (no trees)', unmeasured: 'not measured', unknown: 'not decided' };
const VARS = [['Nha', 'N (trees/ha)', 1], ['Gha', 'G (m²/ha)', 2], ['d_mean', 'Mean d (cm)', 1], ['dq', 'Dq (cm)', 1], ['hL', "Lorey's h_L (m)", 1], ['area_m2', 'Plot area (m²)', 0]];
const clsLabel = c => c.hi == null || c.hi === Infinity || c.hi === null ? `≥ ${c.lo}` : `${c.lo}–${c.hi}`;

export function viewRecord(rec) {
  const units = rec.units || [], st = rec.settings || {};
  if (!units.length) return null;
  const des = st.design || {};
  let h = `<section class="rv-sec"><h3>Settings</h3><dl class="kv small" id="rv-settings">
    <dt>Data</dt><dd>${esc(st.source ? st.source.name || st.source.kind : '–')}</dd>
    <dt>Plot × period without records</dt><dd>${esc(st.emptyCombos === 'empty' ? 'counted as empty (N = G = 0)' : st.emptyCombos === 'unmeasured' ? 'counted as not measured' : st.emptyCombos || '–')}</dd>
    <dt>Diameter classes (cm)</dt><dd>${(st.classes || []).map(c => esc(clsLabel(c))).join(', ') || '–'}</dd>
    <dt>Dominant trees</dt><dd>D0 and H0: the ${esc(st.dominant ? st.dominant.perHa : 100)} thickest / tallest trees per ha</dd>
    <dt>Forest estimate</dt><dd>${des.type ? `${esc(des.type === 'srs' ? 'simple random sampling' : des.type)}${des.forestArea_ha ? `, forest area ${esc(des.forestArea_ha)} ha` : ''}, level ${esc(des.level)}` : 'none'}</dd></dl></section>`;
  const periods = rec.periods && rec.periods.length ? rec.periods : [null];
  periods.forEach((per, pi) => {
    const us = units.filter(u => (u.period ?? null) === (per ?? null)), meas = us.filter(u => u.state === 'measured' || u.state === 'empty');
    const bp = (rec.byPeriod || []).find(b => (b.period ?? null) === (per ?? null)) || {};
    h += `<section class="rv-sec"><h3>${per == null ? 'All plots' : `Period ${esc(per)}`}</h3>`;
    if (bp.unknown) h += `<p class="note warn small">${esc(bp.unknown)} plot × period combination(s) not decided.</p>`;
    h += tbl('<tr><th>Plot</th><th>State</th><th>Area (m²)</th><th>Trees</th><th>N/ha</th><th>G/ha (m²)</th><th>Mean d</th><th>Dq</th><th>Dmin</th><th>Dmax</th><th>h_L (m)</th><th>D0</th><th>H0</th></tr>',
      us.map(u => `<tr><th>${esc(u.plot_id)}</th><td class="small">${esc(STATE[u.state] || u.state)}</td><td class="num">${f(u.area_m2, 0)}</td><td class="num">${f(u.n, 0)}</td><td class="num">${f(u.Nha, 1)}</td><td class="num">${f(u.Gha, 2)}</td><td class="num">${f(u.d_mean, 1)}</td><td class="num">${f(u.dq, 1)}</td><td class="num">${f(u.d_min, 1)}</td><td class="num">${f(u.d_max, 1)}</td><td class="num">${f(u.hL && u.hL.value, 1)}</td><td class="num">${f(u.dom && u.dom.D0, 1)}</td><td class="num">${f(u.dom && u.dom.H0, 1)}</td></tr>`).join(''), 'rv-units-' + pi);
    if (meas.length) {
      const cats = meas.map(u => String(u.plot_id));
      h += `<div class="charts2">${fig('rv-ch-n-' + pi, barChart({ title: `N/ha by plot${per != null ? ` · ${per}` : ''}`, categories: cats, series: [{ name: 'N/ha', values: meas.map(u => u.Nha) }], yLabel: 'trees/ha', fmt: v => fmtNum(v, 0), height: 280 }))}`
        + `${fig('rv-ch-g-' + pi, barChart({ title: `G/ha by plot${per != null ? ` · ${per}` : ''}`, categories: cats, series: [{ name: 'G/ha', values: meas.map(u => u.Gha) }], yLabel: 'm²/ha', fmt: v => fmtNum(v, 1), height: 280 }))}</div>`;
      // diameter classes: N/ha per class and plot, as the units carry them
      const cls = (meas.find(u => Array.isArray(u.classes) && u.classes.length) || {}).classes;
      if (cls) {
        const show = meas.filter(u => Array.isArray(u.classes)).slice(0, 8);
        h += `<h4>Diameter classes (N/ha)</h4>` + tbl(`<tr><th>Class (cm)</th>${show.map(u => `<th>${esc(u.plot_id)}</th>`).join('')}</tr>`, cls.map((c, j) => `<tr><th>${esc(clsLabel(c))}</th>${show.map(u => `<td class="num">${f(u.classes[j] && u.classes[j].Nha, 1)}</td>`).join('')}</tr>`).join(''))
          + fig('rv-ch-cls-' + pi, barChart({ title: `N/ha by diameter class${per != null ? ` · ${per}` : ''}`, categories: cls.map(clsLabel), series: show.map(u => ({ name: String(u.plot_id), values: u.classes.map(c => c.Nha) })), xLabel: 'Diameter class (cm)', yLabel: 'trees/ha', fmt: v => fmtNum(v, 0), height: 300 }))
          + (meas.length > show.length ? `<p class="muted small">Classes are shown for the first ${show.length} of ${meas.length} plots; the record holds all.</p>` : '');
      }
      // species composition by plot (share of G)
      const sp = [...new Set(meas.flatMap(u => (u.species || []).map(s => s.species)))];
      if (sp.length) h += `<h4>Species (share of basal area, %)</h4>` + tbl(`<tr><th>Plot</th>${sp.map(s => `<th>${esc(s)}</th>`).join('')}</tr>`, meas.map(u => `<tr><th>${esc(u.plot_id)}</th>${sp.map(s => { const x = (u.species || []).find(y => y.species === s); return `<td class="num">${x ? f(100 * x.shareG, 1) : '–'}</td>`; }).join('')}</tr>`).join(''));
    }
    // between-plot summary
    if (bp.between) {
      const b = bp.between;
      h += `<h4>Between plots</h4><p class="small">${esc(b.m)} plots${b.mEmpty ? `, ${esc(b.mEmpty)} empty` : ''}. Unweighted summary of the plot values; not a design-based estimate.</p>`
        + tbl('<tr><th></th><th>n</th><th>Mean</th><th>SD</th><th>Min</th><th>Median</th><th>Max</th></tr>', VARS.filter(([k]) => b[k]).map(([k, l, d]) => { const s = b[k]; return `<tr><th>${esc(l)}</th><td class="num">${f(s.n, 0)}</td><td class="num">${f(s.mean, d + 1)}</td><td class="num">${f(s.sd, d + 1)}</td><td class="num">${f(s.min, d)}</td><td class="num">${f(s.median, d)}</td><td class="num">${f(s.max, d)}</td></tr>`; }).join(''));
    }
    // design-based forest estimate
    const fo = bp.forest;
    if (fo && fo.estimate) {
      const lvl = fmtNum(100 * (fo.level || des.level || 0.95), 0), E = fo.estimate;
      const rows = Object.entries(E).map(([k, e]) => { const [v, s] = k.split(':'); return { k, v, s, e }; });
      h += `<h4>Forest estimate (${esc(lvl)}% confidence interval)</h4>` + (fo.problems && fo.problems.length ? `<p class="note warn small">${fo.problems.map(p => esc(p.code || p)).join(', ')}</p>` : '')
        + tbl(`<tr><th>Variable</th><th>Species</th><th>Mean per ha</th><th>SE</th><th>RSE %</th><th>Lower</th><th>Upper</th>${des.forestArea_ha ? '<th>Total</th><th>Total lower</th><th>Total upper</th>' : ''}</tr>`,
          rows.map(({ v, s, e }) => `<tr><th>${v === 'Nha' ? 'N/ha' : v === 'Gha' ? 'G/ha (m²)' : esc(v)}</th><td>${s ? esc(s) : 'all'}</td><td class="num">${f(e.mean, 2)}</td><td class="num">${f(e.se, 2)}</td><td class="num">${f(e.rse == null ? null : 100 * e.rse, 1)}</td><td class="num">${f(e.ci && e.ci.lo, 2)}</td><td class="num">${f(e.ci && e.ci.hi, 2)}</td>${des.forestArea_ha ? `<td class="num">${f(e.total, 0)}</td><td class="num">${f(e.ci_total && e.ci_total.lo, 0)}</td><td class="num">${f(e.ci_total && e.ci_total.hi, 0)}</td>` : ''}</tr>`).join(''), 'rv-forest-' + pi);
      const g = rows.filter(r => r.v === 'Gha' && r.e && r.e.mean != null);
      if (g.length > 1) h += fig('rv-ch-forest-' + pi, intervalChart({ title: `G/ha with ${lvl}% confidence interval${per != null ? ` · ${per}` : ''}`, items: g.map(r => ({ label: r.s || 'all species', est: r.e.mean, lo: r.e.ci && r.e.ci.lo, hi: r.e.ci && r.e.ci.hi })), xLabel: 'G (m²/ha)', ref: 0, fmt: v => fmtNum(v, 2) }));
    }
    h += '</section>';
  });
  return h;
}
