// Biomass and carbon (TOOLS_SPEC §5, stage BC01; PLATFORM_PLAN BC-01…BC-04): computation core, no DOM.
// The site ships NO species coefficients, wood densities, expansion factors, root ratios or carbon fractions (K1, K9):
// every number comes from the user, with its source (model-coef/1 for equations, a source text for factors).
//
// A. Allometric equations, tree level (registered forms 'biomass.<id>', D in cm, H in m, B in kg dry matter). The forms
//    are general function definitions applied with the user's coefficients (definition exception, 16 Nov 2026 user
//    decision; METHODS §22). Log forms are kept on their own scale: ln and log10 are separate forms, never converted
//    silently. Back-transformation correction: none, Snowdon ratio or a user factor as given in the source, or the
//    Baskerville factor exp(SEE²/2) on the ln scale (Baskerville 1972, cited via Chave et al. 2014 and Baia et al.
//    2025 [A]); for log10 equations the factor waits for its own source (Sprugel 1983) and is not applied.
// B. Conversion from volume (IPCC 2006, Vol. 4, Ch. 2, Eq. 2.8b [B]): AGB = V · D · BEF (or V · BCEF), total
//    = AGB · (1 + R), R = below-ground / above-ground biomass. The bark side of the volume must match the side the
//    factors were defined for; otherwise nothing is computed.
// Carbon: C = B · CF (CF per component, from the user); CO₂ = C · 44/12 (ratio of molecular weights, IPCC 2006
//    Vol. 4 Ch. 2 §2.2.3 [B]; a constant, not a coefficient).
import { registerForm, form, validateCoef, correctionFactor, outsideValid } from '../core/coef.js';
import { buildUnits } from '../stand/calc.js';

export const TOOL = { id: 'biyokutle-karbon', version: '1.0.0-beta.5' };
export const CO2_PER_C = 44 / 12;
/** Scales on which the Baskerville correction is applied: ln ([A], METHODS §22); log10 waits for its source. */
export const BASKERVILLE_SCALES = ['log'];

/** Registered forms. f(p, D, H) gives B on the form's own scale (linear, ln B or log10 B). */
export const FORMS = {
  'pow.d': { params: ['a', 'b'], needsH: false, scale: 'none', formula: { en: 'B = a·D^b' }, f: (p, D) => p.a * D ** p.b },
  'pow.dh': { params: ['a', 'b', 'c'], needsH: true, scale: 'none', formula: { en: 'B = a·D^b·H^c' }, f: (p, D, H) => p.a * D ** p.b * H ** p.c },
  'pow.d2h': { params: ['a', 'b'], needsH: true, scale: 'none', formula: { en: 'B = a·(D²H)^b' }, f: (p, D, H) => p.a * (D * D * H) ** p.b },
  'lin.d2h': { params: ['a', 'b'], needsH: true, scale: 'none', formula: { en: 'B = a + b·D²H' }, f: (p, D, H) => p.a + p.b * D * D * H },
  'log.d': { params: ['a', 'b'], needsH: false, scale: 'log', formula: { en: 'ln B = a + b·ln D' }, f: (p, D) => p.a + p.b * Math.log(D) },
  'log.dh': { params: ['a', 'b', 'c'], needsH: true, scale: 'log', formula: { en: 'ln B = a + b·ln D + c·ln H' }, f: (p, D, H) => p.a + p.b * Math.log(D) + p.c * Math.log(H) },
  'log10.d': { params: ['a', 'b'], needsH: false, scale: 'log10', formula: { en: 'log₁₀ B = a + b·log₁₀ D' }, f: (p, D) => p.a + p.b * Math.log10(D) },
  'log10.dh': { params: ['a', 'b', 'c'], needsH: true, scale: 'log10', formula: { en: 'log₁₀ B = a + b·log₁₀ D + c·log₁₀ H' }, f: (p, D, H) => p.a + p.b * Math.log10(D) + p.c * Math.log10(H) },
};
// BC-02: linear component equations of an additive system, B = b0 + Σ b_j·term_j over a subset of D, D², D²H, H
// (Parresol 1999 §1.1.4–1.1.5 [B]; fitted in sur.js, applied here like any other set).
{
  const T = { d: ['D', (D) => D], d2: ['D²', (D) => D * D], d2h: ['D²H', (D, H) => D * D * H], h: ['H', (D, H) => H] }, order = ['d', 'd2', 'd2h', 'h'];
  for (let m = 1; m < 16; m++) {
    const ts = order.filter((_, i) => m & (1 << i)), params = ['b0', ...ts.map((_, i) => 'b' + (i + 1))];
    const text = 'B = b0 + ' + ts.map((t, i) => `b${i + 1}·${T[t][0]}`).join(' + ');
    FORMS['lt.' + ts.join('.')] = { params, needsH: ts.some(t => t === 'd2h' || t === 'h'), scale: 'none', linear: ts, formula: { en: text },
      f: (p, D, H) => ts.reduce((s, t, i) => s + p['b' + (i + 1)] * T[t][1](D, H), p.b0) };
  }
}
for (const [id, f] of Object.entries(FORMS)) {
  try {
    registerForm({ id: 'biomass.' + id, tool: 'biomass', params: f.params.map(key => ({ key })), inputs: f.needsH ? { D: { unit: 'cm', bark: 'ob' }, H: { unit: 'm' } } : { D: { unit: 'cm', bark: 'ob' } },
      output: { name: 'B', unit: 'kg' }, formula: f.formula, transform: f.scale });
  } catch (e) { /* already registered (module loaded twice in one page) */ }
}
export const formOf = set => set && typeof set.form === 'string' && set.form.startsWith('biomass.') ? FORMS[set.form.slice(8)] || null : null;
const fin = x => typeof x === 'number' && Number.isFinite(x);

