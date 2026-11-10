// Data contract of the diameter distribution tool: analysis units from a raw table. No DOM.
// A unit is one plot in one period (repeated measurements of a plot never merge), or all plots of a period pooled.
// d: diameters in cm, n = number of trees actually observed (never an expanded per-hectare count).
import { parseNumber, UNITS } from '../core/num.js';
import { cellText } from '../core/table.js';

export const POOL = '\u0000pool';
const isNum = v => /^-?\d+(\.\d+)?$/.test(v);
export const natural = (a, b) => isNum(a) && isNum(b) ? (+a - +b || (a < b ? -1 : a > b ? 1 : 0)) : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) || (a < b ? -1 : a > b ? 1 : 0);
const perSort = (a, b) => a == null ? (b == null ? 0 : 1) : b == null ? -1 : natural(a, b);

/**
 * tbl: raw table from core/table.js ({ headers, rows: [[cell]], rowNumbers }).
 * spec: { dcol (required), unit: 'cm'|'mm', decimal: '.'|',', pcol?, percol?, fcol?, fval?, mode: 'each'|'pool' }
 * Returns { units: [{ id, plot, period, d, rows }], plots, periods, acc: { read, bad, nonpos, filtered, badRows } }.
 * Unreadable and non-positive diameters are counted and listed by source row; they are never altered or guessed.
 */
export function extractUnits(tbl, spec) {
  const acc = { read: 0, bad: 0, nonpos: 0, filtered: 0, badRows: [] }, map = new Map(), plots = new Set(), periods = new Set();
  const pool = spec.mode === 'pool' || spec.pcol == null;
  tbl.rows.forEach((r, i) => {
    if (spec.fcol != null && spec.fval != null && cellText(r[spec.fcol]) !== spec.fval) { acc.filtered++; return; }
    const c = r[spec.dcol], v = c == null ? { status: 'empty' } : c.t === 'n' ? parseNumber(c.v, spec.decimal) : parseNumber(cellText(c), spec.decimal);
    if (v.status !== 'ok') { acc.bad++; if (acc.badRows.length < 20) acc.badRows.push(tbl.rowNumbers[i]); return; }
    const d = v.value * UNITS.dbh[spec.unit || 'cm'];
    if (!(d > 0)) { acc.nonpos++; if (acc.badRows.length < 20) acc.badRows.push(tbl.rowNumbers[i]); return; }
    const plot = pool ? POOL : cellText(r[spec.pcol]).trim(), period = spec.percol != null ? (cellText(r[spec.percol]).trim() || null) : null;
    const key = plot + '\u0001' + (period ?? '\u0002');
    if (!map.has(key)) map.set(key, { id: key, plot, period, d: [], rows: [] });
    const u = map.get(key); u.d.push(d); u.rows.push(tbl.rowNumbers[i]); acc.read++;
    plots.add(plot); periods.add(period);
  });
  const units = [...map.values()].sort((a, b) => (a.plot === b.plot ? 0 : a.plot === POOL ? -1 : b.plot === POOL ? 1 : natural(a.plot, b.plot)) || perSort(a.period, b.period));
  return { units, plots: [...plots].sort((a, b) => a === POOL ? -1 : b === POOL ? 1 : natural(a, b)), periods: [...periods].sort(perSort), acc, pooled: pool };
}
/** Descriptive summary of one unit. Moment variance v uses divisor n; the n − 1 version is given separately. */
export function describe(d) {
  const n = d.length; if (!n) return { n: 0 };
  let s = 0, s2 = 0, mn = Infinity, mx = -Infinity; for (const v of d) { s += v; s2 += v * v; if (v < mn) mn = v; if (v > mx) mx = v; }
  const mean = s / n; let ss = 0; for (const v of d) ss += (v - mean) ** 2;
  return { n, unique: new Set(d).size, min: mn, max: mx, mean, m2: s2 / n, dq: Math.sqrt(s2 / n), varN: ss / n, varN1: n > 1 ? ss / (n - 1) : null };
}
