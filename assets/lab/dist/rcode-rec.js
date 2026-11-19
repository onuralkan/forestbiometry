// Diameter Distribution Lab: the "R code" scripts, stage 2 (parameter recovery from summary values; user decision
// 19 Nov 2026: staged). One script per recovery card of the page, with the summaries the card used (typed or computed
// from the loaded data; they are inputs, not data, so they are written into the script at full precision):
//   'mom'       normal, lognormal and gamma from the mean and the variance or Dq (closed forms)
//   'weibull'   Poudel and Cao (2013) M2–M10 with the location policy (shape roots: geometric grid and uniroot, every
//               root kept, as the tool)
//   'parresol'  Johnson SB with ξ given, Parresol (2003): λ, δ from the mean and Dq (γ from the median), nleqslv
//   'fonseca'   Johnson SB, all four parameters, Fonseca, Marques and Parresol (2009): median and three moments, nleqslv
// The Johnson SB moments E[Y^r] by R's integrate. The equations are the ones of METHODS §12; every solution is checked by
// back-calculating the targets. No DOM.
import { header, FB_OUT, rStr, rNum, rVec, rComment } from '../core/rcode.js';
import { PAIRS } from './recover/weibull.js';
import { STARTS as PRS_STARTS } from './recover/parresol.js';
import { STARTS as FNS_STARTS } from './recover/fonseca.js';

const rList = obj => `list(${Object.entries(obj).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k} = ${typeof v === 'string' ? rStr(v) : rNum(v)}`).join(', ')})`;

const R_SB = String.raw`# E[Y^r], Y = logistic((Z − γ)/δ), Z standard normal (integrate, split at γ ± kδ so that a narrow integrand is not missed)
fb_sbY <- function(g, d, r) { br <- sort(unique(c(-Inf, g + c(-16, -8, -4, -2, -1, 0, 1, 2, 4, 8, 16) * d, Inf)))
  sum(sapply(seq_len(length(br) - 1), function(i) integrate(function(z) plogis((z - g) / d)^r * dnorm(z), br[i], br[i + 1], rel.tol = 1e-13, subdivisions = 2000L)$value)) }
fb_sb_back <- function(xi, lambda, gamma, delta) { u1 <- fb_sbY(gamma, delta, 1); u2 <- fb_sbY(gamma, delta, 2); u3 <- fb_sbY(gamma, delta, 3)
  m1 <- xi + lambda * u1; m2 <- xi^2 + 2 * xi * lambda * u1 + lambda^2 * u2; m3 <- xi^3 + 3 * xi^2 * lambda * u1 + 3 * xi * lambda^2 * u2 + lambda^3 * u3
  c(mean = m1, median = xi + lambda * plogis(-gamma / delta), dq = sqrt(m2), dg = m3 / m2) }
# distinct converged solutions of a system F(x) = 0 from a grid of starts (nleqslv, Newton with line search)
fb_solve <- function(F, starts, key) { sols <- list()
  for (x0 in starts) { s <- tryCatch(nleqslv(x0, F, method = "Newton", control = list(ftol = 1e-13, xtol = 1e-15, maxit = 300)), error = function(e) NULL)
    if (is.null(s) || !all(is.finite(s$fvec)) || max(abs(s$fvec)) > 1e-10) next
    p <- key(s$x); if (!any(sapply(sols, function(q) all(abs(q - p) <= 1e-6 * pmax(1, abs(p)))))) sols[[length(sols) + 1]] <- p }
  sols }