/**
 * Biomass of one tree with one coefficient set. x = { D (cm), H (m) | null, heightSource?: 'measured'|'estimated' }.
 * → { status: 'ok'|'noheight'|'invalid'|'unsupported', value (kg) | null, cf (back-transformation factor) | null,
 *     problems: [{ code }], warnings: [{ code, … }], estimatedHeight: bool }
 * Statuses: noheight = the form needs H and the tree has none ("not computed"); invalid = bad set, bad input or a
 * result that is not a positive finite mass; unsupported = a correction whose source is not yet in place.
 */
export function treeBiomass(set, x) {
  const out = { status: 'ok', value: null, cf: null, problems: [], warnings: [], estimatedHeight: false };
  const bad = (status, code, extra = {}) => { out.status = status; out.problems.push({ code, ...extra }); return out; };
  const f = formOf(set);
  if (!f) return bad('invalid', 'form.unknown');
  const sp = validateCoef(set); if (sp.length) return bad('invalid', 'set.invalid', { codes: sp.map(q => q.code) });
  const reg = form(set.form);
  for (const [k, v] of Object.entries(reg.inputs)) if (set.inputs[k].unit !== v.unit) return bad('invalid', 'unit.input', { key: k, unit: set.inputs[k].unit, expected: v.unit });
  if (set.output.unit !== reg.output.unit) return bad('invalid', 'unit.output', { unit: set.output.unit, expected: reg.output.unit });
  const D = x.D, H = x.H;
  if (!(fin(D) && D > 0)) return bad('invalid', 'input.D');
  if (f.needsH) {
    if (H == null) return bad('noheight', 'input.H.missing');
    if (!(fin(H) && H > 0)) return bad('invalid', 'input.H');
    out.estimatedHeight = x.heightSource === 'estimated';
  }
  const t = set.transform;
  if (f.scale !== 'none' && t && t.correction === 'baskerville' && !BASKERVILLE_SCALES.includes(f.scale)) return bad('unsupported', 'correction.baskerville.log10.source');
  const y = f.f(set.params, D, H);
  let v;
  if (f.scale === 'none') v = y;
  else { out.cf = correctionFactor(set) ?? 1; v = (f.scale === 'log' ? Math.exp(y) : 10 ** y) * out.cf; }
  if (!fin(v) || v <= 0) return bad('invalid', 'result.nonpositive', { value: fin(v) ? v : null });
  out.value = v;
  const ov = outsideValid(set, { D, H });
  if (ov.length) out.warnings.push({ code: 'valid.outside', items: ov });
  return out;
}

/**
 * All components of one tree. comps = [{ component, set }], total = set of a separate total equation or null.
 * → { components: [{ component, ...treeBiomass }], sum (kg, only when every component is ok) | null, total: result |
 *     null, additivity: { diff = total − sum, rel = diff / total } | null }
 */
