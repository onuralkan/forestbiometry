// Diameter Distribution Lab: the "R code" script for stand models, stages 3b (training and prediction) and 3c
// (plot-level cross-validation and the CDF fits; user decisions 19 Nov 2026). It redoes the page's training in R: the
// same units (plot × period) with their stand variables (one positive value per unit), the same training targets (PPM:
// Weibull ML with the fixed location, by fitdistrplus; PRM: moments, Dq, Dmin, percentiles type 7 of the recovery method),
// the model form of Poudel and Cao (2013) y = exp(β₁ + β₂·RS + β₃·ln N + β₄·ln H + β₅/A) per response by NLS (nls),
// iterated SUR (whitened stacked nls) or OLS on ln y (lm.fit), or by CDFR / modified CDFR (the distance between observed
// and predicted cumulative distributions over all units, Levenberg–Marquardt written out, recovery at every step); the
// training RMSE and bias; the K-fold cross-validation with the tool's assignment of plots to folds (negative
// log-likelihood and KS D of every held-out unit); and the prediction for the stand typed on the prediction tab with
// the recovery of the parameters by the stage 2 code. No DOM.
import { header, readBlock, FB_NUM, FB_OUT, rStr, rNum, rVec, rComment } from '../core/rcode.js';
import { dataBlock, R_FAMILIES, R_METHODS } from './rcode.js';
import { recoverBody, R_SB } from './rcode-rec.js';
import { natural } from './data.js';

