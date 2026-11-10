// Numerical integration (no DOM). Gauss–Legendre nodes are computed once by Newton's method on the Legendre
// polynomials (Golub–Welsch is not needed for small n); expectations under the standard normal use composite
// Gauss–Legendre on [−ZMAX, ZMAX] with extra breakpoints where the integrand changes quickly.
const GL = new Map();
/** n-point Gauss–Legendre nodes and weights on [−1, 1]. */
export function gaussLegendre(n) {
  if (GL.has(n)) return GL.get(n);
  const x = new Array(n), w = new Array(n);
  for (let i = 0; i < Math.ceil(n / 2); i++) {
    let z = Math.cos(Math.PI * (i + 0.75) / (n + 0.5)), pp = 0;
    for (let it = 0; it < 100; it++) {
      let p1 = 1, p2 = 0;
      for (let j = 1; j <= n; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j; }
      pp = n * (z * p1 - p2) / (z * z - 1);
      const dz = p1 / pp; z -= dz; if (Math.abs(dz) < 1e-16) break;
    }
    x[i] = -z; x[n - 1 - i] = z; w[i] = w[n - 1 - i] = 2 / ((1 - z * z) * pp * pp);
  }
  const r = { x, w }; GL.set(n, r); return r;
}
export const ZMAX = 10;                       // P(|Z| > 10) ≈ 1.5e-23: below double precision of any moment
const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);
/**
 * E[g(Z)] for Z ~ N(0, 1), g returning an array of values (several moments in one pass).
 * Panels: a uniform grid of width `step` on [−ZMAX, ZMAX] plus the given breakpoints; `nodes` points per panel.
 */
export function normalExpect(g, k, { breaks = [], step = 0.5, nodes = 10 } = {}) {
  const pts = new Set();
  for (let z = -ZMAX; z <= ZMAX + 1e-12; z += step) pts.add(+z.toFixed(12));
  for (const b of breaks) if (b > -ZMAX && b < ZMAX) pts.add(b);
  const P = [...pts].sort((a, b) => a - b), { x, w } = gaussLegendre(nodes), sum = new Array(k).fill(0);
  for (let i = 0; i + 1 < P.length; i++) {
    const a = P[i], b = P[i + 1], h = (b - a) / 2, c = (a + b) / 2; if (!(h > 0)) continue;
    for (let j = 0; j < nodes; j++) {
      const z = c + h * x[j], wt = w[j] * h * INV_SQRT_2PI * Math.exp(-0.5 * z * z), v = g(z);
      for (let q = 0; q < k; q++) sum[q] += wt * v[q];
    }
  }
  return sum;
}
