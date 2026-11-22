// Model Evaluation: a saved run record shown again as tables and charts (22 Nov 2026, user decision; Account → Saved
// results). Draws only what the record holds: the measures overall and by group, row accounting, inference, bootstrap
// and rank uncertainty, with charts computed from those numbers. Charts that need the rows (observed–predicted,
// residuals) cannot be drawn: the record keeps no rows, and the server never keeps raw data. Pure HTML, no DOM.
import * as E from './calc.js';
import { T } from './i18n.js';
import { fmtNum, esc } from '../core/i18n.js';
import { barChart, intervalChart } from '../core/chart.js';

const f = (x, d = 4) => x == null ? '–' : fmtNum(x, d);
const fig = (id, svg) => { const t = (svg.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; return `<figure class="chartbox" id="${id}"><p class="small rv-figt"><b>${t}</b></p>${svg}</figure>`; };
const tbl = (head, body, id = '') => `<div class="tscroll"><table class="grid"${id ? ` id="${id}"` : ''}><thead>${head}</thead><tbody>${body}</tbody></table></div>`;

export function viewRecord(rec) {
  const st = rec.settings || {}, models = rec.models || [], rows = rec.rows || {}, inf = st.inference || {}, norm = st.norm || null;
  if (!models.length) return null;
  const r2Cell = m => m.r2 == null ? `<td class="num undef" title="${esc(T('r2.' + (m.r2Reason || 'n0')))}">${T('undef')}</td>` : `<td class="num">${f(m.r2, 4)}</td>`;
  const relCells = m => {
    if (!norm) return '';
    const r = m.rel;
    if (!r || r.reason) return `<td class="num undef" colspan="3">${T('undef')}${r ? ` (${T('rel.' + r.reason)})` : ''}</td><td class="num">${r && r.den != null ? f(r.den, 4) : '–'}</td>`;
    return `<td class="num">${f(r.bias, 2)}</td><td class="num">${f(r.mae, 2)}</td><td class="num">${f(r.rmse, 2)}</td><td class="num">${f(r.den, 4)}</td>`;
  };
  const head = first => `<tr><th>${first}</th><th>${T('m.n')}</th><th>${T('m.bias')}</th><th>${T('m.mae')}</th><th>${T('m.rmse')}</th><th>${T('m.r2')}</th>${norm ? `<th>${T('m.rbias')}</th><th>${T('m.rmae')}</th><th>${T('m.rrmse')}</th><th>${T('m.den')} (${T('norm.' + norm).replace(/ \(%\)$/, '')})</th>` : ''}<th>${T('m.mobs')}</th><th>${T('m.mpred')}</th></tr>`;
  const cells = m => `<td class="num">${fmtNum(m.n, 0)}</td><td class="num">${f(m.bias)}</td><td class="num">${f(m.mae)}</td><td class="num">${f(m.rmse)}</td>${r2Cell(m)}${relCells(m)}<td class="num">${f(m.meanObs)}</td><td class="num">${f(m.meanPred)}</td>`;
  const role = r => T('role.' + (r || 'unknown'));
  const fmt = v => fmtNum(v, 3);

  // settings
  let h = `<section class="rv-sec"><h3>Settings</h3><dl class="kv small" id="rv-settings">
    <dt>${T('x.obs')}</dt><dd>${esc(st.observed)}</dd>
    ${models.map(m => `<dt>${T('m.model')}: ${esc(m.name)}</dt><dd>${esc(m.column)} · ${role(m.role)}</dd>`).join('')}
    <dt>${T('x.rs')}</dt><dd>${st.rowSet ? T('rs.' + st.rowSet) : '–'}</dd>
    <dt>${T('x.norm')}</dt><dd>${norm ? T('norm.' + norm) : T('norm.none')}</dd>
    <dt>${T('x.weight')}</dt><dd>${st.weight ? esc(st.weight) : T('none')}</dd>
    <dt>${T('x.level')}</dt><dd>${inf.level ?? '–'}</dd>
    <dt>${T('x.mtype')}</dt><dd>${inf.margin ? `${T('eq.' + inf.margin.type)}: ${esc(inf.margin.value)}, α = ${esc(inf.alpha)}` : T('eq.none')}</dd>
    <dt>${T('bt.h')}</dt><dd>${inf.bootstrap ? `B = ${fmtNum(inf.bootstrap.B, 0)}, ${T('bt.seed')} = ${esc(inf.bootstrap.seed)}` : T('eq.none')}</dd>
    ${Object.entries(st.groups || {}).filter(([, v]) => v).map(([k, v]) => `<dt>${T('grp.' + k)}</dt><dd>${esc(typeof v === 'object' ? `${v.column}; ${(v.breaks || []).join(', ')}${v.openTop ? ' +' : ''}` : v)}</dd>`).join('')}
  </dl></section>`;

  // summary
  h += `<section class="rv-sec"><h3>${T('tab.summary')}</h3><p class="note small">${T('sign')}</p>${rows.weighted && st.weight ? `<p class="note small">${T('w.note', { col: esc(st.weight) })}</p>` : ''}`;
  h += tbl(head(T('m.model')), models.map(m => `<tr><th>${esc(m.name)}<br><span class="kind">${role(m.role)}</span></th>${cells(m.overall || {})}</tr>`).join(''), 'rv-measures');
  for (const m of models) if (m.overall && m.overall.r2 == null) h += `<p class="small note warn">${esc(m.name)}: ${T('r2.' + (m.overall.r2Reason || 'n0'))}</p>`;
  const roles = [...new Set(models.map(m => m.role))];
  h += `<p class="statement">${T('role.note', { list: models.map(m => `${esc(m.name)}: ${role(m.role)}`).join('; ') })}${roles.includes('training') ? ' ' + T('role.warn.training') : ''}${roles.includes('unknown') ? ' ' + T('role.warn.unknown') : ''}</p>`;
  if (st.rowSet === 'own' && models.length > 1) h += `<p class="note ${rows.sameSample ? 'ok' : 'warn'}">${T(rows.sameSample ? 'own.same' : 'own.warn').replace(/ The table below.*$/, '')}</p>`;
  // charts from the measures
  const ok = models.filter(m => m.overall && m.overall.n);
  h += '<div class="charts2">';
  h += fig('rv-ch-err', barChart({ title: `${T('m.mae')} and ${T('m.rmse')} by model`, categories: ok.map(m => m.name), series: [{ name: T('m.mae'), values: ok.map(m => m.overall.mae) }, { name: T('m.rmse'), values: ok.map(m => m.overall.rmse) }], yLabel: T('m.rmse') + ', ' + T('m.mae'), fmt }));
  const ci = ok.map(m => { const x = m.inference; return { label: m.name, est: m.overall.bias, lo: x && x.ci && !x.reason ? x.ci.lo : null, hi: x && x.ci && !x.reason ? x.ci.hi : null }; });
  h += fig('rv-ch-bias', intervalChart({ title: ci.some(c => c.lo != null) ? T('ci.h', { l: fmtNum((inf.level || 0.95) * 100, 0) }) : T('m.bias'), items: ci, xLabel: `${T('m.bias')} (e = y − ŷ)`, ref: 0, fmt }));
  h += '</div>';
  if (models.some(m => m.overall && m.overall.r2 != null)) h += fig('rv-ch-r2', barChart({ title: T('m.r2'), categories: ok.map(m => m.name), series: [{ name: T('m.r2'), values: ok.map(m => m.overall.r2 == null ? null : Math.max(0, m.overall.r2)) }], yLabel: T('m.r2'), fmt, height: 260 }))
    + (ok.some(m => m.overall.r2 < 0) ? `<p class="muted small">Negative R² values are drawn at 0; see the table.</p>` : '');
  h += `<p class="muted small">The observed–predicted and residual plots need the rows of the data, which a saved result does not keep: open the data in the tool to see them.</p>`;
  // row accounting
  if (models.some(m => m.accounting)) {
    const c = [['rows', 'rows'], ['obsEmpty', 'obsE'], ['obsBad', 'obsB'], ['predEmpty', 'predE'], ['predBad', 'predB']].concat(rows.weighted ? [['wEmpty', 'wE'], ['wBad', 'wB']] : [], [['ownValid', 'own'], ['used', 'used'], ['dropped', 'dropped']]);
    h += `<h4>${T('acc.h')}</h4>${rows.N != null ? `<p class="small">${T('common.n', { n: fmtNum(rows.common, 0), N: fmtNum(rows.N, 0) })}</p>` : ''}`
      + tbl(`<tr><th>${T('m.model')}</th>${c.map(([, l]) => `<th>${T('acc.' + l)}</th>`).join('')}</tr>`, models.map(m => `<tr><th>${esc(m.name)}</th>${c.map(([k]) => `<td class="num">${m.accounting && m.accounting[k] != null ? fmtNum(m.accounting[k], 0) : '–'}</td>`).join('')}</tr>`).join(''))
      + `<p class="muted small">${T('acc.note')}</p>`;
  }
  h += '</section>';

  // inference
  const I = models.map(m => m.inference).filter(Boolean);
  if (I.length) {
    const pc = fmtNum((inf.level || 0.95) * 100, 0);
    h += `<section class="rv-sec"><h3>${T('tab.infer')}</h3>`;
    if (I.some(x => x.reason === 'weighted')) h += `<p class="note warn">${T('inf.weighted')}</p>`;
    else {
      h += `<h4>${T('ci.h', { l: pc })}</h4>` + tbl(`<tr><th>${T('m.model')}</th><th>${T('m.n')}</th><th>${T('m.bias')}</th><th>${T('ci.sd')}</th><th>${T('ci.se')}</th><th>${T('ci.t')}</th><th>${T('ci.lo')}</th><th>${T('ci.hi')}</th></tr>`,
        models.map(m => { const x = m.inference || {}; return x.reason || !x.ci ? `<tr><th>${esc(m.name)}</th><td class="num">${fmtNum(x.n, 0)}</td><td class="num undef" colspan="6">${T('undef')}${x.reason ? ` (${T('inf.' + x.reason)})` : ''}</td></tr>`
          : `<tr><th>${esc(m.name)}</th><td class="num">${fmtNum(x.n, 0)}</td><td class="num">${f(x.mean)}</td><td class="num">${f(x.sd)}</td><td class="num">${f(x.se)}</td><td class="num">${f(x.ci.t)}</td><td class="num">${f(x.ci.lo)}</td><td class="num">${f(x.ci.hi)}</td></tr>`; }).join(''), 'rv-ci');
      // bootstrap
      const cellB = (s, k) => s[k] ? `<td class="num">${f(s[k].lo)}</td><td class="num">${f(s[k].hi)}${s[k].edge ? ' *' : ''}</td>` : `<td class="num undef" colspan="2">${T('undef')}</td>`;
      for (const m of models) {
        const b = m.inference && m.inference.boot; if (!b) continue;
        h += `<h4>${T('bt.res', { l: pc })}: ${esc(m.name)}</h4>`;
        if (b.reason) { h += `<p class="note warn">${T('undef')} (${T('inf.' + b.reason)})</p>`; continue; }
        h += tbl(`<tr><th rowspan="2">${T('bt.stat')}</th><th rowspan="2">${T('bt.est')}</th><th colspan="2">${T('bt.pct')}</th><th colspan="2">BCa</th><th rowspan="2">${T('bt.Bok')}</th></tr><tr><th>${T('ci.lo')}</th><th>${T('ci.hi')}</th><th>${T('ci.lo')}</th><th>${T('ci.hi')}</th></tr>`,
          E.BOOT_STATS.filter(k => b.stats && b.stats[k]).map(k => { const s = b.stats[k]; return s.reason ? `<tr><th>${T('bt.s.' + k)}</th><td class="num undef" colspan="6">${T('undef')} (${T('bt.r.' + s.reason)})</td></tr>`
            : `<tr><th>${T('bt.s.' + k)}</th><td class="num">${f(s.est)}</td>${cellB(s, 'pct')}${cellB(s, 'bca')}<td class="num">${fmtNum(s.Bok, 0)}</td></tr>`; }).join(''));
      }
      const bt = models.filter(m => m.inference && m.inference.boot && m.inference.boot.stats && m.inference.boot.stats.rmse && m.inference.boot.stats.rmse.pct);
      if (bt.length) h += fig('rv-ch-boot', intervalChart({ title: `${T('m.rmse')}: ${T('bt.res', { l: pc })} (${T('bt.pct')})`, items: bt.map(m => { const s = m.inference.boot.stats.rmse; return { label: m.name, est: s.est, lo: s.pct.lo, hi: s.pct.hi }; }), xLabel: T('m.rmse'), fmt }));
      // equivalence
      if (inf.margin) {
        const a2 = fmtNum((1 - 2 * inf.alpha) * 100, 0), dec = v => `<td class="${v ? 'ok' : 'warn'}">${T(v ? 'eq.yes' : 'eq.no')}</td>`;
        h += `<h4>${T('eq.res', { a: fmtNum(inf.alpha, 2) })}</h4><p class="small">${T(inf.margin.type === 'abs' ? 'eq.abs.set' : 'eq.rel.set', { v: esc(inf.margin.value) })}</p>`
          + tbl(`<tr><th rowspan="2">${T('m.model')}</th><th rowspan="2">δ</th><th rowspan="2">ε = δ/s</th><th colspan="3">${T('eq.tost', { l: a2 })}</th><th colspan="5">${T('eq.wellek')}</th></tr><tr><th>${T('ci.lo')}</th><th>${T('ci.hi')}</th><th>${T('eq.dec')}</th><th>ψ²</th><th>C</th><th>|t|</th><th>${T('eq.dec')}</th><th>${T('eq.power')}</th></tr>`,
            models.map(m => { const x = m.inference || {}, q = x.equiv;
              if (x.reason || !q || q.reason) return `<tr><th>${esc(m.name)}</th><td class="num undef" colspan="10">${T('undef')} (${T('inf.' + (x.reason || (q ? q.reason : 'n')))})</td></tr>`;
              return `<tr><th>${esc(m.name)}</th><td class="num">${f(q.delta)}</td><td class="num">${f(q.eps)}</td><td class="num">${f(q.tost.lo)}</td><td class="num">${f(q.tost.hi)}</td>${dec(q.tost.equivalent)}<td class="num">${f(q.wellek.psi2)}</td><td class="num">${f(q.wellek.C)}</td><td class="num">${f(Math.abs(q.wellek.t))}</td>${dec(q.wellek.equivalent)}<td class="num">${f(q.wellek.power, 3)}</td></tr>`; }).join(''))
          + `<p class="statement small">${T('eq.read')}</p>`;
      }
    }
    // rank uncertainty
    const rb = rec.rankBootstrap;
    if (rb) {
      h += `<h4>${T('rb.h')}</h4>`;
      if (rb.reason) h += `<p class="note warn">${T('undef')} (${T('rb.r.' + rb.reason)})</p>`;
      else {
        const order = rb.models.map((x, i) => i).sort((a, b) => rb.models[a].overall - rb.models[b].overall || a - b);
        h += tbl(`<tr><th>${T('m.model')}</th><th>${T('rb.overall')}</th><th>${T('rb.ord')}</th><th colspan="2">${T('rb.int', { l: pc })}</th><th>${T('rb.mean')}</th><th>${T('rb.best')}</th></tr>`,
          order.map(i => { const x = rb.models[i]; return `<tr><th>${esc(x.name)}</th><td class="num">${f(x.overall)}</td><td class="num">${x.ordinal}</td><td class="num">${f(x.lo)}</td><td class="num">${f(x.hi)}${x.edge ? ' *' : ''}</td><td class="num">${f(x.meanOrdinal)}</td><td class="num">${fmtNum(100 * x.pBest, 1)} %</td></tr>`; }).join(''), 'rv-rank')
          + fig('rv-ch-rank', intervalChart({ title: `${T('rb.mean')} · ${T('rb.int', { l: pc })}`, items: order.map(i => ({ label: rb.models[i].name, est: rb.models[i].meanOrdinal, lo: rb.models[i].lo, hi: rb.models[i].hi })), xLabel: T('rb.ord'), fmt }));
      }
    }
    h += '</section>';
  }

  // groups
  const keys = ['plot', 'species', 'dclass', 'fold'].filter(k => models[0].groups && Array.isArray(models[0].groups[k]) && models[0].groups[k].length);
  if (keys.length) {
    h += `<section class="rv-sec"><h3>${T('tab.groups')}</h3>`;
    for (const k of keys) {
      const labels = [...new Set(models.flatMap(m => (m.groups[k] || []).map(g => g.label)))], lab = l => l === '' ? T('g.blank') : l;
      h += `<h4>${T('grp.' + k)}</h4>` + fig('rv-ch-g-' + k, barChart({ title: `${T('m.rmse')} · ${T('grp.' + k)}`, categories: labels.map(lab), series: models.map(m => ({ name: m.name, values: labels.map(l => { const g = (m.groups[k] || []).find(x => x.label === l); return g ? g.rmse : null; }) })), yLabel: T('m.rmse'), fmt, height: 300 }));
      for (const m of models) h += `<p class="small"><b>${esc(m.name)}</b> <span class="kind">${role(m.role)}</span></p>` + tbl(head(T('grp.' + k)), (m.groups[k] || []).map(g => `<tr><th>${esc(lab(g.label))}</th>${cells(g)}</tr>`).join('') + `<tr class="total"><th>Σ</th>${cells(m.overall || {})}</tr>`);
    }
    h += '</section>';
  }
  return h;
}
