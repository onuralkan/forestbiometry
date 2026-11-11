// Export tables of the diameter distribution tool (no DOM): rows for CSV (core/export.js csvText) and XLSX sheets.
// Numbers are written at full precision as numbers (never formatted text); labels follow the interface language
// through the T function the caller passes. Machine-readable codes (method id, status code) sit next to the labels so
// that TR and EN files carry the same values.
import * as D from './index.js';
import { compareUnit } from './compare.js';
import * as SRC from './sources.js';

const MAXP = 4;                                            // largest number of parameters of any registered family
const num = x => typeof x === 'number' && Number.isFinite(x) ? x : null;
const unitPlot = u => u.plot === D.POOL ? null : u.plot;

/**
 * Fits of the raw-data workflow: one row per unit × result.
 * h = { T, methodName(r), notes(r) → [text], poolLabel }
 */
export function fitRows(units, h) {
  const { T } = h;
  const head = [T('x.plot'), T('x.period'), 'n', T('x.family'), T('x.method'), 'method_id', T('x.estimator'), T('x.status'), 'status', T('x.reason'),
    ...Array.from({ length: MAXP }, (_, i) => [T('x.par', { i: i + 1 }), T('x.val', { i: i + 1 })]).flat(),
    T('x.fixed'), 'ln L', 'k', 'AIC', 'BIC', 'KS D', 'AD A²', 'CvM W²', T('x.pneg'), T('x.solver'), T('x.iter'), T('x.trlo'), T('x.trhi'), T('x.mass'), T('x.nscope'), T('x.settings')];
  const out = [head];
  for (const u of units) for (const r of u.results) {
    const fam = D.family(r.family), ok = r.status === 'ok', g = r.gof || {};
    const pars = fam.params.flatMap(q => [q.label ?? q.key, ok ? num(r.params[q.key]) : null]);
    while (pars.length < 2 * MAXP) pars.push(null);
    const fixed = Object.entries(r.fixed || {}).map(([k, v]) => `${(fam.params.find(q => q.key === k) || {}).label ?? k} = ${v.value} (${T('x.origin.' + v.origin)})`).join('; ');
    out.push([unitPlot(u) ?? h.poolLabel, u.period, r.data.n, T('fam.' + r.family), h.methodName(r), r.method, T('est.' + r.estimator), T('st.' + r.status), r.status, h.notes(r).join(' | ') || null,
      ...pars, fixed || null, ok ? num(r.logLik) : null, ok && r.likelihoodMaximised ? r.free.length : null, num(g.aic), num(g.bic), ok ? num(g.ks) : null, ok ? num(g.ad) : null, ok ? num(g.cvm) : null,
      ok && r.diagnostics ? num(r.diagnostics.pBelowZero) : null, T('sol.' + r.convergence.solver), r.convergence.iter ?? null,
      r.truncation ? num(r.truncation.lower) : null, r.truncation ? num(r.truncation.upper) : null, ok && r.truncation ? num(r.truncation.mass) : null,
      ok && r.truncation ? (r.settings.nScope === 'population' ? num(r.truncation.nPopulation) : r.data.n) : null, settingsText(r.settings)]);
  }
  return out;
}
/** Parameters in long form: one row per unit × result × parameter (estimated or fixed, with unit and role). */
export function paramRows(units, h) {
  const { T } = h;
  const out = [[T('x.plot'), T('x.period'), T('x.family'), T('x.method'), 'method_id', T('x.parname'), 'parameter', T('x.value'), T('x.punit'), T('x.role'), T('x.kind')]];
  for (const u of units) for (const r of u.results) {
    if (r.status !== 'ok') continue;
    const fam = D.family(r.family);
    for (const q of fam.params) {
      const fx = r.fixed && r.fixed[q.key];
      out.push([unitPlot(u) ?? h.poolLabel, u.period, T('fam.' + r.family), h.methodName(r), r.method, q.label ?? q.key, q.key, num(r.params[q.key]),
        q.unit ?? (q.scale === 'log' ? T('unit.log') : null), T('role.' + q.role), fx ? T('x.origin.' + fx.origin) : T('x.estimated')]);
    }
  }
  return out;
}
/** Descriptive summary per unit (the targets the moment methods use). */
export function unitRows(units, h) {
  const { T } = h;
  const out = [[T('x.plot'), T('x.period'), 'n', T('x.unique'), 'min (cm)', 'max (cm)', T('x.mean'), 'Dq (cm)', T('x.varN'), T('x.varN1'), T('x.state')]];
  for (const u of units) { const s = u.desc; out.push(u.classes ? [unitPlot(u) ?? h.poolLabel, u.period, s.n, s.classes, s.min, s.max === Infinity ? null : s.max, null, null, null, null, T('nav.st.' + u.state)] : [unitPlot(u) ?? h.poolLabel, u.period, s.n, s.unique, s.min, s.max, s.mean, s.dq, s.varN, s.varN1, T('nav.st.' + u.state)]); }
  return out;
}
/**
 * Results of a recovery workflow (moment recovery or Weibull M2–M10): parameters, every numeric target and
 * back-calculated value (columns from the union over the results), status and reason.
 */
