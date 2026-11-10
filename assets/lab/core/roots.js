// Root finding with an explicit status (no DOM). Brent's method on a bracketing interval.
/**
 * f continuous on [a, b] with f(a)·f(b) ≤ 0.
 * Returns { root, status: 'ok' | 'nobracket' | 'nonfinite' | 'maxiter', iter, fa, fb }.
 * xtol is absolute; the relative term 4·ε·|x| is always added (Brent 1973; same stopping rule as SciPy's brentq).
 */
export function brent(f, a, b, { xtol = 1e-14, maxIter = 200 } = {}) {
  let fa = f(a), fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return { root: null, status: 'nonfinite', iter: 0, fa, fb };
  if (fa === 0) return { root: a, status: 'ok', iter: 0, fa, fb };
  if (fb === 0) return { root: b, status: 'ok', iter: 0, fa, fb };
  if (fa * fb > 0) return { root: null, status: 'nobracket', iter: 0, fa, fb };
  let c = a, fc = fa, d = b - a, e = d;
  for (let i = 1; i <= maxIter; i++) {
    if (Math.abs(fc) < Math.abs(fb)) { a = b; b = c; c = a; fa = fb; fb = fc; fc = fa; }
    const tol = 2 * Number.EPSILON * Math.abs(b) + xtol / 2, m = (c - b) / 2;
    if (Math.abs(m) <= tol || fb === 0) return { root: b, status: 'ok', iter: i, fa, fb };
    if (Math.abs(e) >= tol && Math.abs(fa) > Math.abs(fb)) {
      let p, q; const s = fb / fa;
      if (a === c) { p = 2 * m * s; q = 1 - s; }                                   // secant
      else { const r0 = fa / fc, r = fb / fc; p = s * (2 * m * r0 * (r0 - r) - (b - a) * (r - 1)); q = (r0 - 1) * (r - 1) * (s - 1); }   // inverse quadratic
      if (p > 0) q = -q; else p = -p;
      if (2 * p < Math.min(3 * m * q - Math.abs(tol * q), Math.abs(e * q))) { e = d; d = p / q; } else { d = m; e = m; }
    } else { d = m; e = m; }
    a = b; fa = fb;
    b += Math.abs(d) > tol ? d : (m > 0 ? tol : -tol);
    fb = f(b);
    if (!Number.isFinite(fb)) return { root: null, status: 'nonfinite', iter: i, fa, fb };
    if ((fb > 0) === (fc > 0)) { c = a; fc = fa; d = e = b - a; }
  }
  return { root: b, status: 'maxiter', iter: maxIter, fa, fb };
}
