// Relative Ranking: a saved run record shown again (22 Nov 2026; Account → Saved results). The ranking table with the
// criteria values, the criteria with their best and worst values, the overall rank as bars and the radar chart of the
// best and worst models, as the tool draws them, from the saved numbers only. Pure HTML, no DOM.
import { T } from './i18n.js';
import { fmtNum, esc } from '../core/i18n.js';
import { barChart, radarChart } from '../core/chart.js';
import { pickForChart } from './calc.js';

const f = (x, d = 3) => x == null ? '–' : fmtNum(x, d);
const fv = v => v == null ? '–' : typeof v === 'number' ? fmtNum(v, 4) : esc(v);
const fig = (id, svg) => { const t = (svg.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; return `<figure class="chartbox" id="${id}"><p class="small rv-figt"><b>${t}</b></p>${svg}</figure>`; };

export function viewRecord(rec) {
  const crit = rec.criteria || [], ranks = (rec.ranks || []).map((r, i) => ({ ...r, index: i })), m = rec.m || ranks.length;
  if (!ranks.length || !crit.length) return null;
  const weighted = crit.some(c => c.weight != null && c.weight !== 1);
  let h = `<section class="rv-sec"><h3>${T('tab.table')}</h3><p class="note small">${T('method')}</p><p class="small">${T('m.info', { m })}</p>`;
  if (rec.incomplete && rec.incomplete.length) h += `<p class="note warn small">${T('incomplete', { k: rec.incomplete.length, list: rec.incomplete.map(esc).join(', ') })}</p>`;
  if (rec.sameRanks && rec.sameRanks.length) h += `<p class="note warn small">${T('same', { list: rec.sameRanks.map(g => Array.isArray(g) ? g.map(esc).join(' = ') : esc(g)).join('; ') })}</p>`;
  h += `<div class="tscroll"><table class="grid" id="rv-ranks"><thead><tr><th>${T('th.ord')}</th><th>${T('th.model')}</th>${crit.map(c => `<th>${T('R')}: ${esc(c.name)}<br><span class="kind">${T('dir.' + c.dir).split(' (')[0]}${weighted ? ` · w = ${fv(c.weight)}` : ''}</span></th>`).join('')}<th>${T('th.sum')}</th><th>${T('th.overall')}</th></tr></thead><tbody>`
    + ranks.map(r => `<tr><td class="num">${r.ordinal}</td><th>${esc(r.label)}</th>${crit.map((c, j) => `<td class="num">${f(r.R && r.R[j])}<br><span class="kind">${fv(r.values && r.values[j])}</span></td>`).join('')}<td class="num">${f(r.sum)}</td><td class="num"><b>${f(r.overall)}</b></td></tr>`).join('')
    + `</tbody></table></div><p class="muted small">Upper number: relative rank (1 = best, ${m} = worst); lower number: the value in the table. ${T('sens')}</p>`;
  h += `<h4>Criteria</h4><div class="tscroll"><table class="grid" id="rv-crit"><thead><tr><th>Criterion</th><th>Better is</th>${weighted ? '<th>Weight</th>' : ''}<th>Best</th><th>Worst</th></tr></thead><tbody>${crit.map(c => `<tr><th>${esc(c.name)}</th><td>${T('dir.' + c.dir)}</td>${weighted ? `<td class="num">${fv(c.weight)}</td>` : ''}<td class="num">${fv(c.best)}</td><td class="num">${fv(c.worst)}${c.constant ? ' (constant)' : ''}</td></tr>`).join('')}</tbody></table></div>`;
  if (rec.settings && rec.settings.excluded && rec.settings.excluded.length) h += `<p class="small">Left out of the ranking: ${rec.settings.excluded.map(x => esc(x.label)).join(', ')}.</p>`;
  h += '</section><section class="rv-sec"><h3>Charts</h3>';
  h += fig('rv-ch-overall', barChart({ title: `${T('th.overall')} (lower is better)`, categories: ranks.map(r => `${r.ordinal}. ${r.label}`), series: [{ name: T('th.overall'), values: ranks.map(r => r.overall) }], yLabel: T('th.overall'), fmt: v => fmtNum(v, 2), height: 320 }));
  if (crit.length >= 3) {
    const pick = pickForChart(ranks, { best: Math.min(5, ranks.length), worst: ranks.length > 5 ? Math.min(5, ranks.length - 5) : 0 });
    h += fig('rv-ch-radar', radarChart({ title: T('rd.title', { k: pick.length, m }), axes: crit.map(c => c.name), series: pick.map(r => ({ name: `${r.ordinal}. ${r.label} — ${f(r.overall, 2)}`, values: r.R })), rmin: 1, rmax: m, fmt: v => fmtNum(v, 1), note: T('rd.note', { m }) }));
  } else h += `<p class="muted small">${T('rd.few')}</p>`;
  return h + '</section>';
}
