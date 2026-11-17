// Log scaling (PLATFORM_PLAN SV-05): board-foot log rules and cubic log volume. No DOM. METHODS §25.
// Source [B]: Kershaw, J.A., Ducey, M.J., Beers, T.W., Husch, B. 2016. Forest Mensuration, 5th ed., Wiley:
//   §7.3 (p. 186–191): V in board feet of 1-in. lumber from the small-end diameter inside bark D (in.) and the log
//   length L (ft): Scribner (Bruce and Schumacher 1950 regression of the original table) V = (0.79D² − 2D − 4)·L/16
//   (7.3); Doyle V = ((D − 4)/4)²·L (7.5); International ⅛-in. kerf (Clark 1906) V = 0.44D² − 1.20D − 0.30 (8 ft),
//   0.66D² − 1.47D − 0.79 (12 ft), 0.88D² − 1.52D − 1.36 (16 ft), 1.10D² − 1.35D − 1.90 (20 ft) (7.7–7.10), longer
//   logs scaled as two or more logs; International ¼-in. kerf for any length (Grosenbaugh 1952a, least squares):
//   V = 0.0497621LD² + 0.006220L²D − 0.185476LD + 0.000259L³ − 0.011592L² + 0.042222L. Clark's tables round to the
//   nearest 5 board feet (optional here).
//   §7.4.1 (p. 195): diameter inside bark at the small end to the nearest inch; logs longer than the maximum scaling length
//   are scaled as two or more logs, the butt section taking the longer length when the log does not divide evenly; the
//   scaling diameter at the point of separation is estimated from the taper of the log (here: linear between the small-
//   and large-end diameters, a tool rule). Trim allowance is not part of the scaling length.
//   Table 6.1 (p. 141): Smalian V = L/2·(Ab + Au) (6.5), Huber V = Am·L (6.6), Newton V = L/6·(Ab + 4Am + Au) (6.9).
// The site is metric (P5): diameters are entered in cm and lengths in m; they are converted to inches and feet
// (1 in. = 2.54 cm, 1 ft = 0.3048 m, exact) for the board-foot rules, whose result is in board feet (labelled so,
// a user decision of 17 Nov 2026); the cubic volume is in m³ from the unconverted metric measurements.
export const TOOL = { id: 'tomruk-olcumu', version: '1.0.0-beta.1' };
export const CM_PER_IN = 2.54, M_PER_FT = 0.3048;
export const RULES = ['scribner', 'doyle', 'intl8', 'intl4'];
const fin = x => typeof x === 'number' && Number.isFinite(x);
const INTL8 = { 8: [0.44, 1.20, 0.30], 12: [0.66, 1.47, 0.79], 16: [0.88, 1.52, 1.36], 20: [1.10, 1.35, 1.90] };

/** Board feet of one log by a rule (D in inches, L in feet, as measured for scaling). → { V } | { V: null, code } */
export function boardFeet(rule, D, L) {
  if (!(fin(D) && D > 0) || !(fin(L) && L > 0)) return { V: null, code: 'input' };
  let V;
  if (rule === 'scribner') V = (0.79 * D * D - 2 * D - 4) * L / 16;
  else if (rule === 'doyle') { if (D <= 4) return { V: null, code: 'doyle.small' }; V = ((D - 4) / 4) ** 2 * L; }
  else if (rule === 'intl8') { const c = INTL8[L]; if (!c) return { V: null, code: 'intl8.length' }; V = c[0] * D * D - c[1] * D - c[2]; }
  else if (rule === 'intl4') V = 0.0497621 * L * D * D + 0.006220 * L * L * D - 0.185476 * L * D + 0.000259 * L ** 3 - 0.011592 * L * L + 0.042222 * L;
  else return { V: null, code: 'rule' };
  if (!(V > 0)) return { V: null, code: 'nonpositive' };
  return { V };
}
/** Cubic volume (m³) from diameters in cm and the length in m: Newton with all three, else Smalian (ends) or Huber (middle). */
export function cubic({ ds, db = null, dm = null, Lm }) {
  const A = d => Math.PI / 4 * (d / 100) ** 2, ok = d => fin(d) && d > 0;
  const out = { smalian: null, huber: null, newton: null };
  if (!ok(ds) || !(fin(Lm) && Lm > 0)) return out;
  if (ok(db)) out.smalian = Lm / 2 * (A(db) + A(ds));
  if (ok(dm)) out.huber = A(dm) * Lm;
  if (ok(db) && ok(dm)) out.newton = Lm / 6 * (A(db) + 4 * A(dm) + A(ds));
  return out;
}