const R_STAND = String.raw`# ---- stand models ----
fb_design <- function(x, terms) { v <- list(RS = sqrt(10000 / x$N) / x$H, lnN = log(x$N), lnH = log(x$H), invA = 1 / x$A)
  cbind(1, do.call(cbind, v[terms])) }
fb_nls_exp <- function(Z, y) {   # y = exp(Zβ) + ε by nls (gradient written out), started from OLS on ln y
  b0 <- unname(lm.fit(Z, log(y))$coefficients); f <- function(b) { e <- exp(drop(Z %*% b)); attr(e, "gradient") <- e * Z; e }
  m <- nls(y ~ f(b), data = list(y = y), start = list(b = b0), control = nls.control(maxiter = 1000, tol = 1e-10, minFactor = 1e-12, warnOnly = TRUE))
  unname(coef(m)) }
# iterated SUR: Σ from the residuals (divisor n), residuals whitened with W = L⁻¹ (Σ = LLᵀ), the stacked problem by nls,
# repeated until the coefficients change by less than 1e-10 (relative) or 100 rounds (one round when iterate is FALSE)
fb_sur <- function(Z, Y, iterate = TRUE) {
  K <- ncol(Y); p <- ncol(Z); n <- nrow(Y); B <- sapply(seq_len(K), function(k) fb_nls_exp(Z, Y[, k]))
  for (round in 1:100) {
    Fm <- exp(Z %*% B); S <- crossprod(Y - Fm) / n; W <- solve(t(chol(S))); z <- as.vector(Y %*% t(W))
    f <- function(b) { Bm <- matrix(b, p, K); Fm <- exp(Z %*% Bm); v <- as.vector(Fm %*% t(W))
      attr(v, "gradient") <- do.call(rbind, lapply(seq_len(K), function(k) do.call(cbind, lapply(seq_len(K), function(l) W[k, l] * Fm[, l] * Z)))); v }
    m <- nls(z ~ f(b), data = list(z = z), start = list(b = as.vector(B)), control = nls.control(maxiter = 1000, tol = 1e-10, minFactor = 1e-12, warnOnly = TRUE))
    Bn <- matrix(unname(coef(m)), p, K); change <- max(abs(Bn - B) / pmax(abs(B), 1e-8)); B <- Bn
    if (!iterate || change < 1e-10) break }
  list(B = B, Sigma = crossprod(Y - exp(Z %*% B)) / n, rounds = round)
}
# Weibull recovery of the stand models (Poudel and Cao M2–M9 with location a): one root required, otherwise NULL
G <- function(r, c) gamma(1 + r / c)
Bq <- function(c, a, q) { g1 <- G(1, c); g2 <- G(2, c); (-a * g1 + sqrt(a^2 * g1^2 + g2 * (q^2 - a^2))) / g2 }
fb_roots <- function(h) { xs <- 0.05 * (200 / 0.05)^((0:600) / 600); ys <- sapply(xs, h); r <- c()
  for (i in 1:600) { if (ys[i] == 0) r <- c(r, xs[i]) else if (is.finite(ys[i]) && is.finite(ys[i + 1]) && ys[i] * ys[i + 1] < 0) r <- c(r, uniroot(h, xs[i:(i + 1)], tol = 1e-15)$root) }
  if (ys[601] == 0) r <- c(r, xs[601]); r[c(TRUE, diff(r) > 1e-9 * r[-length(r)])] }
fb_wb <- function(id, s, a) {
  A <- function(p) -log1p(-p)
  pc <- function(qp, qr, p, r) if (qp > a && qr > qp) log(A(r) / A(p)) / log((qr - a) / (qp - a)) else NA
  one <- function(cs, sc) { if (!length(cs)) return(NULL); b <- sapply(cs, sc); ok <- is.finite(b) & b > 0; if (sum(ok) == 1) c(a = a, b = b[ok], c = cs[ok]) else NULL }
  if (id %in% c("m4", "m5")) { pr <- if (id == "m4") c(0.31, 0.63) else c(0.5, 0.95); qp <- s[[paste0("q", round(100 * pr[1]))]]; qr <- s[[paste0("q", round(100 * pr[2]))]]
    c_ <- pc(qp, qr, pr[1], pr[2]); return(if (is.na(c_)) NULL else c(a = a, b = (qp - a) / A(pr[1])^(1 / c_), c = c_)) }
  if (id %in% c("m6", "m7")) { pr <- if (id == "m6") c(0.25, 0.95) else c(0.31, 0.63); c_ <- pc(s[[paste0("q", round(100 * pr[1]))]], s[[paste0("q", round(100 * pr[2]))]], pr[1], pr[2])
    return(if (is.na(c_) || !(s$dq > a)) NULL else c(a = a, b = Bq(c_, a, s$dq), c = c_)) }
  if (id == "m2") return(if (s$mean > a) { sc <- function(c) (s$mean - a) / G(1, c); one(fb_roots(function(c) sc(c)^2 * (G(2, c) - G(1, c)^2) / s$variance - 1), sc) })
  if (id == "m3") return(if (s$dq > a) { sc <- function(c) Bq(c, a, s$dq); one(fb_roots(function(c) sc(c)^2 * (G(2, c) - G(1, c)^2) / s$variance - 1), sc) })
  sc <- function(c) (s$q95 - a) / A(0.95)^(1 / c)
  if (id == "m8") return(if (s$mean > a && s$q95 > a) one(fb_roots(function(c) (a + sc(c) * G(1, c)) / s$mean - 1), sc))
  if (id == "m9") return(if (s$dq > a && s$q95 > a) one(fb_roots(function(c) (a^2 + 2 * a * sc(c) * G(1, c) + sc(c)^2 * G(2, c)) / s$dq^2 - 1), sc))
  NULL
}
# Levenberg–Marquardt on a residual vector R(θ) (forward-difference Jacobian; R(θ) = NULL marks an infeasible β: the step
# is rejected and counted); convergence as the tool: relative step ≤ 1e-10, a small relative decrease with a small step,
# or scaled gradient ≤ 1e-8
fb_lm <- function(R, th0) {
  th <- th0; r <- R(th); if (is.null(r)) return(NULL); p <- length(th); rejected <- 0
  jac <- function(th, r) { J <- matrix(0, length(r), p); for (j in seq_len(p)) { h <- 1e-7 * max(1, abs(th[j])); t <- th; t[j] <- t[j] + h; rj <- R(t)
    if (is.null(rj)) { h <- -h; t[j] <- th[j] + h; rj <- R(t) }; if (is.null(rj)) return(NULL); J[, j] <- (rj - r) / h }; J }
  S <- sum(r^2); J <- jac(th, r); A <- crossprod(J); g <- -drop(crossprod(J, r)); lambda <- 1e-3 * max(diag(A)); nu <- 2
  gradOk <- function() all(abs(g) <= 1e-8 * sqrt(pmax(diag(A), 1e-300) * max(S, 1e-300)))
  for (iter in 1:300) {
    if (gradOk()) break
    M <- A; diag(M) <- diag(A) + lambda * pmax(diag(A), 1e-12); d <- tryCatch(solve(M, g), error = function(e) NULL)
    if (is.null(d)) { lambda <- lambda * nu; nu <- nu * 2; next }
    cand <- th + d; rc <- R(cand); Sc <- if (is.null(rc)) Inf else sum(rc^2); if (is.null(rc)) rejected <- rejected + 1
    stepRel <- max(abs(d)) / (max(abs(th)) + 1e-10)
    if (Sc < S) { old <- S; th <- cand; r <- rc; S <- Sc; J <- jac(th, r); A <- crossprod(J); g <- -drop(crossprod(J, r)); lambda <- max(lambda / 3, 1e-12); nu <- 2
      if (stepRel <= 1e-10 || ((old - S) <= 1e-14 * old && stepRel <= 1e-6)) break }
    else { lambda <- lambda * nu; nu <- nu * 2; if (lambda > 1e20) break } }
  list(theta = th, S = S, iter = iter, rejected = rejected)
}
`;

