// Diameter Distribution Lab: the "R code" script, stage 1 (fitting from measured diameters or classes; user decision
// 19 Nov 2026: staged, fitting first, with the R package fitdistrplus). It redoes the fitting run of the page: the same
// analysis units (plot × period, or pooled), the same diameters (decimal separator, mm → cm, filter, d > 0) or classes,
// every fitted family and method with the same fixed parameters (Weibull and exponential location, beta L/U, Johnson
// SB ξ/λ), options (variance divisor, percentile pair, probabilities and weights, distance) and measurement thresholds;
// the fit statistics KS D, Anderson–Darling A², Cramér–von Mises W², and AIC/BIC where the likelihood was maximised.
// The families are written in R with the tool's parameters (no base-R name is reused for a different parameterisation).
// The recovery cards have their own scripts (rcode-rec.js, stage 2); stand models, bootstrap and the class table are later.
// No DOM.
import { family as famOf } from './registry.js';
import { header, readBlock, FB_NUM, FB_OUT, rStr, rNum, rVec, rComment } from '../core/rcode.js';

/** Families in R: density (with log), distribution function, quantile, raw moments of order 1 and 2 (for mme). */
export const R_FAMILIES = String.raw`# ---- families with the tool's parameters (see the tool's guide; sources on the site's References page); an invalid parameter gives density 0 ----
fb_bad <- function(x, log) rep(if (log) -Inf else 0, length(x))
dfb_weibull <- function(x, a, b, c, log = FALSE) if (isTRUE(b > 0 && c > 0)) dweibull(x - a, shape = c, scale = b, log = log) else fb_bad(x, log)
pfb_weibull <- function(q, a, b, c) pweibull(q - a, shape = c, scale = b)
qfb_weibull <- function(p, a, b, c) a + qweibull(p, shape = c, scale = b)
mfb_weibull <- function(order, a, b, c) sapply(order, function(k) if (k == 1) a + b * gamma(1 + 1 / c) else a^2 + 2 * a * b * gamma(1 + 1 / c) + b^2 * gamma(1 + 2 / c))
dfb_normal <- function(x, mu, sigma, log = FALSE) if (isTRUE(sigma > 0)) dnorm(x, mu, sigma, log = log) else fb_bad(x, log)
pfb_normal <- function(q, mu, sigma) pnorm(q, mu, sigma)
qfb_normal <- function(p, mu, sigma) qnorm(p, mu, sigma)
dfb_lognormal <- function(x, mu, sigma, log = FALSE) if (isTRUE(sigma > 0)) dlnorm(x, mu, sigma, log = log) else fb_bad(x, log)
pfb_lognormal <- function(q, mu, sigma) plnorm(q, mu, sigma)
qfb_lognormal <- function(p, mu, sigma) qlnorm(p, mu, sigma)
mfb_lognormal <- function(order, mu, sigma) exp(order * mu + order^2 * sigma^2 / 2)
dfb_gamma <- function(x, k, theta, log = FALSE) if (isTRUE(k > 0 && theta > 0)) dgamma(x, shape = k, scale = theta, log = log) else fb_bad(x, log)
pfb_gamma <- function(q, k, theta) pgamma(q, shape = k, scale = theta)
qfb_gamma <- function(p, k, theta) qgamma(p, shape = k, scale = theta)
mfb_gamma <- function(order, k, theta) sapply(order, function(o) if (o == 1) k * theta else k * (k + 1) * theta^2)
dfb_beta <- function(x, L, U, alpha, beta, log = FALSE) if (isTRUE(alpha > 0 && beta > 0 && U > L)) { v <- dbeta((x - L) / (U - L), alpha, beta, log = TRUE) - log(U - L); if (log) v else exp(v) } else fb_bad(x, log)
pfb_beta <- function(q, L, U, alpha, beta) pbeta((q - L) / (U - L), alpha, beta)
qfb_beta <- function(p, L, U, alpha, beta) L + (U - L) * qbeta(p, alpha, beta)
mfb_beta <- function(order, L, U, alpha, beta) { S <- U - L; e1 <- alpha / (alpha + beta); e2 <- alpha * (alpha + 1) / ((alpha + beta) * (alpha + beta + 1))
  sapply(order, function(o) if (o == 1) L + S * e1 else L^2 + 2 * L * S * e1 + S^2 * e2) }
fb_sbz <- function(x, xi, lambda, gamma, delta) gamma + delta * log((x - xi) / (xi + lambda - x))
dfb_johnsonsb <- function(x, xi, lambda, gamma, delta, log = FALSE) {
  if (!isTRUE(lambda > 0 && delta > 0)) return(fb_bad(x, log))
  v <- rep(-Inf, length(x)); i <- which(x > xi & x < xi + lambda)
  v[i] <- dnorm(fb_sbz(x[i], xi, lambda, gamma, delta), log = TRUE) + log(delta * lambda) - log((x[i] - xi) * (xi + lambda - x[i])); if (log) v else exp(v) }
pfb_johnsonsb <- function(q, xi, lambda, gamma, delta) ifelse(q <= xi, 0, ifelse(q >= xi + lambda, 1, pnorm(fb_sbz(pmin(pmax(q, xi), xi + lambda), xi, lambda, gamma, delta))))
qfb_johnsonsb <- function(p, xi, lambda, gamma, delta) xi + lambda * plogis((qnorm(p) - gamma) / delta)
# E[Y^k], Y = logistic((Z − γ)/δ), Z standard normal, by numerical integration
mfb_johnsonsb <- function(order, xi, lambda, gamma, delta) { ey <- function(k) integrate(function(z) plogis((z - gamma) / delta)^k * dnorm(z), -Inf, Inf, rel.tol = 1e-12)$value
  sapply(order, function(o) if (o == 1) xi + lambda * ey(1) else xi^2 + 2 * xi * lambda * ey(1) + lambda^2 * ey(2)) }
dfb_exponential <- function(x, a, r, log = FALSE) if (isTRUE(r > 0)) dexp(x - a, r, log = log) else fb_bad(x, log)
pfb_exponential <- function(q, a, r) pexp(q - a, r)
qfb_exponential <- function(p, a, r) a + qexp(p, r)
dfb_loglogistic <- function(x, b, c, log = FALSE) { if (!isTRUE(b > 0 && c > 0)) return(fb_bad(x, log)); v <- rep(-Inf, length(x)); i <- which(x > 0)
  v[i] <- log(c) - log(x[i]) + dlogis(c * (log(x[i]) - log(b)), log = TRUE); if (log) v else exp(v) }
pfb_loglogistic <- function(q, b, c) ifelse(q > 0, plogis(c * (log(pmax(q, 1e-300)) - log(b))), 0)
qfb_loglogistic <- function(p, b, c) b * (p / (1 - p))^(1 / c)
dfb_gengamma <- function(x, a, b, c, log = FALSE) { if (!isTRUE(a > 0 && b > 0 && c > 0)) return(fb_bad(x, log)); v <- rep(-Inf, length(x)); i <- which(x > 0)
  v[i] <- log(c) - log(b) - lgamma(a) + (a * c - 1) * log(x[i] / b) - (x[i] / b)^c; if (log) v else exp(v) }
pfb_gengamma <- function(q, a, b, c) pgamma((pmax(q, 0) / b)^c, a)
qfb_gengamma <- function(p, a, b, c) b * qgamma(p, a)^(1 / c)
dfb_gumbel <- function(x, mu, beta, log = FALSE) { if (!isTRUE(beta > 0)) return(fb_bad(x, log)); z <- (x - mu) / beta; v <- -log(beta) - z - exp(-z); if (log) v else exp(v) }
pfb_gumbel <- function(q, mu, beta) exp(-exp(-(q - mu) / beta))
qfb_gumbel <- function(p, mu, beta) mu - beta * log(-log(p))
mfb_gumbel <- function(order, mu, beta) { m1 <- mu - digamma(1) * beta; sapply(order, function(o) if (o == 1) m1 else pi^2 * beta^2 / 6 + m1^2) }
fb_pars <- list(weibull = c("a", "b", "c"), normal = c("mu", "sigma"), lognormal = c("mu", "sigma"), gamma = c("k", "theta"), beta = c("L", "U", "alpha", "beta"),
  johnsonsb = c("xi", "lambda", "gamma", "delta"), exponential = c("a", "r"), loglogistic = c("b", "c"), gengamma = c("a", "b", "c"), gumbel = c("mu", "beta"))
`;