/**
 * Scaling segments of one log (§7.4.1). log = { ds (cm, small end inside bark), db (cm, large end) | null, Lm (m) };
 * opts = { roundD: true (nearest inch), lengthRule: 'whole' | 'even' | 'none' (feet, rounded down), maxFt: number | null }.
 * The scaling length is in whole (or even) feet rounded down; a log longer than maxFt is split into k = ⌈L/maxFt⌉
 * segments of whole feet, as equal as possible, the longer ones at the butt; the small-end diameter of every segment
 * below the top one is interpolated linearly between ds and db at its upper end (needs db).
 * → { status: 'ok', Lft, segments: [{ from (ft above the butt), L (ft), Dcm, Din }] } | { status: 'bad', code }
 */
export function segments(log, opts = {}) {
  const { roundD = true, lengthRule = 'whole', maxFt = null } = opts, ok = d => fin(d) && d > 0;
  if (!ok(log.ds) || !(fin(log.Lm) && log.Lm > 0)) return { status: 'bad', code: 'input' };
  if (log.db != null && !(ok(log.db) && log.db >= log.ds)) return { status: 'bad', code: 'db' };
  const ft = log.Lm / M_PER_FT + 1e-9;
  const Lft = lengthRule === 'even' ? 2 * Math.floor(ft / 2) : lengthRule === 'whole' ? Math.floor(ft) : log.Lm / M_PER_FT;
  if (!(Lft > 0)) return { status: 'bad', code: 'short' };
  if (maxFt != null && !(fin(maxFt) && maxFt > 0)) return { status: 'bad', code: 'max' };
  const k = maxFt ? Math.ceil(Lft / maxFt - 1e-9) : 1;
  if (k > 1 && !ok(log.db)) return { status: 'bad', code: 'split.db' };
  const lens = [];
  if (k === 1) lens.push(Lft);
  else { const whole = lengthRule === 'none' ? null : Math.floor(Lft / k); if (whole == null) for (let i = 0; i < k; i++) lens.push(Lft / k); else { const extra = Lft - whole * k; for (let i = 0; i < k; i++) lens.push(whole + (i < extra ? 1 : 0)); } }
  const segs = []; let from = 0;
  for (const L of lens) {
    const top = from + L, Dcm = k === 1 || Math.abs(top - Lft) < 1e-9 ? log.ds : log.ds + (log.db - log.ds) * (Lft - top) / Lft;
    const Din = roundD ? Math.round(Dcm / CM_PER_IN) : Dcm / CM_PER_IN;
    segs.push({ from, L, Dcm, Din }); from = top;
  }
  return { status: 'ok', Lft, segments: segs };
}

/**
 * One log: scaling segments, board feet by each chosen rule (sum over segments; optional rounding to the nearest
 * 5 board feet for the International rules, per segment, as in Clark's tables), and the cubic volume (m³).
 * → { status, Lft, segments, bf: { rule: { V, segs: [V], code } }, cubic }
 */
export function scaleLog(log, rules, opts = {}) {
  const sg = segments(log, opts);
  const cub = cubic({ ds: log.ds, db: log.db, dm: log.dm, Lm: log.Lm });
  if (sg.status !== 'ok') return { status: 'bad', code: sg.code, cubic: cub };
  const bf = {};
  for (const r of rules) {
    const vals = sg.segments.map(s => boardFeet(r, s.Din, s.L)), bad = vals.find(v => v.V == null);
    const round5 = opts.round5 && (r === 'intl8' || r === 'intl4');
    const segV = vals.map(v => v.V == null ? null : round5 ? 5 * Math.round(v.V / 5) : v.V);
    bf[r] = bad ? { V: null, segs: segV, code: bad.code } : { V: segV.reduce((a, b) => a + b, 0), segs: segV, code: null };
  }
  return { status: 'ok', Lft: sg.Lft, segments: sg.segments, bf, cubic: cub };
}
