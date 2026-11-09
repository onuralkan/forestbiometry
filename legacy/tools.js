/* Meşcere Postası: shared maths, parsing and black-and-white SVG charts for the supplements. */
(function (G) {
  'use strict';
  const T = {};

  /* ---------- formatting ---------- */
  T.lang = document.documentElement.lang === 'tr' ? 'tr' : 'en';
  T.fmt = (x, d = 1) => (x == null || !isFinite(x)) ? '–'
    : x.toLocaleString(T.lang === 'tr' ? 'tr-TR' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });

  /* ---------- parsing pasted tables ----------
     Accepts Excel paste (tabs), "23,5 18,2" (Turkish decimals), "23.5;18.2", "23.5,18.2" (CSV).
     Returns arrays of numbers per line; header / text lines are skipped. */
  T.parseRows = function (text) {
    const rows = [];
    for (let line of String(text).split(/\r?\n/)) {
      line = line.trim();
      if (!line) continue;
      let parts;
      if (/[\t;]|\s/.test(line)) parts = line.split(/[\t;]+|\s+/).map(s => s.replace(',', '.'));
      else if (line.includes(',') && line.includes('.')) parts = line.split(',');
      else if ((line.match(/,/g) || []).length === 1) parts = [line.replace(',', '.')];
      else parts = line.split(',');
      const nums = parts.filter(s => s !== '').map(Number);
      if (!nums.length || nums.some(n => !isFinite(n))) continue;
      rows.push(nums);
    }
    return rows;
  };

  /* ---------- statistics ---------- */
  T.sum = a => a.reduce((s, v) => s + v, 0);
  T.mean = a => T.sum(a) / a.length;
  T.sd = (a, pop = false) => { const m = T.mean(a); return Math.sqrt(T.sum(a.map(v => (v - m) ** 2)) / (a.length - (pop ? 0 : 1))); };
  T.quantile = (sorted, p) => {          // type 7 (R default, Excel PERCENTILE.INC)
    const h = (sorted.length - 1) * p, lo = Math.floor(h);
    return sorted[lo] + (h - lo) * ((sorted[lo + 1] ?? sorted[lo]) - sorted[lo]);
  };

  /* ---------- gamma function (Lanczos, g = 7) ---------- */
  const LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
              12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  T.lnGamma = function lnGamma(z) {
    if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lnGamma(1 - z);
    z -= 1; let x = LZ[0];
    for (let i = 1; i < 9; i++) x += LZ[i] / (z + i);
    const t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  };
  T.gamma = z => Math.exp(T.lnGamma(z));

  /* ---------- Weibull(α shape, β scale, γ location) ---------- */
  const W = T.weibull = {};
  W.pdf = (x, a, b, g = 0) => { if (x <= g) return 0; const z = (x - g) / b; return (a / b) * z ** (a - 1) * Math.exp(-(z ** a)); };
  W.cdf = (x, a, b, g = 0) => x <= g ? 0 : 1 - Math.exp(-(((x - g) / b) ** a));
  W.quantile = (p, a, b, g = 0) => g + b * (-Math.log(1 - p)) ** (1 / a);
  W.sample = (rng, a, b, g = 0) => W.quantile(rng(), a, b, g);
  W.moments = (a, b, g = 0) => {
    const g1 = T.gamma(1 + 1 / a), g2 = T.gamma(1 + 2 / a), g3 = T.gamma(1 + 3 / a);
    const mean = g + b * g1, v = b * b * (g2 - g1 * g1), sd = Math.sqrt(v);
    const skew = (g3 - 3 * g1 * g2 + 2 * g1 ** 3) / (g2 - g1 * g1) ** 1.5;
    const mode = a > 1 ? g + b * ((a - 1) / a) ** (1 / a) : g;
    const dq = Math.sqrt(b * b * g2 + 2 * g * b * g1 + g * g);      // quadratic mean (Burk & Newberry)
    return { mean, sd, skew, mode, median: W.quantile(0.5, a, b, g), dq };
  };

  function bisect(f, lo, hi, it = 200) {
    let flo = f(lo);
    for (let i = 0; i < it; i++) {
      const mid = (lo + hi) / 2, fm = f(mid);
      if (!isFinite(fm)) { hi = mid; continue; }
      if ((fm > 0) === (flo > 0)) { lo = mid; flo = fm; } else hi = mid;
      if (hi - lo < 1e-10) break;
    }
    return (lo + hi) / 2;
  }

  /* Method of moments, γ fixed: solve CV² = Γ(1+2/α)/Γ²(1+1/α) − 1 */
  W.fitMoments = function (d, g) {
    const x = d.map(v => v - g), m = T.mean(x), cv2 = (T.sd(x, true) / m) ** 2;
    const a = bisect(al => Math.exp(T.lnGamma(1 + 2 / al) - 2 * T.lnGamma(1 + 1 / al)) - 1 - cv2, 0.05, 60);
    return { a, b: m / T.gamma(1 + 1 / a), g };
  };

  /* Maximum likelihood, γ fixed: Σxᵅ ln x / Σxᵅ − 1/α − mean(ln x) = 0 */
  W.fitMLE = function (d, g) {
    const x = d.map(v => v - g), mx = Math.max(...x), lx = x.map(Math.log), y = x.map(v => v / mx), mlx = T.mean(lx);
    const f = a => { let s = 0, sl = 0; for (let i = 0; i < y.length; i++) { const p = y[i] ** a; s += p; sl += p * lx[i]; } return sl / s - 1 / a - mlx; };
    const a = bisect(f, 0.05, 60);
    return { a, b: mx * T.mean(y.map(v => v ** a)) ** (1 / a), g };
  };

  /* Percentile estimator with percentile pair (p1, p2), γ fixed */
  W.fitPercentile = function (d, g, p1 = 0.24, p2 = 0.93) {
    const s = [...d].sort((u, v) => u - v), x1 = T.quantile(s, p1) - g, x2 = T.quantile(s, p2) - g;
    const a = Math.log(Math.log(1 - p1) / Math.log(1 - p2)) / Math.log(x1 / x2);
    return { a, b: x2 / (-Math.log(1 - p2)) ** (1 / a), g };
  };

  /* Kolmogorov–Smirnov D */
  W.ks = function (d, a, b, g) {
    const s = [...d].sort((u, v) => u - v), n = s.length; let D = 0;
    s.forEach((v, i) => { const F = W.cdf(v, a, b, g); D = Math.max(D, Math.abs(F - (i + 1) / n), Math.abs(F - i / n)); });
    return D;
  };
  W.logLik = (d, a, b, g) => T.sum(d.map(v => Math.log(Math.max(W.pdf(v, a, b, g), 1e-300))));

  /* ---------- special functions ---------- */
  T.digamma = x => { let r = 0; while (x < 6) { r -= 1 / x; x += 1; } const f = 1 / (x * x);
    return r + Math.log(x) - 0.5 / x - f * (1 / 12 - f * (1 / 120 - f * (1 / 252 - f * (1 / 240 - f / 132)))); };
  /* regularized lower incomplete gamma P(a, x) (series / Lentz continued fraction) */
  T.gammaP = function (a, x) {
    if (x <= 0) return 0;
    const lead = -x + a * Math.log(x) - T.lnGamma(a);
    if (x < a + 1) {
      let ap = a, sum = 1 / a, del = sum;
      for (let n = 0; n < 1000; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; }
      return Math.min(1, sum * Math.exp(lead));
    }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (let i = 1; i < 1000; i++) {
      const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break;
    }
    return Math.max(0, 1 - Math.exp(lead) * h);
  };
  /* standard normal: Φ via the Numerical Recipes erfcc approximation (relative error < 1.2e-7), Φ⁻¹ by Acklam's algorithm (relative error < 1.15e-9) */
  T.erfc = x => { const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r; };
  T.Phi = z => 0.5 * T.erfc(-z / Math.SQRT2);
  T.PhiInv = function (p) {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00],
          b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01],
          c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00],
          d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00], pl = 0.02425;
    let x;
    if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p <= 1 - pl) { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    else { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    return x;
  };
  const SQ2PI = Math.sqrt(2 * Math.PI);

  /* ---------- the five diameter distributions ----------
     Each: params [{k, sym, name:[tr,en], min, max, step, def}], pdf(x,P), cdf(x,P), q(u,P), stats(P) */
  const D = T.dists = {};
  const nm = (tr, en) => T.lang === 'tr' ? tr : en;
  D.weibull = {
    name: 'Weibull', params: [
      { k: 'a', sym: 'α', name: nm('şekil', 'shape'), min: 0.5, max: 8, step: 0.05, def: 2.6 },
      { k: 'b', sym: 'β', name: nm('ölçek, cm', 'scale, cm'), min: 2, max: 40, step: 0.1, def: 16 },
      { k: 'g', sym: 'γ', name: nm('konum, cm', 'location, cm'), min: 0, max: 25, step: 0.1, def: 8 }],
    pdf: (x, P) => W.pdf(x, P.a, P.b, P.g), cdf: (x, P) => W.cdf(x, P.a, P.b, P.g), q: (u, P) => W.quantile(u, P.a, P.b, P.g),
    stats: P => { const m = W.moments(P.a, P.b, P.g); return { mean: m.mean, sd: m.sd, skew: m.skew, mode: m.mode }; },
  };
  D.gamma = {
    name: 'Gamma', params: [
      { k: 'k', sym: 'k', name: nm('şekil', 'shape'), min: 0.5, max: 30, step: 0.1, def: 4 },
      { k: 't', sym: 'θ', name: nm('ölçek, cm', 'scale, cm'), min: 0.3, max: 15, step: 0.05, def: 3.5 },
      { k: 'g', sym: 'γ', name: nm('konum, cm', 'location, cm'), min: 0, max: 25, step: 0.1, def: 6 }],
    pdf: (x, P) => { const z = (x - P.g) / P.t; return z <= 0 ? 0 : Math.exp((P.k - 1) * Math.log(z) - z - T.lnGamma(P.k)) / P.t; },
    cdf: (x, P) => T.gammaP(P.k, (x - P.g) / P.t),
    q: (u, P) => {   // Wilson–Hilferty start, then safeguarded Newton on P(k, z) = u
      const k = P.k; let z = Math.max(1e-6, k * (1 - 1 / (9 * k) + T.PhiInv(u) / (3 * Math.sqrt(k))) ** 3), lo = 0, hi = Infinity;
      for (let i = 0; i < 60; i++) {
        const F = T.gammaP(k, z) - u; if (F > 0) hi = Math.min(hi, z); else lo = Math.max(lo, z);
        if (Math.abs(F) < 1e-12) break;
        const f = Math.exp((k - 1) * Math.log(z) - z - T.lnGamma(k)); let nz = z - F / f;
        if (!(nz > lo && nz < hi)) nz = isFinite(hi) ? (lo + hi) / 2 : z * 2;
        if (Math.abs(nz - z) < 1e-12 * Math.max(1, z)) { z = nz; break; } z = nz;
      }
      return P.g + P.t * z;
    },
    stats: P => ({ mean: P.g + P.k * P.t, sd: Math.sqrt(P.k) * P.t, skew: 2 / Math.sqrt(P.k), mode: P.k >= 1 ? P.g + (P.k - 1) * P.t : P.g }),
  };
  D.normal = {
    name: nm('Normal', 'Normal'), params: [
      { k: 'm', sym: 'μ', name: nm('ortalama, cm', 'mean, cm'), min: 5, max: 60, step: 0.1, def: 22 },
      { k: 's', sym: 'σ', name: nm('standart sapma, cm', 'std. dev., cm'), min: 0.5, max: 20, step: 0.05, def: 6 }],
    pdf: (x, P) => Math.exp(-0.5 * ((x - P.m) / P.s) ** 2) / (P.s * SQ2PI), cdf: (x, P) => T.Phi((x - P.m) / P.s), q: (u, P) => P.m + P.s * T.PhiInv(u),
    stats: P => ({ mean: P.m, sd: P.s, skew: 0, mode: P.m }),
  };
  D.lognormal = {
    name: 'Lognormal', params: [
      { k: 'm', sym: 'μ', name: nm('ln(x−γ) ortalaması', 'mean of ln(x−γ)'), min: 0.5, max: 4.5, step: 0.01, def: 2.6 },
      { k: 's', sym: 'σ', name: nm('ln(x−γ) std. sapması', 'sd of ln(x−γ)'), min: 0.05, max: 1.5, step: 0.01, def: 0.45 },
      { k: 'g', sym: 'γ', name: nm('konum, cm', 'location, cm'), min: 0, max: 25, step: 0.1, def: 6 }],
    pdf: (x, P) => { const y = x - P.g; return y <= 0 ? 0 : Math.exp(-0.5 * ((Math.log(y) - P.m) / P.s) ** 2) / (y * P.s * SQ2PI); },
    cdf: (x, P) => x <= P.g ? 0 : T.Phi((Math.log(x - P.g) - P.m) / P.s), q: (u, P) => P.g + Math.exp(P.m + P.s * T.PhiInv(u)),
    stats: P => { const s2 = P.s * P.s, e = Math.exp(s2); return { mean: P.g + Math.exp(P.m + s2 / 2), sd: Math.sqrt((e - 1) * Math.exp(2 * P.m + s2)), skew: (e + 2) * Math.sqrt(e - 1), mode: P.g + Math.exp(P.m - s2) }; },
  };
  D.sb = {
    name: 'Johnson SB', params: [
      { k: 'gm', sym: 'γ', name: nm('çarpıklık', 'skewness'), min: -3, max: 3, step: 0.01, def: 0.5 },
      { k: 'dl', sym: 'δ', name: nm('basıklık', 'kurtosis'), min: 0.2, max: 4, step: 0.01, def: 1.2 },
      { k: 'xi', sym: 'ξ', name: nm('alt sınır, cm', 'lower bound, cm'), min: 0, max: 30, step: 0.1, def: 6 },
      { k: 'lm', sym: 'λ', name: nm('genişlik, cm', 'range, cm'), min: 5, max: 80, step: 0.1, def: 35 }],
    pdf: (x, P) => { const y = (x - P.xi) / P.lm; if (y <= 0 || y >= 1) return 0; const z = P.gm + P.dl * Math.log(y / (1 - y)); return P.dl / (P.lm * y * (1 - y) * SQ2PI) * Math.exp(-0.5 * z * z); },
    cdf: (x, P) => { const y = (x - P.xi) / P.lm; return y <= 0 ? 0 : y >= 1 ? 1 : T.Phi(P.gm + P.dl * Math.log(y / (1 - y))); },
    q: (u, P) => P.xi + P.lm / (1 + Math.exp(-(T.PhiInv(u) - P.gm) / P.dl)),
    stats: P => numStats(D.sb, P),
  };
  /* moments by integrating the quantile function (midpoint rule), mode by grid search on the pdf */
  function numStats(dist, P, N = 4000) {
    let s1 = 0, s2 = 0, s3 = 0; const qs = new Float64Array(N);
    for (let i = 0; i < N; i++) { const v = dist.q((i + 0.5) / N, P); qs[i] = v; s1 += v; }
    const m = s1 / N; for (let i = 0; i < N; i++) { const e = qs[i] - m; s2 += e * e; s3 += e * e * e; }
    const v = s2 / N, lo = dist.q(1e-5, P), hi = dist.q(1 - 1e-5, P); let mode = lo, best = -1;
    for (let i = 0; i <= 2000; i++) { const x = lo + (hi - lo) * i / 2000, f = dist.pdf(x, P); if (f > best) { best = f; mode = x; } }
    return { mean: m, sd: Math.sqrt(v), skew: (s3 / N) / v ** 1.5, mode };
  }
  T.numStats = numStats;

  /* ---------- fitting the other distributions (location fixed, like the Weibull fits above) ---------- */
  T.fit = {};
  T.fit.gammaMoments = (d, g) => { const x = d.map(v => v - g), m = T.mean(x), v = T.sd(x, true) ** 2; return { k: m * m / v, t: v / m, g }; };
  T.fit.gammaMLE = (d, g) => {           // ln k − ψ(k) = ln(x̄) − mean(ln x)
    const x = d.map(v => v - g), m = T.mean(x), s = Math.log(m) - T.mean(x.map(Math.log));
    const k = bisect(k => Math.log(k) - T.digamma(k) - s, 1e-3, 1e4); return { k, t: m / k, g };
  };
  T.fit.normal = d => ({ m: T.mean(d), s: T.sd(d, true) });   // ML (= moments)
  T.fit.lognormal = (d, g) => { const l = d.map(v => Math.log(v - g)); return { m: T.mean(l), s: T.sd(l, true), g }; };
  /* Johnson SB with ξ, λ fixed: y = ln((x−ξ)/(ξ+λ−x)) is N(−γ/δ, 1/δ²) → δ = 1/sd(y), γ = −δ·mean(y) (ML given ξ, λ) */
  T.fit.sb = (d, xi, lm) => { const y = d.map(v => Math.log((v - xi) / (xi + lm - v))), dl = 1 / T.sd(y, true); return { gm: -dl * T.mean(y), dl, xi, lm }; };
  T.ksGen = (d, cdf) => { const s = [...d].sort((u, v) => u - v), n = s.length; let D0 = 0; s.forEach((v, i) => { const F = cdf(v); D0 = Math.max(D0, Math.abs(F - (i + 1) / n), Math.abs(F - i / n)); }); return D0; };
  T.logLikGen = (d, pdf) => T.sum(d.map(v => Math.log(Math.max(pdf(v), 1e-300))));

  /* ---------- height–diameter ---------- */
  T.chapmanRichards = (d, H = 30, k = 0.045, c = 1.3) => 1.3 + H * (1 - Math.exp(-k * d)) ** c;
  /* Näslund: h = 1.3 + d² / (a + b·d)²   ⇔   d / √(h − 1.3) = a + b·d  (fitted by ordinary least squares) */
  T.fitNaslund = function (pairs) {
    const pts = pairs.filter(p => p[1] > 1.3 && p[0] > 0);
    if (pts.length < 3) return null;
    const X = pts.map(p => p[0]), Y = pts.map(p => p[0] / Math.sqrt(p[1] - 1.3));
    const mx = T.mean(X), my = T.mean(Y);
    let sxy = 0, sxx = 0; for (let i = 0; i < X.length; i++) { sxy += (X[i] - mx) * (Y[i] - my); sxx += (X[i] - mx) ** 2; }
    if (sxx === 0) return null;
    const b = sxy / sxx, a = my - b * mx;
    const predict = d => { const q = a + b * d; return q > 0 ? 1.3 + (d / q) ** 2 : NaN; };
    const res = pts.map(p => p[1] - predict(p[0]));
    return { a, b, n: pts.length, predict, rmse: Math.sqrt(T.mean(res.map(r => r * r))) };
  };

  /* ---------- seeded randomness ---------- */
  T.seed = str => { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; };
  T.rng = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  T.randn = rng => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());

  /* ---------- files ---------- */
  T.download = (name, text, type = 'text/csv;charset=utf-8') => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type }));   // BOM so Excel reads Turkish letters
    a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  T.csv = rows => rows.map(r => r.map(v => typeof v === 'number' ? String(+v.toFixed(4)).replace('.', T.lang === 'tr' ? ',' : '.') : '"' + String(v).replace(/"/g, '""') + '"').join(T.lang === 'tr' ? ';' : ',')).join('\r\n');

  /* ---------- SVG charts (black & white) ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  T.el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  function nice(lo, hi, n = 5) {
    const span = hi - lo || 1, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0)), r = step0 / mag;
    const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag, ticks = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) ticks.push(+v.toFixed(10));
    return { ticks, step };
  }
  /* chart(svg, {x:[lo,hi], y:[lo,hi], xlab, ylab}) → {X, Y, g, inner} */
  T.chart = function (svg, o) {
    svg.textContent = '';
    const W0 = svg.clientWidth || 600, H0 = svg.clientHeight || 300, m = { l: 52, r: 12, t: 12, b: 42 };
    svg.setAttribute('viewBox', `0 0 ${W0} ${H0}`);
    const iw = W0 - m.l - m.r, ih = H0 - m.t - m.b;
    const X = v => m.l + (v - o.x[0]) / (o.x[1] - o.x[0]) * iw, Y = v => m.t + ih - (v - o.y[0]) / (o.y[1] - o.y[0]) * ih;
    const defs = T.el('defs', {}, svg);
    [['hatchA', 45, 4], ['hatchB', -45, 4], ['hatchC', 90, 3]].forEach(([id, rot, gap]) => {
      const p = T.el('pattern', { id: id + svg.id, width: gap, height: gap, patternUnits: 'userSpaceOnUse', patternTransform: `rotate(${rot})` }, defs);
      T.el('line', { x1: 0, y1: 0, x2: 0, y2: gap, stroke: 'currentColor', 'stroke-width': 1 }, p);
    });
    const ax = T.el('g', { class: 'axis' }, svg);
    nice(o.y[0], o.y[1], 5).ticks.forEach(v => {
      T.el('line', { x1: m.l - 4, x2: m.l, y1: Y(v), y2: Y(v) }, ax);
      T.el('line', { x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v), class: 'grid' }, ax);
      T.el('text', { x: m.l - 7, y: Y(v) + 4, 'text-anchor': 'end' }, ax).textContent = T.fmt(v, o.ydig ?? (Math.abs(v) < 1 && v !== 0 ? 2 : 0));
    });
    nice(o.x[0], o.x[1], Math.max(3, Math.round(iw / 70))).ticks.forEach(v => {
      T.el('line', { x1: X(v), x2: X(v), y1: m.t + ih, y2: m.t + ih + 4 }, ax);
      T.el('text', { x: X(v), y: m.t + ih + 18, 'text-anchor': 'middle' }, ax).textContent = T.fmt(v, o.xdig ?? 0);
    });
    T.el('line', { x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih, class: 'base' }, ax);
    T.el('line', { x1: m.l, x2: m.l, y1: m.t, y2: m.t + ih, class: 'base' }, ax);
    if (o.xlab) T.el('text', { x: m.l + iw / 2, y: H0 - 6, 'text-anchor': 'middle', class: 'lab' }, ax).textContent = o.xlab;
    if (o.ylab) T.el('text', { x: 12, y: m.t + ih / 2, 'text-anchor': 'middle', class: 'lab', transform: `rotate(-90 12 ${m.t + ih / 2})` }, ax).textContent = o.ylab;
    const g = T.el('g', {}, svg);
    return { X, Y, g, m, iw, ih, hatch: k => `url(#hatch${k}${svg.id})` };
  };
  T.path = pts => pts.filter(p => isFinite(p[0]) && isFinite(p[1])).map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');

  /* ---------- the engraved stand (shared with the front page look) ---------- */
  T.drawStand = function (svg, trees, opts = {}) {
    const W0 = svg.clientWidth, H0 = svg.clientHeight, rng = opts.rng || Math.random;
    const hMax = opts.hMax || Math.max(...trees.map(t => t.h)), sy = (H0 - 6) / hMax, sx = Math.max(.12, Math.min(.3, W0 / 3000));
    svg.setAttribute('viewBox', `0 0 ${W0} ${H0}`); svg.textContent = '';
    const defs = T.el('defs', {}, svg);
    [7, 4.5, 2.6].forEach((gap, i) => {
      const p = T.el('pattern', { id: 'sh' + i + svg.id, width: gap, height: gap, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(' + (i === 1 ? -40 : 40) + ')' }, defs);
      T.el('line', { x1: 0, y1: 0, x2: 0, y2: gap, stroke: 'currentColor', 'stroke-width': i === 2 ? 1.1 : .9 }, p);
    });
    trees.forEach(t => {
      const cx = 6 + t.x * (W0 - 12), y = H0 - t.h * sy, w = Math.max(1.6, t.d * sx * 1.5), top = w * .45;
      const cw = Math.max(5, (1.2 + .16 * t.d) * sy * .55), cl = t.h * sy * (t.cr || .38);
      const g = T.el('g', { class: 'tree' }, svg);
      T.el('path', { d: `M${cx - w / 2} ${H0}L${cx - top / 2} ${y + cl * .5}L${cx + top / 2} ${y + cl * .5}L${cx + w / 2} ${H0}Z` }, g);
      T.el('rect', { x: cx - cw / 2, y, width: cw, height: cl, rx: cw / 2, class: 'crown', fill: `url(#sh${t.z}${svg.id})` }, g);
      if (opts.animate) g.style.setProperty('--d', (t.x * .6).toFixed(2) + 's'); else g.style.animation = 'none';
      t.el = g; t.cx = cx; t.y = y;
    });
    T.el('line', { x1: 0, x2: W0, y1: H0 - 1, y2: H0 - 1, class: 'ground' }, svg);
  };
  T.standTooltip = function (svg, tip, getTrees) {
    let on = null;
    const pick = ev => {
      const trees = getTrees(); if (!trees.length) return;
      const x = ev.clientX - svg.getBoundingClientRect().left; let best = null, bd = 1e9;
      trees.forEach(t => { const dd = Math.abs(t.cx - x) - t.z * 2; if (dd < bd) { bd = dd; best = t; } });
      if (on) on.el.classList.remove('on'); on = best; best.el.classList.add('on');
      svg.appendChild(best.el); svg.appendChild(svg.querySelector('.ground'));
      tip.hidden = false; tip.style.left = (best.cx + 10) + 'px'; tip.style.top = (best.y + 10) + 'px';
      tip.innerHTML = `d = ${T.fmt(best.d, 1)} cm<br>h = ${T.fmt(best.h, 1)} m`;
    };
    svg.addEventListener('pointermove', pick); svg.addEventListener('pointerdown', pick);
    svg.addEventListener('pointerleave', () => { if (on) on.el.classList.remove('on'); on = null; tip.hidden = true; });
  };

  G.MP = T;
})(window);
