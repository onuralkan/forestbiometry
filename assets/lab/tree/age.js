// Tree age and increment, stage TM-05/a1 (docs/PLATFORM_PLAN.md TM-05). No DOM.
// Sources (docs/METHODS.md §23):
//   Graves 1906 [B]: §137 rings counted at the stump give the age above it; add the years the species needs to reach
//     that height (from the user's own seedling study: no values shipped, K1); §138 increment borer at breast height:
//     count the rings to the heart and add the years to breast height; §139 trees without annual rings: age = diameter
//     / mean annual diameter growth (example: 40 in at 1 in per 4 years → 160 years); §140 mean age of a stand:
//     arithmetic mean of test trees, Σ nᵢaᵢ / N, Smalian's volume formula A = Σvᵢ / Σ(vᵢ/aᵢ) and the basal-area
//     formula A = Σ bᵢaᵢ / B; §141 Lorey's economic age: rings outside the core of suppression + the average age of
//     cores of that diameter (example 70 + 14 = 84, not 70 + 25 = 95); §142 current, periodic, mean annual and periodic
//     annual growth, growth percent P = 100·a/D (simple interest on the present size); §150 diameter growth: twice the
//     radial distance; §172 growth percent over n years with the past size v as principal, 100·(V − v)/(v·n), with the
//     present size V (the book notes it under-estimates), or with their mean (Pressler): 200/n·(V − v)/(V + v);
//     §174 Pressler for standing trees: 200/n·(D² − d²)/(D² + d²) with the diameter now and n years ago (borer), and
//     the same through the relative diameter q = D/a, a = D − d.
//   van Laar and Akça 2007, Chapter 4 §1.1 [B]: age from rings at stump height or on cores at breast height plus the
//     years to reach that point; false rings over-estimate and missing rings under-estimate the age (cross-dating).

const fin = x => typeof x === 'number' && Number.isFinite(x);
const pos = x => fin(x) && x > 0;

/** Age = rings counted at a height + years needed to reach that height (Graves §137–138; van Laar and Akça 4.1.1). */
export function treeAge({ rings, yearsToHeight = 0 }) {
  if (!(Number.isInteger(rings) && rings >= 0) || !(fin(yearsToHeight) && yearsToHeight >= 0)) return { status: 'invalid', problems: [{ code: 'age.input' }] };
  return { status: 'ok', age: rings + yearsToHeight, rings, yearsToHeight, problems: [] };
}
/** Lorey's economic age (Graves §141): rings outside the core of suppression + the average age of such cores. */
export function economicAge({ ringsOutside, coreAge }) {
  if (!(Number.isInteger(ringsOutside) && ringsOutside >= 0) || !(fin(coreAge) && coreAge >= 0)) return { status: 'invalid', problems: [{ code: 'age.input' }] };
  return { status: 'ok', age: ringsOutside + coreAge, problems: [] };
}
/** Age of a tree without annual rings from its diameter and a known mean annual diameter growth (Graves §139). */
export function ageFromGrowth({ D, mai }) {
  if (!pos(D) || !pos(mai)) return { status: 'invalid', problems: [{ code: 'age.input' }] };
  return { status: 'ok', age: D / mai, problems: [] };
}

/**
 * Mean age of a stand from groups (Graves §140): groups [{ a (age), n (trees), b (basal area), v (volume) }].
 * method: 'arithmetic' (mean of the group ages), 'number' (Σ nᵢaᵢ/N), 'basal' (Σ bᵢaᵢ/B), 'volume' (Smalian:
 * Σvᵢ / Σ(vᵢ/aᵢ), the total volume over the total mean annual growth).
 */
export function standAge(groups, method = 'number') {
  const need = { arithmetic: [], number: ['n'], basal: ['b'], volume: ['v'] }[method];
  if (!need) return { status: 'invalid', problems: [{ code: 'method.bad' }] };
  const g = (groups || []).filter(x => x && pos(x.a) && need.every(k => pos(x[k])));
  if (!g.length) return { status: 'invalid', problems: [{ code: 'groups.empty' }] };
  const sum = f => g.reduce((s, x) => s + f(x), 0);
  const A = method === 'arithmetic' ? sum(x => x.a) / g.length : method === 'number' ? sum(x => x.n * x.a) / sum(x => x.n)
    : method === 'basal' ? sum(x => x.b * x.a) / sum(x => x.b) : sum(x => x.v) / sum(x => x.v / x.a);
  return { status: 'ok', method, A, groups: g.length, skipped: (groups || []).length - g.length, problems: [] };
}