/** Methods in R: fitdistrplus where it has the method, the rest written out; statistics and the result writer. */
export const R_METHODS = String.raw`# ---- methods ----
fb_ctl <- list(reltol = 1e-15, maxit = 20000)   # Nelder–Mead (optim) as fitdistrplus calls it, with a tight tolerance
fb_fn <- function(fam, kind) get(paste0(kind, "fb_", fam))
fb_call <- function(f, x, par) do.call(f, c(list(x), as.list(par)))
# conditional distribution on [L, U] (measurement thresholds): f/(F(U) − F(L)), as named functions for fitdistrplus
fb_truncated <- function(fam, L, U) {
  pn <- fb_pars[[fam]]; d0 <- fb_fn(fam, "d"); p0 <- fb_fn(fam, "p")
  mass <- function(par) (if (is.na(U)) 1 else fb_call(p0, U, par)) - (if (is.na(L)) 0 else fb_call(p0, L, par))
  d <- function() { par <- mget(pn); m <- mass(par); v <- fb_call(d0, x, c(par, log = TRUE)) - log(m)
    v[!is.finite(m) | m <= 0 | (!is.na(L) & x < L) | (!is.na(U) & x > U)] <- -Inf; if (log) v else exp(v) }
  p <- function() { par <- mget(pn); FL <- if (is.na(L)) 0 else fb_call(p0, L, par); pmin(pmax((fb_call(p0, q, par) - FL) / mass(par), 0), 1) }
  formals(d) <- c(alist(x = ), setNames(rep(alist(x = ), length(pn)), pn), alist(log = FALSE))
  formals(p) <- c(alist(q = ), setNames(rep(alist(x = ), length(pn)), pn))
  assign(paste0("dfb_t_", fam), d, envir = globalenv()); assign(paste0("pfb_t_", fam), p, envir = globalenv())
  paste0("fb_t_", fam)
}
# KS D, Anderson–Darling A², Cramér–von Mises W² of a distribution function pf on the data x (definitions of gof.js)
fb_gof <- function(x, pf) { s <- sort(x); n <- length(s); F <- pf(s); i <- seq_len(n)
  c(ks = max(i / n - F, F - (i - 1) / n), ad = -n - sum((2 * i - 1) * (log(F) + log(1 - rev(F)))) / n, cvm = 1 / (12 * n) + sum((F - (2 * i - 1) / (2 * n))^2)) }
fb_memp <- function(div) function(x, order) sapply(order, function(o) if (o == 1) mean(x) else sum((x - mean(x))^2) / (length(x) - (div == "n-1")) + mean(x)^2)
fb_lmom <- function(x) { s <- sort(x); n <- length(s); b1 <- sum((seq_len(n) - 1) / (n - 1) * s) / n; c(l1 = mean(s), l2 = 2 * b1 - mean(s)) }
fb_q7 <- function(x, p) unname(quantile(x, p, type = 7))
# one fit: x = diameters (or classes for "gml"); returns the estimates (free and fixed), logLik, k and the statistics
fb_run <- function(x, fam, how, fix, start, opt = list()) {
  distr <- paste0("fb_", fam); pn <- fb_pars[[fam]]; free <- names(start)
  fd <- function(...) if (length(start) == 1)   # one free parameter: Brent on a bracket around the start (optim's BFGS stops early)
    fitdist(x, distr, start = start, fix.arg = if (length(fix)) fix else NULL, optim.method = "Brent", lower = start[[1]] / 100, upper = start[[1]] * 100, control = list(reltol = 1e-15), ...)
    else fitdist(x, distr, start = start, fix.arg = if (length(fix)) fix else NULL, control = fb_ctl, ...)
  est <- NULL; ll <- NULL
  if (how == "ml") { f <- fd(method = "mle"); est <- f$estimate }
  else if (how == "mom") { f <- fd(method = "mme", order = 1:2, memp = fb_memp(opt$varDivisor)); est <- f$estimate }
  else if (how == "pct") { f <- fd(method = "qme", probs = c(opt$p, opt$r)); est <- f$estimate }
  else if (how == "mge") { f <- fd(method = "mge", gof = c(ks = "KS", cvm = "CvM", ad = "AD")[[opt$gof]]); est <- f$estimate }
  else if (how == "qme") {   # Σ wᵢ [Q(pᵢ) − q̂ᵢ]² with the chosen weights (fitdistrplus's qme has equal weights)
    qh <- fb_q7(x, opt$probs); qf <- fb_fn(fam, "q")
    o <- optim(unlist(start), function(th) { v <- sum(opt$weights * (fb_call(qf, opt$probs, c(as.list(th), fix)) - qh)^2); if (is.finite(v)) v else Inf }, control = fb_ctl)
    est <- o$par }
  else if (how == "lmom") { a <- if (is.null(fix$a)) 0 else fix$a; l <- fb_lmom(x - a)
    if (fam == "weibull") { c_ <- -log(2) / log(1 - l[["l2"]] / l[["l1"]]); est <- c(b = l[["l1"]] / gamma(1 + 1 / c_), c = c_) }
    else { r <- l[["l2"]] / l[["l1"]]   # gamma: λ2/λ1 = Γ(k + ½)/(√π Γ(k + 1)), one root in k
      k <- exp(uniroot(function(lk) lgamma(exp(lk) + 0.5) - 0.5 * log(pi) - lgamma(exp(lk) + 1) - log(r), c(-30, 30), tol = 1e-14)$root); est <- c(k = k, theta = l[["l1"]] / k) } }
  else if (how == "logmom") { y <- log(x); est <- c(b = exp(mean(y)), c = pi / sqrt(3 * mean((y - mean(y))^2))) }
  else if (how == "tml") { distr <- fb_truncated(fam, opt$lower, opt$upper)
    f <- fitdist(x, distr, start = start, fix.arg = if (length(fix)) fix else NULL, control = fb_ctl); est <- f$estimate }
  else if (how == "gml") {   # grouped likelihood Σ wⱼ ln pⱼ (− W ln Σ pₖ when trees outside the classes were not recorded)
    pf <- fb_fn(fam, "p"); W <- sum(x$n)
    nll <- function(th) { par <- c(as.list(th), fix); Fhi <- ifelse(is.finite(x$hi), fb_call(pf, x$hi, par), 1); pj <- Fhi - fb_call(pf, x$lo, par)
      if (any(!is.finite(pj)) || any(pj[x$n > 0] <= 0)) return(Inf); v <- sum(x$n[x$n > 0] * log(pj[x$n > 0])); if (opt$outside == "unrecorded") v <- v - W * log(sum(pj)); -v / W }
    o <- optim(unlist(start), nll, control = fb_ctl); est <- o$par; ll <- if (opt$countType == "count") -o$value * W else NA }
  par <- c(as.list(est), fix)[pn]; k <- length(free)
  if (how == "gml") return(list(est = unlist(par), ll = ll, k = k, n = sum(x$n), gof = c()))
  pf <- if (how == "tml") function(q) fb_call(get(paste0("p", distr)), q, par) else function(q) fb_call(fb_fn(fam, "p"), q, par)
  df <- if (how == "tml") get(paste0("d", distr)) else fb_fn(fam, "d")
  list(est = unlist(par), ll = sum(fb_call(df, x, c(par, log = TRUE))), k = k, n = length(x), gof = fb_gof(x, pf))
}
fb_put <- function(res, key, r, aic) {
  for (p in names(r$est)) res[[paste0(key, ".", p)]] <- r$est[[p]]
  if (!is.null(r$ll) && !is.na(r$ll)) res[[paste0(key, ".ll")]] <- r$ll
  for (g in names(r$gof)) res[[paste0(key, ".", g)]] <- r$gof[[g]]
  if (aic && !is.na(r$ll)) { res[[paste0(key, ".aic")]] <- 2 * r$k - 2 * r$ll; res[[paste0(key, ".bic")]] <- r$k * log(r$n) - 2 * r$ll }
  res
}
`;

