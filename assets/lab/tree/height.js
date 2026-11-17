// Tree height from field readings, stage TM-01/a1 (docs/PLATFORM_PLAN.md TM-01). No DOM.
// Sources (docs/METHODS.md §23):
//   Hamilton, G.J. 1975. Forest Mensuration Handbook. Forestry Commission Booklet 39. HMSO, London (3rd impr. 1988),
//     Part V §4 "Height measurement", Figure 19 [B]: observer O, tree base B, top A, C the point of the stem level with
//     the eye; a1 the angle to the top, a2 the angle to the base, OB the distance from the eye to the base:
//     OC = OB·cos a2, BC = OB·sin a2, AC = OC·tan a1, AB = AC + BC (base below the eye) or AB = AC − BC (base above).
//     Note to §3: with a rangefinder to another point P of the stem, OC = OP·cos(angle to P). §6: height is the vertical
//     distance between top and base; on sloping ground the base is ground level on the upper side of the tree.
//     §5: stand at about 1–1½ times the tree height; §7: take two or three readings and average them.
//   Graves, H.S. 1906. Forest Mensuration. Wiley, New York, §65, §72–§76 [B]:
//     §73–74 (clinometer, Abney level): height above the eye = horizontal distance × tangent (or percentage / 100) of the
//     angle to the top; the part below the eye likewise from the angle to the base; the two are added (subtracted when
//     the eye is below the base, §67 Fig. 19). §72 Brandis: BC = AC·sin(u + l)/cos u, AC the distance from the eye to the
//     base, u and l the angles above and below the horizontal. §65: shadow method (tree shadow × pole length / pole
//     shadow) and the two-pole method (height = bc × AC / Ac, worked example 6 × 30 / 4 = 45). §76: stand at a
//     distance about equal to the height, rather more than less; on a slope stand above the base; for a leaning tree
//     stand at right angles to the lean, the result is then the vertical height, not the stem length (no formula given
//     for the stem length: not computed here).
// Convention here: angles are signed, measured from the horizontal, positive upward (a base below the eye has a
// negative angle), so the add/subtract cases of both sources become one formula: H = D·(tan αtop − tan αbase).

const fin = x => typeof x === 'number' && Number.isFinite(x);
const RAD = Math.PI / 180;
export const UNITS = ['deg', 'pct'];
/** Slope of a reading as a tangent: degrees → tan, percent → p/100 (Graves §73: the percentage is the tangent × 100). */
export const tanOf = (v, unit) => unit === 'pct' ? v / 100 : Math.tan(v * RAD);
/** The same reading as an angle in degrees. */
export const degOf = (v, unit) => unit === 'pct' ? Math.atan(v / 100) / RAD : v;

function checkReadings(top, base, unit) {
  const p = [];
  if (!UNITS.includes(unit)) p.push({ code: 'unit.bad' });
  if (!fin(top)) p.push({ code: 'top.missing' });
  if (!fin(base)) p.push({ code: 'base.missing' });
  if (unit === 'deg') for (const [k, v] of [['top', top], ['base', base]]) if (fin(v) && !(v > -90 && v < 90)) p.push({ code: k + '.range' });
  if (!p.length && !(tanOf(top, unit) > tanOf(base, unit))) p.push({ code: 'order' });   // the top must be sighted above the base
  return p;
}
/** Warnings shared by the methods: distance against height (both sources), a steep sight to the top. */
function warnings(D, H, topDeg) {
  const w = [];
  if (fin(D) && fin(H) && H > 0) { const r = D / H; if (r < 1) w.push({ code: 'distance.short', ratio: r }); }
  if (topDeg > 60) w.push({ code: 'top.steep', deg: topDeg });
  return w;
}

/**
 * Tangent (percent) method with the HORIZONTAL distance D (m) from the eye to the stem axis (Graves §73–74; Hamilton
 * Fig. 19 AC = OC·tan a1). top, base: readings in degrees or percent. Returns { status, H, above, below, problems, warnings }:
 * above = height of the top over the eye level, below = height of the eye level over the base (negative if the eye is
 * below the base).
 */
export function heightTangent({ D, top, base, unit = 'deg' }) {
  const problems = checkReadings(top, base, unit);
  if (!(fin(D) && D > 0)) problems.push({ code: 'distance.bad' });
  if (problems.length) return { status: 'invalid', problems, warnings: [] };
  const above = D * tanOf(top, unit), below = -D * tanOf(base, unit), H = above + below;
  return { status: 'ok', method: 'tangent', H, above, below, D, problems, warnings: warnings(D, H, degOf(top, unit)) };
}

/**
 * Distance S (m) measured along the line of sight from the eye to a point P of the stem (Hamilton Fig. 19 with its
 * note; P = the base gives OB): horizontal distance D = S·cos(angle to P), then the tangent method. pointAngle in the
 * same unit; omitted = P is the base (pointAngle = base).
 */
export function heightSlopeDistance({ S, top, base, unit = 'deg', pointAngle = null }) {
  const problems = checkReadings(top, base, unit), pa = pointAngle == null ? base : pointAngle;
  if (!(fin(S) && S > 0)) problems.push({ code: 'distance.bad' });
  if (!fin(pa) || (unit === 'deg' && !(pa > -90 && pa < 90))) problems.push({ code: 'point.range' });
  if (problems.length) return { status: 'invalid', problems, warnings: [] };
  const D = S * Math.cos(degOf(pa, unit) * RAD), r = heightTangent({ D, top, base, unit });
  return { ...r, method: 'slope-distance', S, pointAngle: pa };
}

/** Horizontal distance from a distance measured along the ground on a slope of the given angle (degrees or percent). */
export function horizontalDistance(S, slope, unit = 'deg') {
  if (!(fin(S) && S > 0) || !fin(slope) || (unit === 'deg' && !(slope > -90 && slope < 90))) return null;
  return S * Math.cos(degOf(slope, unit) * RAD);
}

/** Shadow method (Graves §65): H = tree shadow × pole length / pole shadow (same sun, level ground). */
export function heightShadow({ treeShadow, pole, poleShadow }) {
  const ok = [treeShadow, pole, poleShadow].every(v => fin(v) && v > 0);
  return ok ? { status: 'ok', method: 'shadow', H: treeShadow * pole / poleShadow, problems: [], warnings: [] } : { status: 'invalid', problems: [{ code: 'shadow.bad' }], warnings: [] };
}
/**
 * Two-pole method (Graves §65, Fig. 15): bc = distance between the two sight marks on the second pole, AC = distance
 * from the sighting point to the base of the tree, Ac = distance from the sighting point to the lower mark; H = bc·AC/Ac.
 */
export function heightTwoPoles({ bc, AC, Ac }) {
  const ok = [bc, AC, Ac].every(v => fin(v) && v > 0) && AC > Ac;
  return ok ? { status: 'ok', method: 'two-poles', H: bc * AC / Ac, problems: [], warnings: [] } : { status: 'invalid', problems: [{ code: 'poles.bad' }], warnings: [] };
}

/** Mean of repeated readings (Hamilton §7: two or three readings, averaged) with their spread. */
export function meanReading(values) {
  const v = (values || []).filter(fin);
  if (!v.length) return null;
  const m = v.reduce((s, x) => s + x, 0) / v.length;
  return { n: v.length, mean: m, min: Math.min(...v), max: Math.max(...v), range: Math.max(...v) - Math.min(...v) };
}
