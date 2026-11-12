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

/**
 * Geometric bisection for a function that is monotone on [lo, hi] with lo > 0 (e.g. a Weibull shape spanning several
 * decades). Same algorithm and stopping rule as the published Weibull tool (legacy/weibull/calc.js solveMonotone),
 * so results are reproduced exactly. Returns { root, status: 'ok' | 'below' (root < lo) | 'above' (root > hi) |
 * 'nonfinite' | 'maxiter', iter }. Stops when hi/lo − 1 < rtol.
 */
export function bisectMonotone(f, lo, hi, { maxIter = 300, rtol = 1e-14 } = {}) {
  const flo = f(lo), fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi)) return { root: null, status: 'nonfinite', iter: 0 };
  const inc = fhi > flo;
  if (inc ? flo > 0 : flo < 0) return { root: lo, status: 'below', iter: 0 };
  if (inc ? fhi < 0 : fhi > 0) return { root: hi, status: 'above', iter: 0 };
  for (let i = 1; i <= maxIter; i++) {
    const mid = Math.sqrt(lo * hi), fm = f(mid);
    if (!Number.isFinite(fm)) return { root: null, status: 'nonfinite', iter: i };
    if (fm === 0) return { root: mid, status: 'ok', iter: i };
    if ((fm > 0) === inc) hi = mid; else lo = mid;
    if (hi / lo - 1 < rtol) return { root: Math.sqrt(lo * hi), status: 'ok', iter: i };
  }
  return { root: Math.sqrt(lo * hi), status: 'maxiter', iter: maxIter };
}

/**
 * Every root of f on [lo, hi]: sign changes on a grid of k + 1 points ('geometric' needs lo > 0, 'linear' any lo < hi),
 * each refined with Brent (xtol 1e-15); exact zeros on the grid are kept; roots within 1e-9 (relative to the previous one) merged.
 * A double root that does not change sign, or two roots inside one grid interval, can be missed (known limitation;
 * callers report the grid). Returns { roots, iter }. Moved here from dist/recover/weibull.js (behaviour unchanged).
 */
export function scanRoots(f, lo, hi, k = 600, { grid = 'geometric' } = {}) {
  const fin = x => typeof x === 'number' && Number.isFinite(x);
  const xs = Array.from({ length: k + 1 }, (_, i) => grid === 'linear' ? lo + (hi - lo) * i / k : lo * (hi / lo) ** (i / k)), ys = xs.map(f), roots = []; let iter = 0;
  for (let i = 0; i < k; i++) {
    if (ys[i] === 0) { roots.push(xs[i]); continue; }
    if (fin(ys[i]) && fin(ys[i + 1]) && ys[i] * ys[i + 1] < 0) { const r = brent(f, xs[i], xs[i + 1], { xtol: 1e-15 }); iter += r.iter; if (r.status === 'ok') roots.push(r.root); }
  }
  if (ys[k] === 0) roots.push(xs[k]);
  const out = [];
  for (const r of roots) { const p = out[out.length - 1]; if (!out.length || !(Math.abs(r - p) <= 1e-9 * Math.abs(p))) out.push(r); }
  return { roots: out, iter };
}
