// Relative rank of Poudel and Cao (2013, Eq. 10), generalised by criterion direction (docs/METHODS.md §9), and the
// competition ranking. Shared by Relative Ranking (rank/calc.js, which re-exports both) and Model Evaluation's rank
// bootstrap (eval/calc.js); moved here unchanged on 21 Nov 2026 so that the two tools do not import each other.
/** S: values; dir: 'max' | 'min' | 'abs'. Returns { R, best, worst, constant }. m = S.length. */
export function relativeRanks(S, dir) {
  const v = dir === 'abs' ? S.map(Math.abs) : S, m = v.length;
  let lo = Infinity, hi = -Infinity; for (const x of v) { if (x < lo) lo = x; if (x > hi) hi = x; }
  const best = dir === 'max' ? hi : lo, worst = dir === 'max' ? lo : hi;
  if (hi === lo) return { R: v.map(() => 1), best, worst, constant: true };   // every model equal on this criterion
  return { R: v.map(x => 1 + (m - 1) * (x - best) / (worst - best)), best, worst, constant: false };
}
/** Competition ranking (1, 2, 2, 4) of ascending values; ties within 1e-12 relative. */
export function ordinal(v) {
  const idx = v.map((x, i) => i).sort((a, b) => v[a] - v[b]), out = new Array(v.length);
  idx.forEach((i, k) => { out[i] = k > 0 && Math.abs(v[i] - v[idx[k - 1]]) <= 1e-12 * Math.max(1, Math.abs(v[i])) ? out[idx[k - 1]] : k + 1; });
  return out;
}