export function treeComponents(x, comps, total = null) {
  const components = comps.map(c => ({ component: c.component, setId: c.set && c.set.id, ...treeBiomass(c.set, x) }));
  const allOk = components.length > 0 && components.every(c => c.status === 'ok');
  const sum = allOk ? components.reduce((a, c) => a + c.value, 0) : null;
  const tot = total ? { setId: total.id, ...treeBiomass(total, x) } : null;
  const additivity = sum != null && tot && tot.status === 'ok' ? { diff: tot.value - sum, rel: (tot.value - sum) / tot.value } : null;
  return { components, sum, total: tot, additivity };
}

/**
 * B. Conversion from volume (IPCC 2006 Eq. 2.8b). v = { V (m³), bark: 'ob'|'ib' }; k = { mode: 'bef'|'bcef', bark
 * (side the factors refer to), D (Mg dry matter / m³, mode bef), BEF (–, mode bef), BCEF (Mg / m³, mode bcef), R (–) }.
 * → { status, agb, bgb, total (Mg), problems } — nothing is computed when the bark sides differ or a factor is missing.
 */
export function fromVolume(v, k) {
  const out = { status: 'ok', agb: null, bgb: null, total: null, problems: [] };
  const bad = (code, extra = {}) => { out.status = 'invalid'; out.problems.push({ code, ...extra }); return out; };
  if (!(fin(v.V) && v.V >= 0)) return bad('input.V');
  if (!['ob', 'ib'].includes(v.bark) || !['ob', 'ib'].includes(k.bark)) return bad('bark.unknown');
  if (v.bark !== k.bark) return bad('bark.mismatch', { volume: v.bark, factors: k.bark });
  let expand;
  if (k.mode === 'bef') { if (!(fin(k.D) && k.D > 0)) return bad('factor.D'); if (!(fin(k.BEF) && k.BEF > 0)) return bad('factor.BEF'); expand = k.D * k.BEF; }
  else if (k.mode === 'bcef') { if (!(fin(k.BCEF) && k.BCEF > 0)) return bad('factor.BCEF'); expand = k.BCEF; }
  else return bad('mode');
  if (!(fin(k.R) && k.R >= 0)) return bad('factor.R');
  out.agb = v.V * expand; out.bgb = out.agb * k.R; out.total = out.agb + out.bgb;
  return out;
}

/** Carbon and CO₂ of a dry mass (any mass unit; the same unit comes out). CF must lie in (0, 1]. */
export function carbon(B, CF) {
  if (!(fin(B) && B >= 0)) return { status: 'invalid', C: null, CO2: null, problems: [{ code: 'input.B' }] };
  if (!(fin(CF) && CF > 0 && CF <= 1)) return { status: 'invalid', C: null, CO2: null, problems: [{ code: 'factor.CF' }] };
  const C = B * CF; return { status: 'ok', C, CO2: C * CO2_PER_C, problems: [] };
}

/**
 * Stand level: per plot × period, Σ (tree value in kg) · 10000 / area / 1000 = Mg/ha, from the Plot & Stand grouping
 * (fixed-area plots; combinations without records follow emptyCombos). values: Map(tree record → number | null) for
 * one component (null = not computed). A unit with any tree not computed gets null and the count, never a partial sum
 * shown as the total. → [{ plot_id, period, state, area, n, nComputed, nMissing, perHa (Mg/ha) | null }]
 */
export function standTotals(ds, values, emptyCombos = 'unmeasured') {
  const { units } = buildUnits(ds, { status: null, emptyCombos });
  return units.filter(u => u.state === 'measured' || u.state === 'empty').map(u => {
    let s = 0, k = 0;
    for (const t of u.trees) { const v = values.get(t); if (fin(v)) { s += v; k++; } }
    const n = u.trees.length, miss = n - k;
    return { plot_id: u.plot_id, period: u.period, state: u.state, area: u.area, n, nComputed: k, nMissing: miss, perHa: miss ? null : s * 10000 / u.area / 1000 };
  });
}

/**
 * Summary of a tree list for one component: how many were computed, not computed for missing height, outside the
 * validity range, computed with an estimated height. results: [treeBiomass()].
 */
