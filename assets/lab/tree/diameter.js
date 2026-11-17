// Diameter and basal area, stage TM-02/a1 (docs/PLATFORM_PLAN.md TM-02). No DOM. Sources (docs/METHODS.md §23):
//   Hamilton 1975, Part II §2 (diameter conventions: overbark by girthing tape, rounded down to the whole centimetre by
//     classifying tapes; at 1.3 m; tape taut and at right angles; on a slope on the upper side; leaning tree on the
//     under side; on turfed/ploughed ground from the higher of root collar and ground; below a swelling where smallest;
//     forked below 1.3 m: each limb a tree; forked at 1.3 m: one tree, below the fork), Part V §8 geometric formulae
//     (circle: area = π/4·d², circumference = π·d; ellipse: area = π·a·b), §9 conversion factors (1 in = 2.54 cm) [B].
//   Graves 1906, §42–43 (calipers at right angles; a tape gives the diameter for every circumference, usually larger
//     than calipers; swelling: measure above or below, or both and average), §114 (eccentric stem: two diameters at
//     right angles, their average recorded), §143 (cross-sections: average of the longest diameter and the one at right
//     angles; irregular stems: mean of several diameters), §127 (diameter of the tree of average basal area:
//     B̄ = Σ bᵢnᵢ / N, then the corresponding diameter) [B].
// Units inside: d in cm, girth in cm, basal area in m².

const fin = x => typeof x === 'number' && Number.isFinite(x);
export const LENGTH_UNITS = { cm: 1, mm: 0.1, m: 100, in: 2.54 };   // factor to centimetres (Hamilton §9: 1 in = 2.54 cm)
export const toCm = (v, unit = 'cm') => (fin(v) && LENGTH_UNITS[unit] != null ? v * LENGTH_UNITS[unit] : null);

/** Diameter (cm) of a circle with the given girth (cm): d = c/π (Hamilton §8; Graves §43 tapes). */
export const diameterFromGirth = c => (fin(c) && c > 0 ? c / Math.PI : null);
/** Girth (cm) of a circle of diameter d (cm). */
export const girthFromDiameter = d => (fin(d) && d > 0 ? Math.PI * d : null);
/** Basal area (m²) of a circle of diameter d (cm): π/4·d², d in metres. */
export const basalArea = d => (fin(d) && d >= 0 ? Math.PI / 40000 * d * d : null);
/** Diameter (cm) of the circle of basal area g (m²). */
export const diameterFromArea = g => (fin(g) && g >= 0 ? Math.sqrt(40000 * g / Math.PI) : null);

/**
 * One stem from one or more readings. readings: [{ kind: 'diameter' | 'girth', value, unit }]. mean:
 * 'arithmetic' (Graves §114, §143: two diameters at right angles, or several, averaged) or 'ellipse' (two diameters
 * as the axes of an ellipse, area π·a·b = π/4·d₁·d₂, Hamilton §8; the diameter of the circle of the same area is
 * √(d₁·d₂); exactly two diameters needed). Girth readings are turned into diameters first.
 * round: 'none' | 'down' (to the whole centimetre below, Hamilton §2; a value on a class boundary goes to the upper
 * class) | 'nearest-mm'. Returns { status, d, g, dRaw, parts, problems }.
 */
export function stemDiameter(readings, { mean = 'arithmetic', round = 'none' } = {}) {
  const problems = [], ds = [];
  (readings || []).forEach((r, i) => {
    const v = toCm(r && r.value, (r && r.unit) || 'cm');
    if (!(fin(v) && v > 0)) { problems.push({ code: 'reading.bad', index: i }); return; }
    ds.push(r.kind === 'girth' ? diameterFromGirth(v) : v);
  });
  if (!ds.length && !problems.length) problems.push({ code: 'reading.none' });
  if (mean === 'ellipse' && ds.length !== 2) problems.push({ code: 'ellipse.two' });
  if (!['arithmetic', 'ellipse'].includes(mean)) problems.push({ code: 'mean.bad' });
  if (!['none', 'down', 'nearest-mm'].includes(round)) problems.push({ code: 'round.bad' });
  if (problems.length) return { status: 'invalid', problems };
  const dRaw = mean === 'ellipse' ? Math.sqrt(ds[0] * ds[1]) : ds.reduce((s, x) => s + x, 0) / ds.length;
  const d = roundDiameter(dRaw, round);
  return { status: 'ok', d, g: basalArea(d), dRaw, parts: ds, mean, round, problems };
}
/** Rounding of a diameter (cm): 'down' = whole centimetre below (the boundary itself stays), 'nearest-mm', 'none'. */
export function roundDiameter(d, round = 'none') {
  if (!fin(d)) return null;
  if (round === 'down') return Math.floor(d + 1e-9);
  if (round === 'nearest-mm') return Math.round(d * 10) / 10;
  return d;
}

/**
 * Several trees: number, Σ basal area, arithmetic mean diameter and the diameter of the tree of average basal area
 * (Graves §127: B̄ = Σ bᵢnᵢ / N, d of B̄). trees: [{ d (cm), n (count, default 1) }].
 */
export function treeSummary(trees) {
  const ok = (trees || []).filter(t => t && fin(t.d) && t.d > 0 && (t.n == null || (fin(t.n) && t.n > 0)));
  const N = ok.reduce((s, t) => s + (t.n ?? 1), 0);
  if (!N) return { status: 'empty', N: 0, skipped: (trees || []).length };
  const G = ok.reduce((s, t) => s + (t.n ?? 1) * basalArea(t.d), 0), dMean = ok.reduce((s, t) => s + (t.n ?? 1) * t.d, 0) / N;
  return { status: 'ok', N, G, gMean: G / N, dMean, dg: diameterFromArea(G / N), skipped: (trees || []).length - ok.length };
}