`;

/**
 * card: 'mom' | 'weibull' | 'parresol' | 'fonseca'; summary: the card's summary object (as the methods received it);
 * opts: the card's method options (Weibull location policy); results: the card's results (tool); o = { lang, created,
 * version }.
 */
export function buildRecoverR(card, summary, opts, results, o) {
  const tr = o.lang === 'tr', T = (a, b) => (tr ? a : b), out = [];
  const titles = { mom: T('Momentlerden geri kazanım', 'Recovery from moments'), weibull: T('Weibull geri kazanımı (Poudel ve Cao 2013, M2–M10)', 'Weibull recovery (Poudel and Cao 2013, M2–M10)'),
    parresol: T('Johnson SB geri kazanımı, ξ verilmiş (Parresol 2003)', 'Johnson SB recovery, ξ given (Parresol 2003)'), fonseca: T('Johnson SB, dört parametrenin geri kazanımı (Fonseca ve ark. 2009)', 'Johnson SB, recovery of all four parameters (Fonseca et al. 2009)') };
  const sb = card === 'parresol' || card === 'fonseca';
  out.push(header({ title: T('Çap Dağılımı Laboratuvarı: R kodu, ', 'Diameter Distribution Lab: R code, ') + titles[card], tool: { id: 'cap-dagilimi', version: o.version }, created: o.created, lang: o.lang, packages: sb ? ['nleqslv'] : [],
    notes: [T('Aşama 2: özet değerlerden geri kazanım. Ham veri yok: özetler (yazılan ya da yüklenen veriden hesaplanan) betikte tam duyarlıkla yazılıdır; olabilirlik ve uyum ölçütü yoktur, çözüm hedefler geri hesaplanarak denetlenir.',
      'Stage 2: recovery from summary values. No raw data: the summaries (typed, or computed from the loaded data) are written into the script at full precision; there is no likelihood and no fit statistic, a solution is checked by back-calculating the targets.'),
    ...(summary && summary.from ? [T('Bu özetler yüklenen veriden hesaplandı (ortalama ve varyans n bölenli, yüzdelikler tip 7); aynı hesap 1. aşama betiğindeki birimlerle yapılabilir.', 'These summaries were computed from the loaded data (mean and variance with divisor n, percentiles type 7); the same can be done with the units of the stage 1 script.')] : [])] }));
  out.push(FB_OUT, '', `res <- list()`);
  const okR = (results || []).filter(r => r.status === 'ok' || r.status === 'multiple');
  for (const r of (results || []).filter(x => !okR.includes(x))) out.push(rComment(T(`${r.method}: araçta sonuç yok (${r.status}${r.problems && r.problems[0] ? ', ' + r.problems[0].code : ''}); R'da da hesaplanmaz.`, `${r.method}: no result in the tool (${r.status}${r.problems && r.problems[0] ? ', ' + r.problems[0].code : ''}); not computed in R either.`)));
  out.push(...recoverBody(card, summary, opts, okR, T));
  out.push('', `fb_out(res)`, '');
  return out.join('\n');
}

/**
 * The R lines of a recovery after the header: the summary `s`, the method's code and its results written into `res`
 * (also used by the stand-model scripts, stage 3b, with the predicted responses as the summary). okR: the results to
 * redo ({ method } of status 'ok' or 'multiple'), T: the language picker.
 */