/** The training, prediction, CDF and validation functions of the script, for the model's settings. */
function rFunctions(model, T) {
  const keys = model.keys, approach = model.approach, opt = model.options, out = [];
  const id = model.method ? model.method.replace('weibull.', '') : null;
  // targets
  if (approach === 'ppm') {
    const half = opt.ppmLoc === 'half-dmin';
    out.push(rComment(`Targets (PPM): Weibull ML per unit, location ${half ? 'a = Dmin/2' : `a = ${opt.a}`} fixed; start from the moments.`),
      `fb_target <- function(d) { a <- ${half ? '0.5 * min(d)' : rNum(opt.a)}; x <- d - a; m <- mean(x); v <- mean((x - m)^2)
  c0 <- uniroot(function(c) gamma(1 + 2 / c) / gamma(1 + 1 / c)^2 - 1 - v / m^2, c(0.05, 200))$root
  r <- tryCatch(fb_run(d, "weibull", "ml", fix = list(a = a), start = list(b = m / gamma(1 + 1 / c0), c = c0)), error = function(e) NULL)
  if (is.null(r)) NULL else c(b = r$est[["b"]], c = r$est[["c"]]${half ? ', dmin = min(d)' : ''}) }`);
  } else out.push(rComment('Targets (PRM): mean, moment variance (divisor n), Dq, Dmin, percentiles (type 7).'),
    `fb_target <- function(d) { s <- sort(d); m <- mean(d); v <- mean((d - m)^2)
  t <- c(${keys.map(k => `${k} = ${{ mean: 'm', variance: 'v', dq: 'sqrt(m^2 + v)', dmin: 's[1]', median: 'fb_q7(s, 0.5)', q25: 'fb_q7(s, 0.25)', q31: 'fb_q7(s, 0.31)', q50: 'fb_q7(s, 0.5)', q63: 'fb_q7(s, 0.63)', q95: 'fb_q7(s, 0.95)' }[k]}`).join(', ')})
  if (all(is.finite(t) & t > 0)) t else NULL }`);
  // parameters from the predicted responses (checks as the tool: percentiles in order, Dq > mean, Dmin below the first percentile)
  const ord = ['q25', 'q31', 'q50', 'q63', 'q95'].filter(k => keys.includes(k));
  const checks = [...ord.slice(1).map((k, i) => `resp[["${k}"]] > resp[["${ord[i]}"]]`), ...(keys.includes('dq') && keys.includes('mean') ? ['resp[["dq"]] > resp[["mean"]]'] : []), ...(keys.includes('dmin') && ord.length ? [`resp[["dmin"]] < resp[["${ord[0]}"]]`] : [])];
  out.push(`fb_resp <- function(model, x) { z <- fb_design(x, terms); r <- sapply(seq_len(ncol(model$B)), function(k) exp(sum(z * model$B[, k])) * model$back[k]); names(r) <- keys; r }`,
    `fb_params <- function(model, x) { resp <- fb_resp(model, x)${checks.length ? `\n  if (!(${checks.join(' && ')})) return(NULL)` : ''}`,
    approach === 'ppm' ? `  c(a = ${opt.ppmLoc === 'half-dmin' ? '0.5 * resp[["dmin"]]' : rNum(opt.a)}, b = resp[["b"]], c = resp[["c"]]) }`
      : model.family === 'weibull' ? `  fb_wb(${rStr(id)}, as.list(resp), ${opt.loc === 'user' ? rNum(opt.aUser) : '0.5 * resp[["dmin"]]'}) }`
        : `  fb_prs(as.list(resp), ${rNum(opt.xi)}) }`);
  if (model.family === 'johnsonsb') out.push(R_SB,
    `fb_prs <- function(s, xi) { par_of <- function(x) { lambda <- (s$median - xi) + exp(x[1]); delta <- exp(x[2]); c(xi = xi, lambda = lambda, gamma = delta * log((xi + lambda - s$median) / (s$median - xi)), delta = delta) }
  if (!(s$median > xi)) return(NULL)
  F <- function(x) { p <- par_of(x); u1 <- fb_sbY(p[["gamma"]], p[["delta"]], 1); u2 <- fb_sbY(p[["gamma"]], p[["delta"]], 2)
    c((xi + p[["lambda"]] * u1) / s$mean - 1, (xi^2 + 2 * xi * p[["lambda"]] * u1 + p[["lambda"]]^2 * u2) / s$dq^2 - 1) }
  st <- lapply(list(c(0.25, 0.3), c(0.25, 1), c(0.25, 3), c(1, 0.3), c(1, 1), c(1, 3), c(4, 0.3), c(4, 1), c(4, 3), c(16, 0.3), c(16, 1), c(16, 3)), function(v) c(log(v[1] * (s$median - xi)), log(v[2])))
  sols <- fb_solve(F, st, par_of); if (length(sols) == 1) sols[[1]] else NULL }`);
  // training
  out.push(`fb_train <- function(units) {
  rows <- Filter(Negate(is.null), lapply(units, function(u) { if (!all(sapply(need, function(k) !is.null(u$x[[k]])))) return(NULL); t <- fb_target(u$d); if (is.null(t)) NULL else list(u = u, t = t) }))
  if (length(unique(sapply(rows, function(r) r$u$plot))) < 2 || length(rows) <= length(terms) + 1) return(NULL)
  Z <- do.call(rbind, lapply(rows, function(r) fb_design(r$u$x, terms))); Y <- do.call(rbind, lapply(rows, function(r) r$t[keys]))
  back <- rep(1, length(keys)); rounds <- NA
  ${model.fit === 'sur' ? 'f <- fb_sur(Z, Y, iterate = TRUE); B <- f$B; rounds <- f$rounds'
    : model.fit === 'logols' ? `B <- sapply(seq_len(ncol(Y)), function(k) unname(lm.fit(Z, log(Y[, k]))$coefficients))${opt.back === 'mean' ? `
  back <- exp(sapply(seq_len(ncol(Y)), function(k) sum((log(Y[, k]) - Z %*% B[, k])^2) / (nrow(Z) - ncol(Z))) / 2)   # mean: exp(Zβ + s²/2)` : `   # median: exp(Zβ)`}`
      : 'B <- sapply(seq_len(ncol(Y)), function(k) fb_nls_exp(Z, Y[, k]))'}
  model <- list(B = B, back = back, rows = rows, Z = Z, Y = Y, rounds = rounds)${model.fit === 'cdfr' || model.fit === 'mcdfr' ? '\n  model <- fb_cdf(model)' : ''}
  model }`);
  if (model.fit === 'cdfr' || model.fit === 'mcdfr') {
    const w = model.cdf && model.cdf.width != null ? model.cdf.width : 2;
    out.push(rComment(model.fit === 'cdfr'
      ? 'CDFR (source): Σᵢ (1/nᵢ) Σⱼ [(j − 0.5)/nᵢ − F(dᵢ₍ⱼ₎; θᵢ)]², θᵢ the parameters the model predicts for unit i (by recovery for PRM). The Dmin equation is fitted by NLS and held fixed. A β where a recovery fails or has several roots is infeasible: the step is rejected.'
      : `Modified CDFR (source): Σᵢ 1/(mᵢ − 1) Σ_{j<mᵢ} [Cᵢⱼ − F(uᵢⱼ; θᵢ)]², classes of width ${w} cm from ⌊min/w⌋·w, uᵢⱼ the class upper bound, Cᵢⱼ the observed cumulative proportion; the last class is left out of the objective only; a unit with one class is left out.`),
      `fb_cdf <- function(model) {
  rows <- model$rows; free <- which(keys != "dmin"); p <- nrow(model$B); w <- ${rNum(w)}
  obs <- do.call(rbind, lapply(seq_along(rows), function(i) { d <- sort(rows[[i]]$u$d); n <- length(d)
    ${model.fit === 'cdfr' ? 'data.frame(i = i, x = d, y = (seq_len(n) - 0.5) / n, w = 1 / n)'
      : `lo0 <- floor(min(d) / w) * w; m <- floor((max(d) - lo0) / w) + 1; if (m < 2) return(NULL)
    cnt <- tabulate(pmin(m, floor((d - lo0) / w) + 1), m); data.frame(i = i, x = lo0 + (1:(m - 1)) * w, y = cumsum(cnt)[1:(m - 1)] / n, w = 1 / (m - 1))`} }))
  as_model <- function(th) { M <- model; M$B[, free] <- matrix(th, p, length(free)); M }
  R <- function(th) { M <- as_model(th); ps <- lapply(rows, function(r) fb_params(M, r$u$x)); if (any(sapply(ps, is.null))) return(NULL)
    sqrt(obs$w) * (obs$y - mapply(function(i, x) pweibull(x - ps[[i]][["a"]], shape = ps[[i]][["c"]], scale = ps[[i]][["b"]]), obs$i, obs$x)) }
  r0 <- R(as.vector(model$B[, free])); if (is.null(r0)) return(NULL)
  o <- fb_lm(R, as.vector(model$B[, free])); if (is.null(o)) return(NULL)
  M <- as_model(o$theta); M$cdf <- c(start = sum(r0^2), objective = o$S, iter = o$iter, rejected = o$rejected); M }`);
  }
  return out;
}

