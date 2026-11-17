// Crown metrics, stage TM-04/a1 (docs/PLATFORM_PLAN.md TM-04). No DOM. Sources (docs/METHODS.md §23):
//   van Laar & Akça 2007, §4.1.7 Tree crown and foliage (pp. 80–82): crown radius = distance from the centre of the bole
//     to the outer edge of the crown, usually at its widest; crown width = twice the radius; radius from 4 or more
//     directions (Röhle et al. 1985: 4–8 radii per tree for the stand, 8–16 for single trees); crown ratio = live crown
//     length as a per cent of total height; crown surface area of conifers as a cone or a paraboloid [B].
//   Kershaw, Ducey, Beers & Husch 2016, §5.5.1–5.5.3 (pp. 125–127): crown length = total height − height of the crown base;
//     crown area from a circle with the average of the maximum and minimum diameters, two diameters at right angles, or
//     (elliptical form) the two diameters as axes; with radii at random or systematic azimuths from an interior point,
//     the quadratic mean radius as the radius of an equivalent circle gives an unbiased crown area for any shape
//     (Gregoire & Valentine 1995); cone surface S = π·d_b·L/2 (L slant length) and volume V = π·d_b²·l/12 (eqs 5.18–5.19,
//     after Schreuder et al. 1993); §5.5.5 live crown ratio; §8.6.1 (p. 237) crown cover = total projected crown area
//     per unit ground area, may exceed 1; Table A.2 (ellipse A = π·a·b) [B].
//   Hamilton 1975, Part V §8 Geometric formulae (p. 190): cylinder, cone and paraboloid volumes and surfaces; paraboloid
//     surface = 2πr/(12h²)·((r² + 4h²)^{3/2} − r³) + πr², the last term being the base [B]. The paraboloid formula printed
//     in van Laar & Akça (p. 82) lacks the "− r³" term (it does not tend to 0 with the length); Hamilton's is used and
//     checked against numerical integration of the surface of revolution.
// Units: crown radii, widths and lengths in m; areas in m²; volumes in m³; tree height in m.

const fin = x => typeof x === 'number' && Number.isFinite(x);
const pos = x => fin(x) && x > 0;

/**
 * Crown projection from radii (m) measured from the stem (or an interior point): n, arithmetic mean radius, crown width
 * 2·r̄ (van Laar), quadratic mean radius r_q = √(Σr²/n) and the area of the equivalent circle π·r_q² (Kershaw; Gregoire
 * and Valentine), min and max. Fewer than 4 radii: a warning (van Laar: 4 or more).
 */
export function crownFromRadii(radii) {
  const rs = radii || [], bad = rs.map((r, i) => (fin(r) && r >= 0 ? null : i + 1)).filter(i => i != null);
  if (!rs.length) return { status: 'invalid', problems: [{ code: 'radii.none' }], warnings: [] };
  if (bad.length) return { status: 'invalid', problems: [{ code: 'radius.bad', rows: bad }], warnings: [] };
  const n = rs.length, mean = rs.reduce((s, r) => s + r, 0) / n, rq = Math.sqrt(rs.reduce((s, r) => s + r * r, 0) / n);
  if (!(rq > 0)) return { status: 'invalid', problems: [{ code: 'radii.zero' }], warnings: [] };
  const warnings = n < 4 ? [{ code: 'radii.few', n }] : [];
  return { status: 'ok', n, rMean: mean, width: 2 * mean, rq, area: Math.PI * rq * rq, widthQ: 2 * rq, min: Math.min(...rs), max: Math.max(...rs), problems: [], warnings };
}

/**
 * Crown projection from two diameters (m), e.g. the widest and the one at right angles (Kershaw §5.5.2): mean diameter
 * and the circle of that diameter (π/4·D̄²), and the ellipse with the two diameters as axes (π·a·b, a and b the
 * half-diameters; Kershaw Table A.2, Hamilton §8).
 */
export function crownFromDiameters(d1, d2) {
  if (!pos(d1) || !pos(d2)) return { status: 'invalid', problems: [{ code: 'diam.bad' }], warnings: [] };
  const D = (d1 + d2) / 2;
  return { status: 'ok', width: D, areaCircle: Math.PI / 4 * D * D, areaEllipse: Math.PI * (d1 / 2) * (d2 / 2), problems: [], warnings: [] };
}