export function countStates(results) {
  const c = { n: results.length, ok: 0, noheight: 0, invalid: 0, unsupported: 0, outside: 0, estimatedHeight: 0 };
  for (const r of results) { c[r.status] = (c[r.status] || 0) + 1; if (r.warnings.some(w => w.code === 'valid.outside')) c.outside++; if (r.status === 'ok' && r.estimatedHeight) c.estimatedHeight++; }
  return c;
}

/* ---------------- BC02: a whole data package (species mapping, components, units) ---------------- */
const spKey = t => t.species == null ? '' : String(t.species);
/** Species of a package with their record counts ('' = no species recorded). */
export function speciesOf(ds) {
  const m = new Map(); for (const t of ds.trees) m.set(spKey(t), (m.get(spKey(t)) || 0) + 1);
  return [...m.entries()].map(([species, n]) => ({ species, n })).sort((a, b) => b.n - a.n || String(a.species).localeCompare(String(b.species), 'tr'));
}

/**
 * A. Allometric equations over a package. cfg = { components: [{ key, label, CF }], map: { species: { componentKey: setId } },
 * total: { species: setId } (optional separate total equations), emptyCombos }. sets: Map(id → model-coef set).
 * A species without a set for a component is never computed with another species' equation: its trees get status
 * 'unmapped' for that component and are listed with their row numbers.
 * → { trees: [{ t, row, species, comps: { key: { status, value (kg), C (kg), setId, problems, warnings, estimatedHeight } },
 *              sum (kg) | null, C (kg) | null, total, additivity }],
 *     counts: { key: countStates + unmapped }, unmapped: [{ species, component, rows }], noheight: [{ component, rows }],
 *     units: [{ plot_id, period, state, area, n, comps: { key: { perHa, nMissing } }, B, C, CO2 (per ha, Mg) | null }] }
 */
export function computeAllometric(ds, cfg, sets) {
  const comps = cfg.components || [], map = cfg.map || {}, totalMap = cfg.total || {};
  const unmapped = new Map(), noh = new Map();
  const trees = ds.trees.map(t => {
    const sp = spKey(t), x = { D: t.dbh, H: t.height ?? null, heightSource: t.height_source }, out = { t, row: t.row ?? null, species: sp, comps: {} };
    for (const c of comps) {
      const id = (map[sp] || {})[c.key], set = id ? sets.get(id) : null;
      if (!set) {
        out.comps[c.key] = { status: 'unmapped', value: null, C: null, setId: id || null, problems: [{ code: id ? 'set.missing' : 'species.unmapped' }], warnings: [], estimatedHeight: false };
        const k = sp + '\u0001' + c.key; if (!unmapped.has(k)) unmapped.set(k, { species: sp, component: c.key, rows: [] }); unmapped.get(k).rows.push(out.row);
        continue;
      }
      const r = treeBiomass(set, x), cb = r.status === 'ok' ? carbon(r.value, c.CF) : null;
      out.comps[c.key] = { ...r, setId: id, C: cb && cb.status === 'ok' ? cb.C : null, cfProblem: cb && cb.status !== 'ok' };
      if (r.status === 'noheight') { if (!noh.has(c.key)) noh.set(c.key, { component: c.key, rows: [] }); noh.get(c.key).rows.push(out.row); }
    }
    const all = comps.length && comps.every(c => out.comps[c.key].status === 'ok');
    out.sum = all ? comps.reduce((a, c) => a + out.comps[c.key].value, 0) : null;
    out.C = all && comps.every(c => out.comps[c.key].C != null) ? comps.reduce((a, c) => a + out.comps[c.key].C, 0) : null;
    const tset = totalMap[sp] ? sets.get(totalMap[sp]) : null;
    out.total = tset ? { setId: tset.id, ...treeBiomass(tset, x) } : null;
    out.additivity = out.sum != null && out.total && out.total.status === 'ok' ? { diff: out.total.value - out.sum, rel: (out.total.value - out.sum) / out.total.value } : null;
    return out;
  });
  const counts = Object.fromEntries(comps.map(c => { const rs = trees.map(x => x.comps[c.key]); const k = countStates(rs.filter(r => r.status !== 'unmapped')); return [c.key, { ...k, n: rs.length, unmapped: rs.filter(r => r.status === 'unmapped').length }]; }));
  const per = key => new Map(trees.map(x => [x.t, key(x)]));
  const ec = cfg.emptyCombos || 'unmeasured';
  const compUnits = Object.fromEntries(comps.map(c => [c.key, standTotals(ds, per(x => x.comps[c.key].status === 'ok' ? x.comps[c.key].value : null), ec)]));
  const sumU = standTotals(ds, per(x => x.sum), ec), cU = standTotals(ds, per(x => x.C), ec);
  const units = sumU.map((u, i) => ({ plot_id: u.plot_id, period: u.period, state: u.state, area: u.area, n: u.n,
    comps: Object.fromEntries(comps.map(c => [c.key, { perHa: compUnits[c.key][i].perHa, nMissing: compUnits[c.key][i].nMissing }])),
    B: u.perHa, C: cU[i].perHa, CO2: cU[i].perHa == null ? null : cU[i].perHa * CO2_PER_C }));
  return { trees, counts, unmapped: [...unmapped.values()], noheight: [...noh.values()], units };
}