/** Mean annual growth (total / age) and periodic annual growth ((now − then) / years) (Graves §142). */
export const meanAnnual = (total, age) => (fin(total) && pos(age) ? total / age : null);
export const periodicAnnual = (now, then, years) => (fin(now) && fin(then) && pos(years) ? (now - then) / years : null);

/**
 * Growth percent per year over n years (Graves §172): principal 'past' 100·(V − v)/(v·n), 'present' 100·(V − v)/(V·n),
 * 'mean' (Pressler) 200/n·(V − v)/(V + v). V, v: the size now and n years ago (volume, basal area, diameter²…).
 */
export function growthPercent({ now, then, n, principal = 'mean' }) {
  if (!pos(now) || !pos(then) || !pos(n)) return { status: 'invalid', problems: [{ code: 'growth.input' }] };
  const d = now - then;
  const p = principal === 'past' ? 100 * d / (then * n) : principal === 'present' ? 100 * d / (now * n) : principal === 'mean' ? 200 / n * d / (now + then) : NaN;
  if (!fin(p)) return { status: 'invalid', problems: [{ code: 'principal.bad' }] };
  return { status: 'ok', p, principal, problems: [], warnings: d < 0 ? [{ code: 'growth.negative' }] : [] };
}
/** Simple growth percent of the next year on the present size: P = 100·a/D (Graves §142). */
export const annualPercent = (a, D) => (fin(a) && pos(D) ? 100 * a / D : null);
/** Pressler's growth percent of a standing tree from its diameter now (D) and n years ago (d) (Graves §174). */
export const presslerDiameter = (D, d, n) => (pos(D) && pos(d) && pos(n) && D > d ? 200 / n * (D * D - d * d) / (D * D + d * d) : null);
/** The same through the relative diameter q = D/a, a = D − d (Pressler's tables): 200/n·(2q − 1)/(q² + (q − 1)²). */
export const presslerRelative = (q, n) => (fin(q) && q > 1 && pos(n) ? 200 / n * (2 * q - 1) / (q * q + (q - 1) * (q - 1)) : null);

/**
 * Increment core at breast height (Graves §138, §150; van Laar and Akça 4.1.1): ring widths in mm from the bark
 * inward (the outermost, most recent ring first), the diameter now (cm) on the same basis as the core (inside bark;
 * give the double bark thickness in cm to remove it from an outside-bark diameter) and the years needed to reach
 * breast height. Diameter k years ago = D_ib − 2·(sum of the k outermost widths); age then = age now − k.
 * Returns { status, ageNow, rings, dib, series: [{ yearsAgo, age, d }], decades: [...] (every 10 years), problems, warnings }.
 * reachesPith = true when the core reaches the pith (otherwise the rings and the age are a lower bound).
 */
export function coreSeries({ widths, D, doubleBark = 0, yearsToBh = 0, reachesPith = true }) {
  const p = [];
  if (!Array.isArray(widths) || !widths.length || widths.some(w => !(fin(w) && w >= 0))) p.push({ code: 'widths.bad' });
  if (!pos(D)) p.push({ code: 'diameter.bad' });
  if (!(fin(doubleBark) && doubleBark >= 0) || (pos(D) && doubleBark >= D)) p.push({ code: 'bark.bad' });
  if (!(fin(yearsToBh) && yearsToBh >= 0)) p.push({ code: 'age.input' });
  if (p.length) return { status: 'invalid', problems: p };
  const dib = D - doubleBark, rings = widths.length, ageNow = rings + yearsToBh, series = [{ yearsAgo: 0, age: ageNow, d: dib }];
  let cum = 0;
  widths.forEach((w, k) => { cum += w / 10; series.push({ yearsAgo: k + 1, age: ageNow - (k + 1), d: dib - 2 * cum }); });
  const warnings = [], last = series[series.length - 1];
  if (last.d < -1e-9) warnings.push({ code: 'core.longer', excess: -last.d });
  else if (reachesPith && last.d > 0.02 * dib) warnings.push({ code: 'core.short', left: last.d });
  if (!reachesPith) warnings.push({ code: 'core.no-pith' });
  return { status: 'ok', ageNow, rings, dib, radius: cum, series, decades: series.filter(s => s.yearsAgo % 10 === 0), problems: [], warnings };
}