/**
 * s = the page's settings { imp, src, decimal, unit, dcol, pcol, percol, fcol, fval, cols: { N, H, A } }, cfg = the
 * stand-model settings (standCfg of ui.js), model = the trained model (stand.js train/exportModel), cv = the tool's
 * cross-validation ({ K, assignment }) or null, x = the stand variables of the prediction tab ({ N, H, A }) or null,
 * pred = the tool's prediction for x or null, o = { lang, created, version, fileName }.
 */
export function buildStandR(s, cfg, model, x, pred, o, cv = null) {
  const T = (a, b) => (b), hd = c => c == null ? '' : String(s.src.headers[c]), out = [];
  const set = model.set, approach = model.approach, keys = model.keys, terms = model.terms, sb = model.family === 'johnsonsb';
  out.push(header({ title: 'Diameter Distribution Lab: R code (stand model)', tool: { id: 'cap-dagilimi', version: o.version }, created: o.created, lang: o.lang,
    packages: ['fitdistrplus', ...(sb ? ['nleqslv'] : [])],
    notes: [`Stages 3b–3c: stand model training, plot-level cross-validation and prediction. Response set ${set}; terms ${terms.join(', ')}; method ${model.fit}. Model form (Poudel and Cao 2013): y = exp(β₁ + β₂·RS + β₃·ln N + β₄·ln H + β₅/A), RS = √(10000/N)/H; additive error on the original scale (multiplicative for log-OLS).`] }));
  out.push(readBlock(s.imp, o.lang, o.fileName, s.decimal), FB_NUM, '', FB_OUT, '');
  out.push(...dataBlock({ ...s, mode: 'each' }, null, T, hd, false, s.unit === 'mm' ? 0.1 : 1, false), R_FAMILIES, R_METHODS, R_STAND, `res <- list()`, '');
  const cols = Object.entries(s.cols || {}).filter(([, c]) => c != null);
  out.push(rComment('Units: plot × period; a stand variable must be the same single positive number on every row of the unit (else the unit is left out).'),
    `stand_cols <- c(${cols.map(([k, c]) => `${k} = ${c + 1}`).join(', ')})   # ${cols.map(([k, c]) => `${k}: ${hd(c)}`).join(', ')}`,
    `ids <- unique(data.frame(plot = plot_all, period = per_all)[use, ])`,
    `units <- lapply(seq_len(nrow(ids)), function(i) { r <- use & in_unit(ids$plot[i], ids$period[i]); x <- list(); ok <- TRUE
  for (k in names(stand_cols)) { v <- fb_num(dat[[stand_cols[[k]]]][r], dec); u <- unique(v$value) ; if (any(v$status != "ok") || length(u) != 1 || !(u > 0)) ok <- FALSE else x[[k]] <- u }
  list(plot = ids$plot[i], period = ids$period[i], d = d_all[r], x = x, ok = ok) })`,
    `units <- Filter(function(u) u$ok, units); cat(${rStr('Units: ')}, length(units), "\\n")`,
    `terms <- ${rVec(terms, rStr)}; keys <- ${rVec(keys, rStr)}; need <- ${rVec([...new Set(terms.flatMap(t => ({ RS: ['N', 'H'], lnN: ['N'], lnH: ['H'], invA: ['A'] })[t]))], rStr)}`, '');
  out.push(...rFunctions(model, T), '');
  out.push(rComment('Training: all units'),
    `model <- fb_train(units); B <- model$B; colnames(B) <- keys; print(B)`,
    `cat(${rStr('Training units: ')}, nrow(model$Y), ${rStr('; plots: ')}, length(unique(sapply(model$rows, function(r) r$u$plot))), "\\n")`,
    ...(model.fit === 'sur' ? ['cat("SUR rounds:", model$rounds, "\\n")'] : []),
    ...(model.fit === 'cdfr' || model.fit === 'mcdfr' ? ['print(model$cdf); res[["cdf.start"]] <- model$cdf[["start"]]; res[["cdf.objective"]] <- model$cdf[["objective"]]'] : []),
    `for (k in seq_len(ncol(B))) { pr <- exp(drop(model$Z %*% B[, k])) * model$back[k]; r <- model$Y[, k] - pr; key <- keys[k]`,
    `  for (j in seq_len(nrow(B))) res[[paste0(key, ".b", j)]] <- unname(B[j, k]); res[[paste0(key, ".rmse")]] <- sqrt(mean(r^2)); res[[paste0(key, ".bias")]] <- mean(r) }`, '');
  // cross-validation
  const plots = [...new Set((model.trainingUnits || []).map(u => u.plot))];
  const asg = cv && cv.assignment ? cv.assignment : null;
  if (asg) {
    out.push(rComment(`Plot-level cross-validation (K = ${cv.K}): plots in natural order, plot j to fold j mod K (the tool's assignment; all periods of a plot in one fold). In each fold the model is trained on the other folds only; for every held-out unit −ln L and KS D under the predicted distribution. Failed predictions are counted.`),
      `fold <- c(${Object.entries(asg).sort((a, b) => natural(a[0], b[0])).map(([pl, f]) => `${rStr(pl)} = ${f}`).join(', ')})`,
      `cvu <- list()`,
      `for (f in sort(unique(fold))) {
  tr_ <- Filter(function(u) fold[[u$plot]] != f, units); te_ <- Filter(function(u) fold[[u$plot]] == f, units); m <- fb_train(tr_)
  for (u in te_) { p <- if (is.null(m)) NULL else fb_params(m, u$x)
    if (is.null(p)) { cvu[[length(cvu) + 1]] <- list(ok = FALSE); next }
    ${sb ? 'll <- dfb_johnsonsb(u$d, p[["xi"]], p[["lambda"]], p[["gamma"]], p[["delta"]], log = TRUE); pf <- function(q) pfb_johnsonsb(q, p[["xi"]], p[["lambda"]], p[["gamma"]], p[["delta"]])'
      : 'll <- dweibull(u$d - p[["a"]], shape = p[["c"]], scale = p[["b"]], log = TRUE); pf <- function(q) pweibull(q - p[["a"]], shape = p[["c"]], scale = p[["b"]])'}
    nll <- -sum(ll); cvu[[length(cvu) + 1]] <- list(ok = is.finite(nll), n = length(u$d), nll = nll, ks = fb_gof(u$d, pf)[["ks"]]) } }`,
      `ok <- Filter(function(r) r$ok, cvu); cat(${rStr('Cross-validation: ')}, length(ok), "/", length(cvu), ${rStr(' units; −ln L per tree ')}, mean(sapply(ok, function(r) r$nll / r$n)), " KS ", mean(sapply(ok, function(r) r$ks)), "\\n")`,
      `res[["cv.units"]] <- length(cvu); res[["cv.ok"]] <- length(ok); res[["cv.nll"]] <- sum(sapply(ok, function(r) r$nll)); res[["cv.nllPerTree"]] <- mean(sapply(ok, function(r) r$nll / r$n)); res[["cv.ks"]] <- mean(sapply(ok, function(r) r$ks))`, '');
  }
  void plots;
  // prediction
  if (x) {
    out.push(rComment('Prediction: the stand variables of the prediction tab'),
      `x0 <- ${`list(${Object.entries(x).filter(([, v]) => Number.isFinite(v)).map(([k, v]) => `${k} = ${rNum(v)}`).join(', ')})`}`,
      `resp <- fb_resp(model, x0); print(resp); for (k in names(resp)) res[[paste0("pred.", k)]] <- resp[[k]]`);
    if (approach === 'ppm') out.push(`p <- c(a = ${model.options.ppmLoc === 'half-dmin' ? '0.5 * resp[["dmin"]]' : rNum(model.options.a)}, b = resp[["b"]], c = resp[["c"]]); print(p); for (k in names(p)) res[[paste0("pred.param.", k)]] <- p[[k]]`);
    else if (model.family === 'weibull') out.push(...recoverBody('weibull', null, model.options.loc === 'user' ? { loc: 'user', a: model.options.aUser } : { loc: 'half-dmin' }, [{ method: model.method }], T, 'as.list(resp)'));
    else out.push(...recoverBody('parresol', null, {}, [{ method: 'johnsonsb.parresol' }], T, `c(list(xi = ${rNum(model.options.xi)}), as.list(resp))`));
    if (pred && pred.status !== 'ok') out.push(rComment(`In the tool the prediction was not valid (${pred.status}): inconsistent responses or no recovery; R does the same computation, keep that in mind when reading it.`));
  }
  out.push('', `fb_out(res)`, '');
  return out.join('\n');
}