/**
 * Crown length (m) = total height − height to the crown base, and crown ratio (%) = crown length / height · 100
 * (Kershaw §5.5.1, §5.5.5; van Laar). With the dbh (cm) and a crown width (m): the ratio of crown diameter to dbh (both
 * in the same unit; Kershaw §5.5.2).
 */
export function crownLength({ H, base, dbh = null, width = null }) {
  const problems = [];
  if (!pos(H)) problems.push({ code: 'H.bad' });
  if (!(fin(base) && base >= 0)) problems.push({ code: 'base.bad' });
  if (!problems.length && !(base < H)) problems.push({ code: 'base.gt' });
  if (problems.length) return { status: 'invalid', problems, warnings: [] };
  const L = H - base;
  return { status: 'ok', L, ratio: L / H * 100, cwd: pos(dbh) && pos(width) ? width / (dbh / 100) : null, problems, warnings: [] };
}

/**
 * Surface (lateral, the base disc excluded: the crown's outer surface, van Laar) and volume of a crown of width W (m,
 * the diameter at its base) and length L (m) for an assumed shape (Hamilton §8; cone also Kershaw eqs 5.18–5.19):
 *   cylinder:   V = π r² L,     S = 2π r L
 *   cone:       V = π W² L/12,  S = π r s, s = √(r² + L²) the slant length (= π·W·s/2)
 *   paraboloid: V = π r² L/2,   S = π r/(6L²)·((r² + 4L²)^{3/2} − r³)
 * r = W/2. Returns { status, shape, V, S, slant? }.
 */
export const SHAPES = ['cone', 'paraboloid', 'cylinder'];
export function crownSolid(shape, W, L) {
  if (!SHAPES.includes(shape)) return { status: 'invalid', problems: [{ code: 'shape.bad' }] };
  if (!pos(W) || !pos(L)) return { status: 'invalid', problems: [{ code: 'solid.bad' }] };
  const r = W / 2;
  if (shape === 'cylinder') return { status: 'ok', shape, V: Math.PI * r * r * L, S: 2 * Math.PI * r * L, problems: [] };
  if (shape === 'cone') { const s = Math.hypot(r, L); return { status: 'ok', shape, V: Math.PI * W * W * L / 12, S: Math.PI * r * s, slant: s, problems: [] }; }
  // Hamilton's surface, written without the cancellation of (r² + 4L²)^{3/2} − r³ for flat crowns (the same value:
  // multiply and divide by (r² + 4L²)^{3/2} + r³): S = 2πr/3 · (3r⁴ + 12r²L² + 16L⁴) / ((r² + 4L²)^{3/2} + r³).
  const r2 = r * r, L2 = L * L;
  return { status: 'ok', shape, V: Math.PI * r2 * L / 2, S: 2 * Math.PI * r / 3 * (3 * r2 * r2 + 12 * r2 * L2 + 16 * L2 * L2) / ((r2 + 4 * L2) ** 1.5 + r2 * r), problems: [] };
}

/**
 * Crown cover (Kershaw §8.6.1): total projected crown area of the trees of a plot divided by the plot area, as m²/ha and
 * as a unitless share (ha/ha; may exceed 1 where crowns overlap). widths: crown widths (m) of the trees, each taken as a
 * circle; plotArea in m². Unreadable widths reported by position.
 */
export function crownCover(widths, plotArea) {
  const ws = widths || [], bad = ws.map((w, i) => (pos(w) ? null : i + 1)).filter(i => i != null);
  if (!(pos(plotArea))) return { status: 'invalid', problems: [{ code: 'plot.bad' }], warnings: [] };
  if (!ws.length) return { status: 'invalid', problems: [{ code: 'widths.none' }], warnings: [] };
  const ok = ws.filter(pos), total = ok.reduce((s, w) => s + Math.PI / 4 * w * w, 0), cover = total / plotArea;
  return { status: 'ok', n: ok.length, bad, total, cover, perHa: cover * 10000, warnings: cover > 1 ? [{ code: 'cover.overlap' }] : [], problems: [] };
}