export function recoverBody(card, summary, opts, okR, T, sExpr = null) {
  const out = [], sb = card === 'parresol' || card === 'fonseca';
  if (card === 'mom') {
    const s = summary || {};
    out.push(rComment(T('Özet: ortalama ve varyans (bölen n ya da n − 1, n − 1 ise n gerekir) ya da Dq; varyans moment varyansına çevrilir v = s²(n − 1)/n, Dq\'dan v = Dq² − m².', 'Summary: the mean and the variance (divisor n or n − 1, which needs n) or Dq; the variance becomes the moment variance v = s²(n − 1)/n, from Dq v = Dq² − m².')),
      `s <- ${rList({ mean: s.mean, variance: s.variance, varDivisor: s.variance != null ? (s.varDivisor || 'n') : null, n: s.n, dq: s.dq })}`,
      `m <- s$mean; v <- if (!is.null(s$variance)) { if (identical(s$varDivisor, "n-1")) s$variance * (s$n - 1) / s$n else s$variance } else (s$dq - m) * (s$dq + m)`,
      `cat("m =", m, " v =", v, " Dq =", sqrt(m^2 + v), "\\n")`);
    for (const r of okR) {
      if (r.method === 'normal.rec') out.push(`p <- c(mu = m, sigma = sqrt(v))   # normal`, `print(p); res[c("normal.mu", "normal.sigma")] <- as.list(unname(p))`);
      if (r.method === 'lognormal.rec') out.push(`s2 <- log1p(v / m^2); p <- c(mu = log(m) - s2 / 2, sigma = sqrt(s2))   # lognormal: E[D] = e^(μ + σ²/2), Var[D] = (e^σ² − 1)E[D]²`,
        `print(p); res[c("lognormal.mu", "lognormal.sigma")] <- as.list(unname(p)); cat(${rStr(T('geri hesap', 'back-calculated'))}, exp(p[[1]] + p[[2]]^2 / 2), (exp(p[[2]]^2) - 1) * exp(2 * p[[1]] + p[[2]]^2), "\\n")`);
      if (r.method === 'gamma.rec') out.push(`p <- c(k = m^2 / v, theta = v / m)   # gamma: E[D] = kθ, Var[D] = kθ²`, `print(p); res[c("gamma.k", "gamma.theta")] <- as.list(unname(p))`);
    }
  } else if (card === 'weibull') {
    const s = summary || {}, loc = opts && opts.loc === 'user' ? { loc: 'user', a: opts.a } : { loc: 'half-dmin' };
    out.push(rComment(T('Hedefler (Poudel ve Cao 2013): ortalama, varyans (moment varyansı; n − 1 ile verildiyse çevrilir), Dq, yüzdelikler Q25…Q95, en küçük çap Dmin, ağaç sayısı n. G_r(c) = Γ(1 + r/c), A_p = −ln(1 − p).',
      'Targets (Poudel and Cao 2013): mean, variance (moment variance; converted if given with n − 1), Dq, percentiles Q25…Q95, the smallest diameter Dmin, number of trees n. G_r(c) = Γ(1 + r/c), A_p = −ln(1 − p).')),
      `s <- ${sExpr ?? rList({ mean: s.mean, variance: s.variance, varDivisor: s.variance != null ? (s.varDivisor || 'n') : null, n: s.n, dq: s.dq, q25: s.q25, q31: s.q31, q63: s.q63, q50: s.q50, q95: s.q95, dmin: s.dmin })}`,
      `if (!is.null(s$variance) && identical(s$varDivisor, "n-1")) s$variance <- s$variance * (s$n - 1) / s$n`,
      `a <- ${loc.loc === 'user' ? rNum(loc.a) + `   # ${T('konum: kullanıcının değeri', 'location: the user\'s value')}` : `0.5 * s$dmin   # ${T('konum: kaynağın kuralı a = Dmin/2 (M2–M9)', 'location: the source\'s rule a = Dmin/2 (M2–M9)')}`}`,
      `G <- function(r, c) gamma(1 + r / c)
Bq <- function(c, a, q) { g1 <- G(1, c); g2 <- G(2, c); (-a * g1 + sqrt(a^2 * g1^2 + g2 * (q^2 - a^2))) / g2 }   # scale with a + E[x] structure giving Dq
pct <- function(qp, qr, p, r, a) { Ap <- -log1p(-p); Ar <- -log1p(-r); c <- log(Ar / Ap) / log((qr - a) / (qp - a)); c(b = (qp - a) / Ap^(1 / c), c = c) }
# every root of h on [0.05, 200]: geometric grid of 600 cells, uniroot in each sign change (the tool's search; all roots kept)
roots <- function(h) { xs <- 0.05 * (200 / 0.05)^((0:600) / 600); ys <- sapply(xs, h); r <- c()
  for (i in 1:600) { if (ys[i] == 0) r <- c(r, xs[i]) else if (is.finite(ys[i]) && is.finite(ys[i + 1]) && ys[i] * ys[i + 1] < 0) r <- c(r, uniroot(h, xs[i:(i + 1)], tol = 1e-15)$root) }
  if (ys[601] == 0) r <- c(r, xs[601]); r[c(TRUE, diff(r) > 1e-9 * r[-length(r)])] }
report <- function(id, a, cs, scale) { b <- sapply(cs, scale); ok <- b > 0; cs <- cs[ok]; b <- b[ok]
  cat(id, ": a =", a, if (length(cs) == 1) paste("b =", b, "c =", cs) else paste(length(cs), "roots, c =", paste(signif(cs, 8), collapse = ", ")), "\\n")
  res[[paste0(id, ".roots")]] <<- length(cs); if (length(cs) == 1) { res[[paste0(id, ".a")]] <<- a; res[[paste0(id, ".b")]] <<- b; res[[paste0(id, ".c")]] <<- cs } else for (j in seq_along(cs)) res[[paste0(id, ".c", j)]] <<- cs[j] }`);
    const A95 = '-log1p(-0.95)';
    for (const r of okR) {
      const id = r.method.replace('weibull.', '');
      out.push(rComment(`${id.toUpperCase()}: ${{ m2: 'mean, variance', m3: 'Dq, variance', m4: 'Q31, Q63', m5: 'Q50, Q95', m6: 'Dq, Q25, Q95', m7: 'Dq, Q31, Q63', m8: 'mean, Q95', m9: 'Dq, Q95', m10: 'Dq, Q25, Q50, Q95, Dmin, n' }[id]}`));
      if (id === 'm2') out.push(`sc <- function(c) (s$mean - a) / G(1, c); report("m2", a, roots(function(c) sc(c)^2 * (G(2, c) - G(1, c)^2) / s$variance - 1), sc)`);
      if (id === 'm3') out.push(`sc <- function(c) Bq(c, a, s$dq); report("m3", a, roots(function(c) sc(c)^2 * (G(2, c) - G(1, c)^2) / s$variance - 1), sc)`);
      if (id === 'm4' || id === 'm5') { const [p, q] = PAIRS[id]; out.push(`e <- pct(s$q${Math.round(p * 100)}, s$q${Math.round(q * 100)}, ${p}, ${q}, a); report(${rStr(id)}, a, e[["c"]], function(c) e[["b"]])`); }
      if (id === 'm6' || id === 'm7') { const [p, q] = PAIRS[id]; out.push(`c_ <- pct(s$q${Math.round(p * 100)}, s$q${Math.round(q * 100)}, ${p}, ${q}, a)[["c"]]; report(${rStr(id)}, a, c_, function(c) Bq(c, a, s$dq))`); }
      if (id === 'm8') out.push(`sc <- function(c) (s$q95 - a) / (${A95})^(1 / c); report("m8", a, roots(function(c) (a + sc(c) * G(1, c)) / s$mean - 1), sc)`);
      if (id === 'm9') out.push(`sc <- function(c) (s$q95 - a) / (${A95})^(1 / c); report("m9", a, roots(function(c) (a^2 + 2 * a * sc(c) * G(1, c) + sc(c)^2 * G(2, c)) / s$dq^2 - 1), sc)`);
      if (id === 'm10') out.push(`k3 <- s$n^(1 / 3); a10 <- (k3 * s$dmin - s$q50) / (k3 - 1)   # M10's own location`, `c_ <- pct(s$q25, s$q95, 0.25, 0.95, a10)[["c"]]; report("m10", a10, c_, function(c) Bq(c, a10, s$dq))`);
    }
  } else if (card === 'parresol') {
    const s = summary || {};
    out.push(rComment(T('Girdiler: ξ (verilen alt sınır), ortalama m, medyan M, Dq (doğrudan ya da N ve G\'den: Dq² = G/(K·N), K = π/40000). Bilinmeyenler λ = (M − ξ) + e^s, δ = e^t; γ = δ ln[(ξ + λ − M)/(M − ξ)] (medyan tam tutar). Denklemler ölçekli: ortalama/m − 1, ikinci moment/Dq² − 1.',
      'Inputs: ξ (the given lower bound), mean m, median M, Dq (given, or from N and G: Dq² = G/(K·N), K = π/40000). Unknowns λ = (M − ξ) + e^s, δ = e^t; γ = δ ln[(ξ + λ − M)/(M − ξ)] (the median is matched exactly). Scaled equations: mean/m − 1, second moment/Dq² − 1.')),
      `s <- ${sExpr ?? rList({ xi: s.xi, mean: s.mean, median: s.median, dq: s.dq, nha: s.nha, g: s.g })}`,
      `q <- if (!is.null(s$dq)) s$dq else sqrt(s$g / (pi / 40000 * s$nha))`, R_SB,
      `par_of <- function(x) { lambda <- (s$median - s$xi) + exp(x[1]); delta <- exp(x[2]); c(xi = s$xi, lambda = lambda, gamma = delta * log((s$xi + lambda - s$median) / (s$median - s$xi)), delta = delta) }`,
      `F <- function(x) { p <- par_of(x); u1 <- fb_sbY(p[["gamma"]], p[["delta"]], 1); u2 <- fb_sbY(p[["gamma"]], p[["delta"]], 2)
  c((p[["xi"]] + p[["lambda"]] * u1) / s$mean - 1, (p[["xi"]]^2 + 2 * p[["xi"]] * p[["lambda"]] * u1 + p[["lambda"]]^2 * u2) / q^2 - 1) }`,
      `starts <- lapply(list(${PRS_STARTS.map(([l, d]) => `c(${l}, ${d})`).join(', ')}), function(v) c(log(v[1] * (s$median - s$xi)), log(v[2])))   # ${T('aracın başlangıç ızgarası', 'the tool\'s grid of starts')}`,
      `sols <- fb_solve(F, starts, par_of)`);
  } else if (card === 'fonseca') {
    const s = summary || {};
    out.push(rComment(T('Girdiler: medyan d50, ortalama, Dq ve göğüs yüzeyi ağırlıklı ortalama çap d̄_G (m3 = d̄_G·Dq²). Bilinmeyenler ξ = d50·logistic(a), λ = (d50 − ξ)(1 + e^b), δ = e^c; γ = δ ln[(ξ + λ − d50)/(d50 − ξ)]. Denklemler ölçekli: m_r(model)/m_r − 1, r = 1, 2, 3.',
      'Inputs: median d50, mean, Dq and the basal-area-weighted mean diameter d̄_G (m3 = d̄_G·Dq²). Unknowns ξ = d50·logistic(a), λ = (d50 − ξ)(1 + e^b), δ = e^c; γ = δ ln[(ξ + λ − d50)/(d50 − ξ)]. Scaled equations: m_r(model)/m_r − 1, r = 1, 2, 3.')),
      `s <- ${rList({ mean: s.mean, median: s.median, dq: s.dq, dg: s.dg })}`, `tm <- c(s$mean, s$dq^2, s$dg * s$dq^2)`, R_SB,
      `par_of <- function(x) { xi <- s$median * plogis(x[1]); lambda <- (s$median - xi) * (1 + exp(x[2])); delta <- exp(x[3]); c(xi = xi, lambda = lambda, gamma = delta * log((xi + lambda - s$median) / (s$median - xi)), delta = delta) }`,
      `F <- function(x) { p <- par_of(x); u <- sapply(1:3, function(r) fb_sbY(p[["gamma"]], p[["delta"]], r)); xi <- p[["xi"]]; l <- p[["lambda"]]
  c(xi + l * u[1], xi^2 + 2 * xi * l * u[1] + l^2 * u[2], xi^3 + 3 * xi^2 * l * u[1] + 3 * xi * l^2 * u[2] + l^3 * u[3]) / tm - 1 }`,
      `starts <- list(${FNS_STARTS.map(x => rVec(x)).join(', ')})   # ${T('aracın başlangıç ızgarası (logit, log, log)', 'the tool\'s grid of starts (logit, log, log)')}`,
      `sols <- fb_solve(F, starts, par_of)`);
  }
  if (sb) out.push(`cat(length(sols), ${rStr(T(' çözüm\\n', ' solution(s)\\n'))}); for (p in sols) { print(p); print(fb_sb_back(p[["xi"]], p[["lambda"]], p[["gamma"]], p[["delta"]])) }`,
    `res[["solutions"]] <- length(sols); if (length(sols) == 1) for (k in names(sols[[1]])) res[[k]] <- sols[[1]][[k]]`,
    rComment(T('Birden çok çözüm: yöntem tek başına seçemez (araç da sonucu "birden çok" olarak verir).', 'Several solutions: the method alone cannot choose (the tool reports "multiple" too).')));
  return out;
}