/**
 * B. Conversion from volume over a package. volumeOf(t) → V (m³) | null; cfg = { bark (side of the volumes), factors:
 * { mode, bark, D, BEF, BCEF, R }, CF, emptyCombos }. Per tree in kg (Mg · 1000). A tree without a volume is not
 * computed (status 'novolume'); different bark sides compute nothing.
 * → { trees: [{ t, row, status, problems, V, agb, bgb, total, C (kg) }], units: [{ …, AGB, BGB, B, C, CO2 (Mg/ha) | null }], missing: rows }
 */
export function computeVolume(ds, volumeOf, cfg) {
  const trees = ds.trees.map(t => {
    const V = volumeOf(t), row = t.row ?? null;
    if (!fin(V)) return { t, row, status: 'novolume', problems: [{ code: 'input.V.missing' }], V: null, agb: null, bgb: null, total: null, C: null };
    const r = fromVolume({ V, bark: cfg.bark }, cfg.factors);
    if (r.status !== 'ok') return { t, row, status: r.status, problems: r.problems, V, agb: null, bgb: null, total: null, C: null };
    const cb = carbon(r.total * 1000, cfg.CF);
    return { t, row, status: 'ok', problems: cb.status === 'ok' ? [] : cb.problems, V, agb: r.agb * 1000, bgb: r.bgb * 1000, total: r.total * 1000, C: cb.status === 'ok' ? cb.C : null };
  });
  const per = k => new Map(trees.map(x => [x.t, x[k]])), ec = cfg.emptyCombos || 'unmeasured';
  const A = standTotals(ds, per('agb'), ec), Bg = standTotals(ds, per('bgb'), ec), T = standTotals(ds, per('total'), ec), Cc = standTotals(ds, per('C'), ec);
  const units = T.map((u, i) => ({ plot_id: u.plot_id, period: u.period, state: u.state, area: u.area, n: u.n, nMissing: u.nMissing, AGB: A[i].perHa, BGB: Bg[i].perHa, B: u.perHa, C: Cc[i].perHa, CO2: Cc[i].perHa == null ? null : Cc[i].perHa * CO2_PER_C }));
  return { trees, units, missing: trees.filter(x => x.status === 'novolume').map(x => x.row) };
}

/**
 * BC03: the two approaches over the same package, kept in separate rows (never averaged or mixed). allo: computeAllometric
 * result; vol: computeVolume result, both over the same ds (same tree order). Per tree B and C in kg, per unit Mg/ha.
 * → { units: [{ approach, plot_id, period, n, B, C, CO2 }], trees: [{ approach, row, t, status, B, C }] }
 */
export function bothApproaches(allo, vol) {
  const units = [];
  allo.units.forEach((u, i) => {
    const v = vol.units[i];
    units.push({ approach: 'allometric', plot_id: u.plot_id, period: u.period, n: u.n, B: u.B, C: u.C, CO2: u.CO2 });
    units.push({ approach: 'volume', plot_id: v.plot_id, period: v.period, n: v.n, B: v.B, C: v.C, CO2: v.CO2 });
  });
  const trees = [];
  allo.trees.forEach((a, i) => {
    const v = vol.trees[i];
    trees.push({ approach: 'allometric', row: a.row, t: a.t, status: a.sum != null ? 'ok' : 'incomplete', B: a.sum, C: a.C });
    trees.push({ approach: 'volume', row: v.row, t: v.t, status: v.status, B: v.total, C: v.C });
  });
  return { units, trees };
}
