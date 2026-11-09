// Inventory Sampling Planner, first version: pure logic (no DOM). Definitions and sources: docs/METHODS.md §11.
// Scope: number of plots for estimating a MEAN under SIMPLE RANDOM SAMPLING with a target RELATIVE error,
// z (normal) approximation. Not a power analysis for a hypothesis test; not a solution for stratified, systematic or
// cluster designs.
//   n0 = z² · (CV / E)²           CV and E both in percent
//   n  = n0 / [1 + (n0 − 1)/M]     only when the user states that a finite frame of M units exists
//   reported sizes are rounded up.
import { normQuantile } from '../core/stats.js';
import { readNum } from '../eval/calc.js';
import { cellText } from '../core/table.js';

export const TOOL = { id: 'ornekleme-planlayici', version: '1.0.0' };
export const LEVELS = [80, 90, 95, 99];
export const E_GRID = [2.5, 5, 7.5, 10, 12.5, 15, 20, 25, 30];
export const PILOT_FEW = 10;                 // "small pilot" warning threshold (tool rule, not literature)
/** Names that suggest a tree-level measurement rather than a plot-level value (warning only). */
const TREE_LEVEL = ['dbh', 'dbh_cm', 'd', 'd13', 'cap', 'çap', 'cap_cm', 'çap_cm', 'h', 'height', 'height_m', 'boy', 'boy_m', 'tree_id', 'agac_no', 'ağaç_no'];

/** Round up, ignoring floating-point noise just above an integer (34.0000000001 → 34). */
export const ceilN = x => Math.ceil(x - 1e-9 * Math.max(1, Math.abs(x)));

/** z for a two-sided confidence level in percent (e.g. 95 → 1.959964). */
export function zFor(level) { return level > 0 && level < 100 ? normQuantile(1 - (1 - level / 100) / 2) : NaN; }

/* ---------------- pilot data ---------------- */
/**
 * table: raw table. spec = { vcol, pcol?, fcol?, fval?, decimal }.
 * Every row is accounted for: empty, unreadable, negative (impossible for plot-level totals such as m³/ha, m²/ha, trees/ha)
 * and filtered rows are counted and left out; duplicated plot identifiers are reported (they mean tree-level rows or
 * several periods, and block the calculation).
 */
export function readPilot(table, spec) {
  const acc = { rows: table.rows.length, empty: 0, bad: 0, neg: 0, filter: 0 }, values = [], ids = [], negRows = [], badRows = [];
  table.rows.forEach((r, i) => {
    if (spec.fcol != null && spec.fval != null && cellText(r[spec.fcol]) !== spec.fval) { acc.filter++; return; }
    const v = readNum(r[spec.vcol], spec.decimal), rn = table.rowNumbers ? table.rowNumbers[i] : i + 2;
    if (v.status === 'empty') { acc.empty++; return; }
    if (v.status !== 'ok') { acc.bad++; badRows.push(rn); return; }
    if (v.value < 0) { acc.neg++; negRows.push(rn); return; }
    values.push(v.value); ids.push(spec.pcol != null ? cellText(r[spec.pcol]).trim() : null);
  });
  const count = new Map(); if (spec.pcol != null) for (const id of ids) count.set(id, (count.get(id) || 0) + 1);
  const dups = [...count.entries()].filter(([, c]) => c > 1).map(([id, c]) => ({ id, c }));
  const name = (table.headers[spec.vcol] || '').toLocaleLowerCase('tr').trim();
  return { values, ids, acc, negRows, badRows, dups, treeLevelName: TREE_LEVEL.includes(name) };
}
/** Pilot mean, standard deviation (n − 1) and CV in percent. The CV (and so a relative error) is undefined when the mean ≤ 0. */
export function pilotStats(values) {
  const n = values.length, out = { n, mean: null, sd: null, cv: null, min: null, max: null, problem: null };
  if (!n) return { ...out, problem: 'n.zero' };
  const mean = values.reduce((a, v) => a + v, 0) / n;
  Object.assign(out, { mean, min: Math.min(...values), max: Math.max(...values) });
  if (n < 2) return { ...out, problem: 'n.few' };
  out.sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1));
  if (!(mean > 0)) return { ...out, problem: 'mean.nonpos' };
  if (!(out.sd > 0)) return { ...out, cv: 0, problem: 'sd.zero' };
  out.cv = out.sd / mean * 100;
  return out;
}

/* ---------------- plan ---------------- */
/**
 * p = { cv (%), e (%), level (%), fpc: bool, M?: number, nPilot?: number, pilotInDesign?: bool }
 * Returns problems (no numbers) when an input is missing or invalid.
 */
export function check(p) {
  const pr = [];
  if (!(Number.isFinite(p.cv))) pr.push('cv.missing'); else if (!(p.cv > 0)) pr.push('cv.nonpos');
  if (!(Number.isFinite(p.e))) pr.push('e.missing'); else if (!(p.e > 0 && p.e < 100)) pr.push('e.range');
  if (!(p.level > 50 && p.level < 100)) pr.push('level.range');
  if (p.fpc) {
    if (!Number.isFinite(p.M)) pr.push('M.missing');
    else if (!(Number.isInteger(p.M) && p.M >= 2)) pr.push('M.int');
    else if (p.pilotInDesign && p.nPilot > p.M) pr.push('M.pilot');
  }
  if (p.pilotInDesign && !(Number.isInteger(p.nPilot) && p.nPilot >= 0)) pr.push('npilot.bad');
  return pr;
}
export const n0Raw = (z, cv, e) => z * z * (cv / e) ** 2;
export const fpcRaw = (n0, M) => n0 / (1 + (n0 - 1) / M);
export function plan(p) {
  const problems = check(p); if (problems.length) return { problems };
  const z = zFor(p.level), n0r = n0Raw(z, p.cv, p.e), n0 = ceilN(n0r);
  const nr = p.fpc ? fpcRaw(n0r, p.M) : n0r, n = ceilN(nr);
  const out = { problems: [], z, n0Raw: n0r, n0, nRaw: nr, n, fpc: !!p.fpc, M: p.fpc ? p.M : null, notes: [] };
  if (p.pilotInDesign) out.additional = Math.max(0, n - p.nPilot);
  if (n < 2) out.notes.push('n.below2');
  if (p.fpc && n0r > 0.05 * p.M) out.notes.push('fpc.matters');
  if (p.fpc && n > p.M) out.notes.push('n.gtM');
  return out;
}
/** Plan for each error target (same CV, level and frame). The user's own E is added to the grid. */
export function grid(p, extra = []) {
  const es = [...new Set([...E_GRID, ...extra].filter(e => e > 0 && e < 100))].sort((a, b) => a - b);
  return es.map(e => ({ e, ...plan({ ...p, e }) }));
}
