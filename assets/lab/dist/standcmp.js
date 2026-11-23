// Diameter Distribution, stage P26 (23 Nov 2026, user request): comparison of stand-model methods as in Poudel and Cao
// (2013) [R1]: several response sets (methods 1–10) × fitting approaches (SUR, CDFR, modified CDFR, NLS, log-OLS) are
// trained on a fit sample of plots and evaluated on a separate validation sample, repeated R times with seeded random
// splits; per method the mean and SD of four goodness-of-fit statistics over the validation units, their relative ranks
// (Eq. 10) and the overall rank (relative rank of the sum of the four relative ranks). No DOM.
//
// Statistics of one validation unit (plot × period) under its predicted Weibull (Poudel and Cao 2013, Eqs. 6–9):
//   AD (Eq. 6) and KS (Eq. 7) as in gof.js; mLogL (Eq. 8) = −Σ ln f(xⱼ); EI (Eq. 9) = Σₖ |nₖ − n̂ₖ| in trees per hectare
//   over the unit's diameter classes of width w (from ⌊min/w⌋·w, as the modified CDFR): nₖ = countₖ · N/n (N the unit's
//   trees per hectare, n its trees measured), n̂ₖ = N · [F(upperₖ) − F(lowerₖ)].
// Splits (tool convention; the source draws 50 plots per age for fitting and another 50 for validation from a larger
// study): plots are shuffled with mulberry32(seed + r) and the first round(share · m) plots fit, the others validate;
// all periods of a plot stay on one side. Every method sees the same splits.
// Common units (tool rule, as the common rows of Model Evaluation): a validation unit can drop out for one method (no
// model, inconsistent prediction, or a tree below the predicted location, where the likelihood is zero); the summary and
// the ranks use by default only the units every ranked method evaluated, so the methods are compared on the same trees.
import * as D from './index.js';
import { train, predict, unitClasses } from './stand.js';
import { shuffle } from '../core/stats.js';
import { relativeRanks } from '../core/relrank.js';

export const STATS = ['ad', 'ks', 'mlogl', 'ei'];

/** The four statistics of one unit; ei is null without N (trees/ha). */
export function evalUnit(params, d, N, w = 2) {
  const fam = D.family('weibull');
  let ll = 0; for (const v of d) ll += fam.logpdf(v, params);
  const out = { ad: D.gof.ad(fam, params, d), ks: D.gof.ks(fam, params, d), mlogl: -ll, ei: null };
  if (N > 0) { const n = d.length; out.ei = unitClasses(d, w).reduce((s, c) => s + Math.abs(c.n * N / n - N * (fam.cdf(c.hi, params) - fam.cdf(c.lo, params))), 0); }
  return out;
}

/** Repeated fit / validation splits of the plots. → [{ rep, fit: Set, val: Set }]. */
export function splits(plots, reps, share = 0.5, seed = 1) {
  const ps = [...new Set(plots)].sort(D.natural), nf = Math.round(share * ps.length);
  return Array.from({ length: reps }, (_, r) => { const s = shuffle(ps, seed + r); return { rep: r + 1, fit: new Set(s.slice(0, nf)), val: new Set(s.slice(nf)) }; });
}

const meanSd = v => { const n = v.length; if (!n) return { mean: null, sd: null, n: 0 }; const m = v.reduce((a, x) => a + x, 0) / n;
  return { mean: m, sd: n > 1 ? Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (n - 1)) : null, n }; };

/**
 * units: from extractStandUnits (x with N, H, A, n). configs: [{ id, label, cfg }] (train configurations). opts: { reps,
 * share, seed, width (EI classes, cm) }. onProgress(done, total). → { methods: [{ id, label, stats: { ad: { mean, sd, n } … },
 * evaluated, failed, models, perRep }], ranks: { per stat: R, sum, overall }, splits }.
 */