/** How a result is redone in R. */
function howOf(r) {
  if (r.method.endsWith('.tml')) return 'tml';
  if (r.method.endsWith('.gml')) return 'gml';
  return { ml: 'ml', mom: 'mom', quantile: 'pct', lmom: 'lmom', logmom: 'logmom', qme: 'qme', mge: 'mge' }[r.estimator];
}
const rList = obj => `list(${Object.entries(obj).map(([k, v]) => `${k} = ${Array.isArray(v) ? rVec(v) : typeof v === 'string' ? rStr(v) : v == null ? 'NA' : rNum(v)}`).join(', ')})`;
/** Two significant digits: the start of R's optimiser (not the tool's answer; R has to find the optimum itself). */
const sig2 = v => Number(Number(v).toPrecision(2));

/** The settings and data part of a script: the same rows, units and diameters (or classes) as the page. */
export function dataBlock(s, R, T, hd, pool, f, g) {
  const out = [];
  out.push(rComment('Settings (as in the tool)'),
    `dec <- ${rStr(s.decimal)}; f_unit <- ${rNum(f)}   # decimal separator; ${s.unit === 'mm' ? 'mm → cm' : 'cm'}`,
    s.fcol != null && s.fval != null ? `keep <- dat[[${s.fcol + 1}]] == ${rStr(s.fval)}   # filter: ${hd(s.fcol)} = "${s.fval}"` : `keep <- rep(TRUE, nrow(dat))`,
    `plot_all <- ${pool ? 'rep("", nrow(dat))' : `trimws(dat[[${s.pcol + 1}]])`}   # ${pool ? 'all plots pooled' : 'plot' + ': ' + hd(s.pcol)}`,
    `per_all <- ${s.percol != null ? `{ v <- trimws(dat[[${s.percol + 1}]]); v[v == ""] <- NA; v }` : 'rep(NA_character_, nrow(dat))'}   # ${s.percol != null ? 'period' + ': ' + hd(s.percol) : 'no period'}`,
    `in_unit <- function(plot, period) keep & plot_all == plot & (if (is.na(period)) is.na(per_all) else per_all %in% period)`);
  if (!g) out.push(rComment('Diameters: unreadable and zero or negative values are counted and left out (never altered).'),
    `dn <- fb_num(dat[[${s.dcol + 1}]], dec); d_all <- dn$value * f_unit`,
    `use <- keep & dn$status == "ok" & d_all > 0`,
    `cat(${rStr('Diameters read: ')}, sum(use), ${rStr('; unreadable: ')}, sum(keep & dn$status != "ok"), ${rStr('; ≤ 0: ')}, sum(keep & dn$status == "ok" & !(d_all > 0)), "\\n")`,
    `fb_unit <- function(plot, period) d_all[use & in_unit(plot, period)]`, '');
  else out.push(rComment(`Classes: lower bound ${hd(s.lcol)}, upper bound ${hd(s.ucol)} (empty = open last class), frequency ${hd(s.ncol)}; identical classes are added. Count type: ${s.countType === 'perha' ? 'trees per hectare (no likelihood, no AIC)' : 'numbers of trees'}; outside the classes: ${s.outside === 'unrecorded' ? 'not recorded (conditional likelihood)' : 'measured, no trees'}.`),
    `lo_n <- fb_num(dat[[${s.lcol + 1}]], dec); hi_raw <- trimws(dat[[${s.ucol + 1}]]); hi_n <- fb_num(hi_raw, dec); n_n <- fb_num(dat[[${s.ncol + 1}]], dec)`,
    `hi_v <- ifelse(hi_raw == "", Inf, hi_n$value * f_unit); ok_c <- lo_n$status == "ok" & (hi_raw == "" | hi_n$status == "ok") & n_n$status == "ok"`,
    `fb_cls <- function(plot, period) { i <- keep & ok_c & in_unit(plot, period)`,
    `  a <- aggregate(n ~ lo + hi, data.frame(lo = lo_n$value[i] * f_unit, hi = hi_v[i], n = n_n$value[i]), sum); a[order(a$lo, a$hi), ] }`, '');
  return out;
}
/** The arguments of fb_run for a result: family, how, fixed parameters, start (2 significant digits), options. */
function fitArgs(r) {
  const fam = famOf(r.family), how = howOf(r), fix = Object.fromEntries(Object.entries(r.fixed || {}).map(([key, v]) => [key, v.value]));
  const start = Object.fromEntries(r.free.map(key => [key, sig2(r.params[key])])), st = r.settings || {};
  const opt = how === 'mom' ? { varDivisor: st.varDivisor || 'n' } : how === 'pct' ? { p: st.p, r: st.r } : how === 'qme' ? { probs: st.probs, weights: st.weights } : how === 'mge' ? { gof: st.gof }
    : how === 'tml' ? { lower: r.truncation && r.truncation.lower, upper: r.truncation && r.truncation.upper } : how === 'gml' ? { countType: st.countType, outside: st.outside } : {};
  return { fam, how, fix, start, opt };
}
/**
 * s = the page's settings { imp, src, decimal, unit, dcol, lcol, ucol, ncol, pcol, percol, fcol, fval, mode, dtype,
 * countType, outside }, R = the page's results { units: [{ plot, period, results }], grouped, pooled }, POOL = the pooled
 * unit's id, o = { lang, created, version, fileName }.
 */