export function recoverRows(results, h) {
  const { T } = h;
  const tKeys = [...new Set(results.flatMap(r => Object.entries(r.targets || {}).filter(([, v]) => typeof v === 'number').map(([k]) => k)))];
  const dKeys = [...new Set(results.flatMap(r => Object.entries(r.diagnostics || {}).filter(([, v]) => typeof v === 'number').map(([k]) => k)))];
  const head = [T('x.family'), T('x.method'), 'method_id', T('x.status'), 'status', T('x.reason'), ...Array.from({ length: MAXP }, (_, i) => [T('x.par', { i: i + 1 }), T('x.val', { i: i + 1 })]).flat(),
    T('x.fixed'), ...tKeys.map(k => T('x.target', { k })), ...dKeys.map(k => T('x.diag', { k })), T('x.cands'), T('x.solver'), T('x.settings')];
  const out = [head];
  for (const r of results) {
    const fam = D.family(r.family), ok = r.status === 'ok';
    const pars = fam.params.flatMap(q => [q.label ?? q.key, ok ? num(r.params[q.key]) : null]); while (pars.length < 2 * MAXP) pars.push(null);
    const fixed = Object.entries(r.fixed || {}).map(([k, v]) => `${k} = ${v.value}${v.policy ? ' (' + v.policy + (v.dmin != null ? ', Dmin = ' + v.dmin : '') + ')' : v.origin ? ' (' + T('x.origin.' + v.origin) + ')' : ''}`).join('; ');
    const cands = r.status === 'multiple' && r.diagnostics && r.diagnostics.candidates ? r.diagnostics.candidates.map(c => fam.params.filter(q => c[q.key] != null).map(q => `${q.label ?? q.key} = ${c[q.key]}`).join(', ')).join(' | ') : null;
    out.push([T('fam.' + r.family), h.methodName(r), r.method, T('st.' + r.status), r.status, h.notes(r).join(' | ') || null, ...pars, fixed || null,
      ...tKeys.map(k => num((r.targets || {})[k])), ...dKeys.map(k => ok || r.status === 'multiple' ? num((r.diagnostics || {})[k]) : null), cands, T('sol.' + r.convergence.solver), settingsText({ ...(r.settings || {}), ...textTargets(r.targets) })]);
  }
  return out;
}
const textTargets = t => Object.fromEntries(Object.entries(t || {}).filter(([, v]) => typeof v === 'string'));
function settingsText(s) { const e = Object.entries(s || {}).filter(([, v]) => v != null && typeof v !== 'object'); return e.length ? e.map(([k, v]) => `${k} = ${v}`).join('; ') : null; }
/** Key–value rows of the Info sheet: [[label, value], …]. */
export const infoRows = (pairs, T) => [[T('x.k'), T('x.v')], ...pairs.filter(p => p).map(([k, v]) => [k, v == null ? '–' : v])];
/**
 * Class tables of every unit × successful fit (stage P12): class, observed, probability, expected and, when a plot area
 * is given, per hectare; the tails and gaps as separate rows. tableFor(u, r) → { t, cl } or { problems }.
 */
