// Unconstrained minimisation (no DOM). Nelder–Mead with the standard coefficients (reflection 1, expansion 2,
// contraction ½, shrink ½) and restarts from the best point until a restart no longer improves the objective.
// Constraints are the caller's business (transform the parameters, return +Infinity outside the domain).
/** f: R^k → R. Returns { x, f, iter, restarts, status: 'ok' | 'maxiter' | 'nonfinite' }. */
export function nelderMead(f, x0, { step = 0.1, ftol = 1e-13, xtol = 1e-12, maxIter = 20000, restarts = 8 } = {}) {
  const k = x0.length; let best = x0.slice(), fb = f(best), iter = 0, runs = 0;
  if (!Number.isFinite(fb)) return { x: best, f: fb, iter: 0, restarts: 0, status: 'nonfinite' };
  for (; runs <= restarts; runs++) {
    const S = [best.slice()], F = [fb];
    for (let i = 0; i < k; i++) { const p = best.slice(); p[i] += step * Math.max(1, Math.abs(p[i])) * (runs ? 0.5 ** runs : 1); S.push(p); F.push(f(p)); }
    let local = 0;
    while (iter < maxIter) {
      const o = [...S.keys()].sort((a, b) => (F[a] - F[b]) || 0), Ss = o.map(i => S[i]), Fs = o.map(i => F[i]);
      S.splice(0, S.length, ...Ss); F.splice(0, F.length, ...Fs);
      const spreadF = Math.abs(F[k] - F[0]), spreadX = Math.max(...S.slice(1).map(p => Math.max(...p.map((v, i) => Math.abs(v - S[0][i]) / Math.max(1, Math.abs(S[0][i]))))));
      if ((spreadF <= ftol * Math.max(1, Math.abs(F[0])) && spreadX <= xtol) || !Number.isFinite(F[0])) break;
      iter++; local++;
      const c = Array(k).fill(0); for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) c[j] += S[i][j] / k;
      const at = t => c.map((v, j) => v + t * (S[k][j] - v));
      const xr = at(-1), fr = f(xr);
      if (fr < F[0]) { const xe = at(-2), fe = f(xe); if (fe < fr) { S[k] = xe; F[k] = fe; } else { S[k] = xr; F[k] = fr; } }
      else if (fr < F[k - 1]) { S[k] = xr; F[k] = fr; }
      else {
        const xc = fr < F[k] ? at(-0.5) : at(0.5), fc = f(xc);
        if (fc < Math.min(fr, F[k])) { S[k] = xc; F[k] = fc; }
        else for (let i = 1; i <= k; i++) { S[i] = S[i].map((v, j) => S[0][j] + 0.5 * (v - S[0][j])); F[i] = f(S[i]); }
      }
    }
    const i0 = F.indexOf(Math.min(...F)), improved = fb - F[i0] > ftol * Math.max(1, Math.abs(fb));
    if (F[i0] <= fb) { best = S[i0].slice(); fb = F[i0]; }
    if (iter >= maxIter) return { x: best, f: fb, iter, restarts: runs, status: 'maxiter' };
    if (runs > 0 && !improved) break;                                  // a restart that brings nothing: converged
  }
  return { x: best, f: fb, iter, restarts: runs, status: Number.isFinite(fb) ? 'ok' : 'nonfinite' };
}