export function buildR(s, R, POOL, o) {
  const T = (a, b) => (b), hd = c => c == null ? '' : String(s.src.headers[c]), g = !!R.grouped;
  const pool = s.mode === 'pool' || s.pcol == null, f = s.unit === 'mm' ? 0.1 : 1;
  const out = [];
  out.push(header({ title: 'Diameter Distribution Lab: R code (fitting)', tool: { id: 'cap-dagilimi', version: o.version }, created: o.created, lang: o.lang, packages: ['fitdistrplus'],
    notes: ['Stage 1: the fitting tab, from diameters or classes. The distributions are written in R with the tool\'s parameters (fb_<family>); ML, moments (mme), two percentiles (qme) and minimum distance (mge) by fitdistrplus; L-moments, log-moments, weighted quantile matching and the grouped-data likelihood written out in the script.',
    'R\'s optimiser (Nelder–Mead) starts from two significant digits of the tool\'s result and finds the optimum itself. Fit statistics KS D, A², W² with the tool\'s definitions; no p-values (parameters from the same data). AIC/BIC only for methods that maximise the likelihood. For classes fitdistcens is not used: it requires positive integer weights (no per-hectare counts, no empty classes).'] }));
  out.push(readBlock(s.imp, o.lang, o.fileName, s.decimal));
  out.push(FB_NUM, '', FB_OUT, '');
  out.push(...dataBlock(s, R, T, hd, pool, f, g));
  out.push(R_FAMILIES, R_METHODS, `res <- list()`, '');
  R.units.forEach((u, k) => {
    const okR = (u.results || []).map((r, j) => ({ r, j })).filter(x => x.r.status === 'ok');
    const name = `${u.plot === POOL ? 'all plots' : u.plot}${u.period != null ? ' · ' + u.period : ''}`;
    out.push(rComment(`Unit ${k + 1}: ${name}`),
      `x <- ${g ? 'fb_cls' : 'fb_unit'}(${rStr(u.plot === POOL ? '' : u.plot)}, ${u.period == null ? 'NA' : rStr(u.period)}); cat("\\n", ${rStr(name)}, ":", ${g ? 'sum(x$n), "trees,", nrow(x), "classes"' : 'length(x), "trees"'}, "\\n")`);
    const bad = (u.results || []).filter(r => r.status !== 'ok');
    if (bad.length) out.push(rComment(`No result in the tool (not fitted in R either): ${bad.map(r => `${r.method} (${r.status})`).join(', ')}`));
    for (const { r, j } of okR) {
      const { fam, how, fix, start, opt } = fitArgs(r);
      const key = `u${k + 1}.r${j + 1}`, aic = r.likelihoodMaximised && r.logLik != null;
      out.push(`r <- fb_run(x, ${rStr(fam.id)}, ${rStr(how)}, fix = ${rList(fix)}, start = ${rList(start)}, opt = ${rList(opt)})   # ${r.method}${Object.keys(fix).length ? ' ' + Object.entries(fix).map(([a, v]) => `${a} = ${v}`).join(', ') : ''}`,
        `print(signif(c(r$est, logLik = r$ll, r$gof), 8)); res <- fb_put(res, ${rStr(key)}, r, ${aic ? 'TRUE' : 'FALSE'})`);
    }
    out.push('');
  });
  out.push(`fb_out(res)`, '');
  return out.join('\n');
}