export function compareStand(units, configs, opts = {}, onProgress = null) {
  const reps = opts.reps ?? 10, share = opts.share ?? 0.5, seed = opts.seed ?? 1, w = opts.width ?? 2;
  const sp = splits(units.map(u => u.plot), reps, share, seed), total = sp.length * configs.length; let done = 0;
  const methods = configs.map(c => ({ id: c.id, label: c.label, cfg: c.cfg, byUnit: new Map(), evaluated: 0, failed: {}, models: { ok: 0, failed: 0 }, perRep: [] }));
  for (const s of sp) {
    const fitU = units.filter(u => s.fit.has(u.plot)), valU = units.filter(u => s.val.has(u.plot));
    for (const m of methods) {
      const model = train(fitU, m.cfg), rep = { rep: s.rep, fitUnits: fitU.length, valUnits: valU.length, status: model.status, ad: [], ks: [], mlogl: [], ei: [] };
      if (model.status !== 'ok') { m.models.failed++; m.failed.nomodel = (m.failed.nomodel || 0) + valU.length; }
      else {
        m.models.ok++;
        for (const u of valU) {
          const pr = predict(model, u.x);
          if (pr.status !== 'ok') { const k = pr.problems && pr.problems.length ? pr.problems[0].code : pr.recovery && pr.recovery.problems && pr.recovery.problems.length ? pr.recovery.problems[0].code : pr.status; m.failed[k] = (m.failed[k] || 0) + 1; continue; }
          const e = evalUnit(pr.params, u.d, u.x.N, w);
          if (!Number.isFinite(e.mlogl)) { m.failed.outside = (m.failed.outside || 0) + 1; continue; }   // a tree outside the predicted support
          m.evaluated++; m.byUnit.set(`${s.rep}\u0001${u.plot}\u0001${u.period ?? ''}`, e); for (const k of STATS) if (e[k] != null) rep[k].push(e[k]);
        }
      }
      m.perRep.push({ rep: rep.rep, fitUnits: rep.fitUnits, valUnits: rep.valUnits, status: rep.status, ...Object.fromEntries(STATS.map(k => [k, meanSd(rep[k]).mean])) });
      done++; if (onProgress) onProgress(done, total);
    }
  }
  const res = { methods: methods.map(m => ({ id: m.id, label: m.label, byUnit: m.byUnit, evaluated: m.evaluated, failed: m.failed, models: m.models, perRep: m.perRep })),
    splits: sp.map(s => ({ rep: s.rep, fit: [...s.fit], val: [...s.val] })), settings: { reps, share, seed, width: w, valUnits: sp.reduce((a, s) => a + units.filter(u => s.val.has(u.plot)).length, 0) } };
  return summarise(res, { exclude: opts.exclude || [], rowSet: opts.rowSet || 'common' });
}

/**
 * Summary and ranks of a comparison (can be recomputed with another exclusion list or row set without refitting).
 * rowSet 'common': only the validation units evaluated by every ranked method; 'own': each method's own units.
 */
export function summarise(res, { exclude = [], rowSet = 'common' } = {}) {
  const bu = m => m.byUnit instanceof Map ? m.byUnit : new Map(m.byUnit || []);   // a Map, or its entries after a structured copy
  res = { ...res, methods: res.methods.map(m => ({ ...m, byUnit: bu(m) })) };
  const ranked = res.methods.filter(m => !exclude.includes(m.id) && m.byUnit.size);
  let common = null;
  if (rowSet === 'common' && ranked.length) { common = new Set(ranked[0].byUnit.keys()); for (const m of ranked.slice(1)) for (const k of [...common]) if (!m.byUnit.has(k)) common.delete(k); }
  const methods = res.methods.map(m => { const es = [...m.byUnit.entries()].filter(([k]) => !common || common.has(k)).map(([, e]) => e);
    return { ...m, units: es.length, stats: Object.fromEntries(STATS.map(k => [k, meanSd(es.map(e => e[k]).filter(v => v != null))])) }; });
  return { ...res, methods, rowSet, commonUnits: common ? common.size : null, exclude, ranks: rankMethods(methods, exclude) };
}

/**
 * Relative ranks (Eq. 10) of the methods per statistic (smaller is better for all four), then the overall rank as the
 * relative rank of the sum of the four ranks (Poudel and Cao 2013, Table 3 note). Methods without a mean for every
 * statistic, or listed in exclude (the source left out SUR methods 4 and 5), are not ranked. EI enters only when every
 * ranked method has it.
 */
export function rankMethods(methods, exclude = []) {
  const idx = methods.map((m, i) => i).filter(i => !exclude.includes(methods[i].id) && ['ad', 'ks', 'mlogl'].every(k => methods[i].stats[k].mean != null));
  const useEI = idx.length > 0 && idx.every(i => methods[i].stats.ei.mean != null), stats = useEI ? STATS : ['ad', 'ks', 'mlogl'];
  if (idx.length < 2) return { stats, ranked: idx.map(i => methods[i].id), R: {}, sum: {}, overall: {} };
  const R = {}, sum = Object.fromEntries(idx.map(i => [methods[i].id, 0]));
  for (const k of stats) { const r = relativeRanks(idx.map(i => methods[i].stats[k].mean), 'min').R; R[k] = Object.fromEntries(idx.map((i, j) => [methods[i].id, r[j]])); idx.forEach((i, j) => { sum[methods[i].id] += r[j]; }); }
  const ov = relativeRanks(idx.map(i => sum[methods[i].id]), 'min').R;
  return { stats, ranked: idx.map(i => methods[i].id), R, sum, overall: Object.fromEntries(idx.map((i, j) => [methods[i].id, ov[j]])) };
}