export function classRows(units, h, tableFor) {
  const { T } = h;
  const out = [[T('x.plot'), T('x.period'), T('x.method'), 'method_id', T('cl.t.class'), 'lower_cm', 'upper_cm', T('cl.t.obs'), T('cl.t.p'), T('cl.t.exp'), T('cl.t.obsN'), T('cl.t.expN')]];
  for (const u of units) for (const r of u.results) {
    if (r.status !== 'ok') continue;
    const x = tableFor(u, r); if (!x || !x.t) continue;
    const t = x.t, pl = unitPlot(u) ?? h.poolLabel, base = [pl, u.period, h.methodName(r), r.method], ha = v => t.perHa != null ? v : null;
    out.push([...base, T('cl.below', { b: x.cl[0].lo }), null, x.cl[0].lo, t.lower.obs, t.lower.prob, t.lower.exp, ha(t.lower.obsHa), ha(t.lower.expHa)]);
    for (const c of t.rows) out.push([...base, `[${c.lo}, ${c.hi === Infinity ? '∞' : c.hi})`, c.lo, c.hi === Infinity ? null : c.hi, c.obs, c.prob, c.exp, ha(c.obsHa), ha(c.expHa)]);
    if (t.gaps.prob > 0 || t.gaps.obs) out.push([...base, T('cl.gaps'), null, null, t.gaps.obs, t.gaps.prob, t.gaps.exp, ha(t.gaps.obsHa), ha(t.gaps.expHa)]);
    const lastHi = x.cl[x.cl.length - 1].hi;
    if (lastHi !== Infinity) out.push([...base, T('cl.above', { b: lastHi }), lastHi, null, t.upper.obs, t.upper.prob, t.upper.exp, ha(t.upper.obsHa), ha(t.upper.expHa)]);
  }
  return out;
}
/** Comparison table (stage P13): per unit and observation process, likelihood fits and descriptive fits apart. */
export function compareRows(units, h, classErr) {
  const { T } = h;
  const out = [[T('x.plot'), T('x.period'), T('cmp.x.group'), T('cmp.x.table'), T('x.family'), T('x.method'), 'method_id', 'n', 'k', 'ln L', 'AIC', 'ΔAIC', 'BIC', 'ΔBIC', 'AICc', 'KS D', 'AD A²', 'CvM W²', T('cmp.l1'), T('cmp.ei')]];
  for (const u of units) for (const g of compareUnit(u.results, r => classErr(u, r))) {
    for (const [rows, kind] of [[g.ml, 'ml'], [g.desc, 'desc']]) for (const x of rows)
      out.push([unitPlot(u) ?? h.poolLabel, u.period, g.key, T('cmp.x.' + kind), T('fam.' + x.r.family), h.methodName(x.r), x.r.method, x.n, kind === 'ml' ? x.k : null, num(x.logLik), num(x.aic), num(x.dAIC), num(x.bic), num(x.dBIC), num(x.aicc), num(x.ks), num(x.ad), num(x.cvm), num(x.l1), num(x.ei)]);
  }
  return out;
}
/**
 * Bootstrap runs (stage P14, exported from P15): one row per unit × fit × operation × statistic or quantity, with the
 * seed, requested and completed replicates, failures by state, failure rate and rounding step on every row.
 * recs = [{ unit: { plot, period }, r (result), kind: 'gof'|'ci', result }]
 */
export function bootRows(recs, h) {
  const { T } = h;
  const out = [[T('x.plot'), T('x.period'), T('x.method'), 'method_id', T('x.fixed'), T('bx.kind'), 'kind', T('bt.seed'), 'B', T('bx.done'), T('bx.failed'), T('bx.rate'), T('bx.step'), T('bx.scheme'),
    T('bx.q'), 'T0', T('bt.ge'), 'p', T('bt.mcse'), T('bt.est'), T('bt.lo'), T('bt.hi'), T('bt.se'), T('x.reason')]];
  for (const x of recs) {
    const res = x.result, fam = D.family(x.r.family), base = [x.unit.plot ?? h.poolLabel, x.unit.period, h.methodName(x.r), x.r.method,
      Object.entries(x.r.fixed || {}).map(([k, v]) => `${(fam.params.find(q => q.key === k) || {}).label ?? k} = ${v.value}`).join('; ') || null, T('bx.' + x.kind), x.kind];
    if (res.unsupported) { out.push([...base, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, T('bt.' + res.unsupported)]); continue; }
    const meta = [res.seed, res.B, res.completed, Object.entries(res.failed).map(([k, v]) => `${k}: ${v}`).join('; ') || null, num(res.failRate), res.step == null ? null : res.step, x.kind === 'ci' ? res.scheme : null];
    const warn = res.warn ? T('bt.warn', { r: (res.failRate * 100).toFixed(1) }) : null;
    if (x.kind === 'gof') for (const [k, v] of Object.entries(res.stats)) out.push([...base, ...meta, k, num(v.t0), v.ge, num(v.p), num(v.mcse), null, null, null, null, v.p == null ? T('bt.few', { m: res.minOk }) : warn]);
    else if (!res.intervals) out.push([...base, ...meta, null, null, null, null, null, null, null, null, null, T('bt.few', { m: 20 })]);
    else for (const [k, v] of Object.entries(res.intervals)) out.push([...base, ...meta, k.startsWith('Q') ? k : (fam.params.find(q => q.key === k) || {}).label ?? k, null, null, null, null, num(v.est), num(v.lo), num(v.hi), num(v.se), warn]);
  }
  return out;
}
/** Methods and references (stage P15): every method used, its documentation section and references; then the reference list. */
export function sourceRows(ids, h, extra = []) {
  const { T } = h, uniq = [...new Set(ids)];
  const out = [['method_id', T('x.method'), T('x.family'), T('x.estimator'), T('x.solver'), T('x.section'), T('x.refs')]];
  for (const id of uniq) { const m = D.method(id), s = SRC.methodSources(id);
    out.push([id, T('m.' + id), T('fam.' + m.family), T('est.' + m.estimator), T('sol.' + m.solver), 'METHODS.md §12 ' + s.section, s.refs.join(', ')]); }
  if (extra.includes('R9')) out.push(['bootstrap', T('tab.boot'), null, null, null, 'METHODS.md §12 P14', 'R9']);
  out.push([], [T('x.refs'), T('x.cite'), T('x.rstatus'), T('x.url')]);
  for (const k of SRC.refsOf(uniq, extra)) { const x = SRC.REFS[k]; out.push([k, x.cite, T('src.st.' + x.status), x.url || null]); }
  return out;
}