/** Bootstrap in R (stage 3a): the tool's generator mulberry32 with 32-bit arithmetic, so the same seed gives the same draws. */
const R_BOOT = String.raw`# ---- bootstrap (stage 3a): the tool's generator, the same draws for the same seed ----
u32 <- function(x) x %% 4294967296
i32 <- function(x) { x <- u32(x); as.integer(ifelse(x >= 2147483648, x - 4294967296, x)) }
xor32 <- function(a, b) u32(bitwXor(i32(a), i32(b)))
or32 <- function(a, b) u32(bitwOr(i32(a), i32(b)))
shr32 <- function(a, n) u32(bitwShiftR(i32(a), n))
imul32 <- function(a, b) { a <- u32(a); b <- u32(b); lo <- a %% 65536; hi <- (a - lo) / 65536; u32(lo * b + ((hi * b) %% 65536) * 65536) }
# mulberry32(seed) (core/stats.js rng); a uniform u = (k + 0.5)/2^32 never hits 0 or 1
fb_rng <- function(seed) { a <- u32(seed); function() { a <<- u32(a + 1831565813); t <- a
  t <- imul32(xor32(t, shr32(t, 15)), or32(t, 1)); t <- xor32(t, u32(t + imul32(xor32(t, shr32(t, 7)), or32(t, 61)))); k <- xor32(t, shr32(t, 14)); (k + 0.5) / 4294967296 } }
fb_round <- function(x, step) if (is.na(step)) x else floor(x / step + 0.5) * step
# quantile of the observed model: the family, or the family conditional on [L, U] (thresholds; classes: first to last class)
fb_qobs <- function(fam, par, L, U) { q <- fb_fn(fam, "q"); p <- fb_fn(fam, "p")
  if (is.na(L) && is.na(U)) return(function(u) fb_call(q, u, par))
  FL <- if (is.na(L)) 0 else fb_call(p, L, par); FU <- if (is.na(U)) 1 else fb_call(p, U, par)
  if (is.na(L) || FL < 0.5) function(u) fb_call(q, FL + u * (FU - FL), par) else function(u) fb_call(q, 1 - ((1 - FU) + (1 - u) * (FU - FL)), par) }
fb_pobs <- function(fam, par, L, U) { p <- fb_fn(fam, "p"); FL <- if (is.na(L)) 0 else fb_call(p, L, par); FU <- if (is.na(U)) 1 else fb_call(p, U, par)
  function(x) pmin(pmax((fb_call(p, x, par) - FL) / (FU - FL), 0), 1) }
# one simulated data set from the fitted observation model (same size, same rounding; classes: draws in a gap are redrawn)
fb_sim <- function(x, fam, par, L, U, step, rnd) {
  if (is.data.frame(x)) { last <- x$hi[nrow(x)]; Q <- fb_qobs(fam, par, x$lo[1], if (is.finite(last)) last else NA); cnt <- rep(0, nrow(x)); i <- 0
    while (i < sum(x$n)) { v <- Q(rnd()); j <- which(v >= x$lo & v < x$hi); if (length(j)) { cnt[j] <- cnt[j] + 1; i <- i + 1 } }
    y <- x; y$n <- cnt; return(y) }
  Q <- fb_qobs(fam, par, L, U); fb_round(sapply(seq_along(x), function(i) Q(rnd())), step) }
# statistics against the observation model: KS, A², W² (raw), Pearson X² (classes, conditional on the listed classes)
fb_stats <- function(x, fam, par, L, U) {
  if (is.data.frame(x)) { last <- x$hi[nrow(x)]; P <- fb_pobs(fam, par, x$lo[1], if (is.finite(last)) last else NA); pr <- ifelse(is.finite(x$hi), P(x$hi), 1) - P(x$lo); e <- sum(x$n) * pr / sum(pr); return(c(x2 = sum((x$n - e)^2 / e))) }
  fb_gof(x, fb_pobs(fam, par, L, U)) }
fb_refit <- function(y, fam, how, fix, start, opt) tryCatch(fb_run(y, fam, how, fix, start, opt), error = function(e) NULL)
fb_boot <- function(kind, x, fam, how, fix, par, opt, L, U, B, seed, step, scheme = "parametric", level = 0.95, probs = c(0.25, 0.5, 0.75, 0.95)) {
  rnd <- fb_rng(seed); free <- setdiff(fb_pars[[fam]], names(fix)); start <- par[free]; T0 <- fb_stats(x, fam, par, L, U)
  ge <- setNames(rep(0, length(T0)), names(T0)); est <- list(); ok <- 0
  for (b in seq_len(B)) {
    y <- if (scheme == "nonparametric") x[floor(sapply(seq_along(x), function(i) rnd()) * length(x)) + 1] else fb_sim(x, fam, par, L, U, step, rnd)
    rb <- fb_refit(y, fam, how, fix, start, opt); if (is.null(rb) || any(!is.finite(rb$est[free]))) next
    ok <- ok + 1
    if (kind == "gof") { Tb <- fb_stats(y, fam, as.list(rb$est), L, U); ge <- ge + (Tb >= T0) }
    else est[[ok]] <- c(rb$est[free], setNames(fb_call(fb_fn(fam, "q"), probs, as.list(rb$est)), paste0("Q", probs)))
  }
  if (kind == "gof") return(list(completed = ok, t0 = T0, ge = ge, p = (1 + ge) / (ok + 1)))
  E <- do.call(rbind, est); a <- (1 - level) / 2
  list(completed = ok, lo = apply(E, 2, function(v) fb_q7(v, a)), hi = apply(E, 2, function(v) fb_q7(v, 1 - a)), se = apply(E, 2, sd), mean = colMeans(E))
}
`;

/**
 * Bootstrap script for one fit of one unit (the boot tab): s, R, POOL as buildR; k = the unit's index, r = the result,
 * runs = [{ kind: 'gof'|'ci', B, seed, step (cm or null), scheme, level }] (the runs done on the page), o as buildR.
 */
export function buildBootR(s, R, POOL, k, r, runs, o) {
  const T = (a, b) => (b), hd = c => c == null ? '' : String(s.src.headers[c]), g = !!R.grouped;
  const pool = s.mode === 'pool' || s.pcol == null, f = s.unit === 'mm' ? 0.1 : 1, u = R.units[k], out = [];
  const name = `${u.plot === POOL ? 'all plots' : u.plot}${u.period != null ? ' · ' + u.period : ''}`;
  out.push(header({ title: 'Diameter Distribution Lab: R code (bootstrap)', tool: { id: 'cap-dagilimi', version: o.version }, created: o.created, lang: o.lang, packages: ['fitdistrplus'],
    notes: [`Stage 3a: the bootstrap of one fit (${r.method}) of one unit (${name}). The generator is the tool's (mulberry32, 32-bit arithmetic): the same seed gives the same draws. The draws come from the tool's estimates (for the same samples); R's own estimate is printed beside them.`,
    'Parametric: every replicate is drawn from the fitted observation model (the conditional distribution under thresholds, class counts for classes) with the same measurement rounding and refitted with the same method; p = (1 + #{T_b ≥ T_0})/(B_ok + 1). Non-parametric: trees resampled with replacement within the unit. Percentile intervals (type 7). Replicates whose refit fails are counted and left out.'] }));
  out.push(readBlock(s.imp, o.lang, o.fileName, s.decimal), FB_NUM, '', FB_OUT, '', ...dataBlock(s, R, T, hd, pool, f, g), R_FAMILIES, R_METHODS, R_BOOT, `res <- list()`, '');
  const { fam, how, fix, start, opt } = fitArgs(r), L = r.truncation ? r.truncation.lower : null, U = r.truncation ? r.truncation.upper : null;
  out.push(rComment(`Unit: ${name}; ${r.method}`),
    `x <- ${g ? 'fb_cls' : 'fb_unit'}(${rStr(u.plot === POOL ? '' : u.plot)}, ${u.period == null ? 'NA' : rStr(u.period)})`,
    `r0 <- fb_run(x, ${rStr(fam.id)}, ${rStr(how)}, fix = ${rList(fix)}, start = ${rList(start)}, opt = ${rList(opt)})   # R's own estimate`,
    `par <- ${rList(Object.fromEntries(fam.params.map(q => [q.key, r.params[q.key]])))}   # the tool's estimates: the draws come from these`,
    `print(rbind(tool = unlist(par)[names(r0$est)], R = r0$est))`,
    `fix <- ${rList(fix)}; opt <- ${rList(opt)}; L <- ${L == null ? 'NA' : rNum(L)}; U <- ${U == null ? 'NA' : rNum(U)}`, '');
  for (const run of runs) {
    const tag = run.kind === 'gof' ? 'gof' : `ci.${run.scheme === 'nonparametric' ? 'np' : 'p'}`;
    out.push(rComment(run.kind === 'gof' ? `Parametric bootstrap p-values: B = ${run.B}, seed ${run.seed}, rounding ${run.step == null ? 'none' : run.step + ' cm'}`
      : `Bootstrap percentile intervals (${run.scheme}): B = ${run.B}, seed ${run.seed}, level ${run.level}`),
      `b <- fb_boot(${rStr(run.kind)}, x, ${rStr(fam.id)}, ${rStr(how)}, fix, par, opt, L, U, B = ${run.B}, seed = ${run.seed}, step = ${run.step == null ? 'NA' : rNum(run.step)}${run.kind === 'ci' ? `, scheme = ${rStr(run.scheme)}, level = ${rNum(run.level)}` : ''})`,
      `str(b); res[[${rStr(tag + '.completed')}]] <- b$completed`,
      run.kind === 'gof' ? `for (k in names(b$p)) { res[[paste0("gof.", k, ".ge")]] <- b$ge[[k]]; res[[paste0("gof.", k, ".p")]] <- b$p[[k]] }`
        : `for (k in names(b$lo)) for (q in c("lo", "hi", "se", "mean")) res[[paste0(${rStr(tag + '.')}, k, ".", q)]] <- b[[q]][[k]]`, '');
  }
  out.push(`fb_out(res)`, '');
  return out.join('\n');
}
