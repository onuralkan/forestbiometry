// Diameter Distribution Lab: the "R code" script, stage 3b (stand models: training and prediction; user decision
// 19 Nov 2026). It redoes the training of the page in R: the same units (plot × period) with their stand variables (one
// positive value per unit), the same training targets (PPM: Weibull ML with the fixed location, by fitdistrplus; PRM:
// moments, Dq, Dmin, percentiles type 7 of the recovery method), the model form of Poudel and Cao (2013)
// y = exp(β₁ + β₂·RS + β₃·ln N + β₄·ln H + β₅/A) per response by NLS (nls), iterated SUR (whitened stacked nls) or OLS on
// ln y (lm.fit), the training RMSE and bias; and the prediction for the stand variables typed on the prediction tab,
// with the recovery of the parameters by the stage 2 code. Plot-level cross-validation and the CDF fits (CDFR, modified
// CDFR) are stage 3c. No DOM.
import { header, readBlock, FB_NUM, FB_OUT, rStr, rNum, rVec, rComment } from '../core/rcode.js';
import { dataBlock, R_FAMILIES, R_METHODS } from './rcode.js';
import { recoverBody } from './rcode-rec.js';

const R_STAND = String.raw`# ---- stand models (stage 3b) ----
fb_design <- function(x, terms) { v <- list(RS = sqrt(10000 / x$N) / x$H, lnN = log(x$N), lnH = log(x$H), invA = 1 / x$A)
  cbind(1, do.call(cbind, v[terms])) }
fb_nls_exp <- function(Z, y) {   # y = exp(Zβ) + ε by nls (gradient written out), started from OLS on ln y
  b0 <- unname(lm.fit(Z, log(y))$coefficients); f <- function(b) { e <- exp(drop(Z %*% b)); attr(e, "gradient") <- e * Z; e }
  m <- nls(y ~ f(b), data = list(y = y), start = list(b = b0), control = nls.control(maxiter = 1000, tol = 1e-10, minFactor = 1e-12, warnOnly = TRUE))
  if (!m$convInfo$isConv) message("nls: ", m$convInfo$stopMessage, "; relative offset ", signif(m$convInfo$finTol, 3)); unname(coef(m)) }
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
  S <- crossprod(Y - exp(Z %*% B)) / n
  list(B = B, Sigma = S, rounds = round)
}
`;

/**
 * s = the page's settings { imp, src, decimal, unit, dcol, pcol, percol, fcol, fval, cols: { N, H, A } }, cfg = the
 * stand-model settings (standCfg of ui.js), model = the trained model (stand.js train/exportModel), x = the stand
 * variables of the prediction tab ({ N, H, A }) or null, pred = the tool's prediction for x or null, o = { lang, created,
 * version, fileName }.
 */
export function buildStandR(s, cfg, model, x, pred, o) {
  const tr = o.lang === 'tr', T = (a, b) => (tr ? a : b), hd = c => c == null ? '' : String(s.src.headers[c]), out = [];
  const set = model.set, approach = model.approach, keys = model.keys, terms = model.terms;
  const sbPred = x && model.family === 'johnsonsb';
  out.push(header({ title: T('Çap Dağılımı Laboratuvarı: R kodu (meşcere modeli)', 'Diameter Distribution Lab: R code (stand model)'), tool: { id: 'cap-dagilimi', version: o.version }, created: o.created, lang: o.lang,
    packages: ['fitdistrplus', ...(sbPred ? ['nleqslv'] : [])],
    notes: [T(`Aşama 3b: meşcere modelini eğitme ve tahmin. Yanıt kümesi ${set}; terimler ${terms.join(', ')}; yöntem ${model.fit}. Model biçimi (Poudel ve Cao 2013): y = exp(β₁ + β₂·RS + β₃·ln N + β₄·ln H + β₅/A), RS = √(10000/N)/H; hata özgün ölçekte toplamsal (log-OLS'de çarpımsal).`,
      `Stage 3b: stand model training and prediction. Response set ${set}; terms ${terms.join(', ')}; method ${model.fit}. Model form (Poudel and Cao 2013): y = exp(β₁ + β₂·RS + β₃·ln N + β₄·ln H + β₅/A), RS = √(10000/N)/H; additive error on the original scale (multiplicative for log-OLS).`),
    T('Örnek alan katlı çapraz doğrulama ve CDF yöntemleri (CDFR, değiştirilmiş CDFR) 3c aşamasındadır.', 'Plot-level cross-validation and the CDF methods (CDFR, modified CDFR) are stage 3c.')] }));
  out.push(readBlock(s.imp, o.lang, o.fileName, s.decimal), FB_NUM, '', FB_OUT, '');
  out.push(...dataBlock({ ...s, mode: 'each' }, null, T, hd, false, s.unit === 'mm' ? 0.1 : 1, false), R_FAMILIES, R_METHODS, R_STAND, `res <- list()`, '');
  const cols = Object.entries(s.cols || {}).filter(([, c]) => c != null);
  out.push(rComment(T('Birimler: örnek alan × dönem; meşcere değişkeni birimin bütün satırlarında aynı tek pozitif sayı olmalı (yoksa birim dışarıda kalır).', 'Units: plot × period; a stand variable must be the same single positive number on every row of the unit (else the unit is left out).')),
    `stand_cols <- c(${cols.map(([k, c]) => `${k} = ${c + 1}`).join(', ')})   # ${cols.map(([k, c]) => `${k}: ${hd(c)}`).join(', ')}`,
    `ids <- unique(data.frame(plot = plot_all, period = per_all)[use, ])`,
    `units <- lapply(seq_len(nrow(ids)), function(i) { r <- use & in_unit(ids$plot[i], ids$period[i]); x <- list(); ok <- TRUE
  for (k in names(stand_cols)) { v <- fb_num(dat[[stand_cols[[k]]]][r], dec); u <- unique(v$value) ; if (any(v$status != "ok") || length(u) != 1 || !(u > 0)) ok <- FALSE else x[[k]] <- u }
  list(plot = ids$plot[i], period = ids$period[i], d = d_all[r], x = x, ok = ok) })`,
    `units <- Filter(function(u) u$ok, units); cat(${rStr(T('Birim: ', 'Units: '))}, length(units), "\\n")`, '');
  // targets
  if (approach === 'ppm') {
    const half = model.options.ppmLoc === 'half-dmin';
    out.push(rComment(T(`Hedefler (PPM): birim başına Weibull ML, konum ${half ? 'a = Dmin/2' : `a = ${model.options.a}`} sabit; başlangıç momentlerden.`, `Targets (PPM): Weibull ML per unit, location ${half ? 'a = Dmin/2' : `a = ${model.options.a}`} fixed; start from the moments.`)),
      `target <- function(d) { a <- ${half ? '0.5 * min(d)' : rNum(model.options.a)}; x <- d - a; m <- mean(x); v <- mean((x - m)^2)
  c0 <- uniroot(function(c) gamma(1 + 2 / c) / gamma(1 + 1 / c)^2 - 1 - v / m^2, c(0.05, 200))$root
  r <- tryCatch(fb_run(d, "weibull", "ml", fix = list(a = a), start = list(b = m / gamma(1 + 1 / c0), c = c0)), error = function(e) NULL)
  if (is.null(r)) NULL else c(b = r$est[["b"]], c = r$est[["c"]]${half ? ', dmin = min(d)' : ''}) }`);
  } else out.push(rComment(T('Hedefler (PRM): ortalama, moment varyansı (n bölenli), Dq, Dmin, yüzdelikler (tip 7).', 'Targets (PRM): mean, moment variance (divisor n), Dq, Dmin, percentiles (type 7).')),
    `target <- function(d) { s <- sort(d); m <- mean(d); v <- mean((d - m)^2)
  t <- c(${keys.map(k => `${k} = ${{ mean: 'm', variance: 'v', dq: 'sqrt(m^2 + v)', dmin: 's[1]', median: 'fb_q7(s, 0.5)', q25: 'fb_q7(s, 0.25)', q31: 'fb_q7(s, 0.31)', q50: 'fb_q7(s, 0.5)', q63: 'fb_q7(s, 0.63)', q95: 'fb_q7(s, 0.95)' }[k]}`).join(', ')})
  if (all(is.finite(t) & t > 0)) t else NULL }`);
  out.push(`terms <- ${rVec(terms, rStr)}; need <- ${rVec([...new Set(terms.flatMap(t => ({ RS: ['N', 'H'], lnN: ['N'], lnH: ['H'], invA: ['A'] })[t]))], rStr)}`,
    `rows <- Filter(Negate(is.null), lapply(units, function(u) { if (!all(sapply(need, function(k) !is.null(u$x[[k]])))) return(NULL); t <- target(u$d); if (is.null(t)) NULL else list(u = u, t = t) }))`,
    `X <- lapply(rows, function(r) r$u$x); Z <- do.call(rbind, lapply(X, function(x) fb_design(x, terms))); Y <- do.call(rbind, lapply(rows, function(r) r$t[${rVec(keys, rStr)}]))`,
    `cat(${rStr(T('Eğitim birimi: ', 'Training units: '))}, nrow(Y), ${rStr(T('; örnek alan: ', '; plots: '))}, length(unique(sapply(rows, function(r) r$u$plot))), "\\n")`, '');
  // fit
  if (model.fit === 'sur') out.push(`f <- fb_sur(Z, Y, iterate = TRUE); B <- f$B; cat("SUR rounds:", f$rounds, "\\n"); print(f$Sigma)`, `back <- function(e, k) e`);
  else if (model.fit === 'logols') out.push(`B <- sapply(seq_len(ncol(Y)), function(k) unname(lm.fit(Z, log(Y[, k]))$coefficients))`,
    `s2log <- sapply(seq_len(ncol(Y)), function(k) sum((log(Y[, k]) - Z %*% B[, k])^2) / (nrow(Z) - ncol(Z)))`,
    `back <- function(e, k) ${model.options.back === 'mean' ? `e * exp(s2log[k] / 2)   # ${T('ortalama: exp(Zβ + s²/2)', 'mean: exp(Zβ + s²/2)')}` : `e   # ${T('medyan: exp(Zβ)', 'median: exp(Zβ)')}`}`);
  else out.push(`B <- sapply(seq_len(ncol(Y)), function(k) fb_nls_exp(Z, Y[, k]))`, `back <- function(e, k) e`);
  out.push(`colnames(B) <- ${rVec(keys, rStr)}; print(B)`,
    `for (k in seq_len(ncol(B))) { pr <- back(exp(drop(Z %*% B[, k])), k); r <- Y[, k] - pr; key <- colnames(B)[k]`,
    `  for (j in seq_len(nrow(B))) res[[paste0(key, ".b", j)]] <- unname(B[j, k]); res[[paste0(key, ".rmse")]] <- sqrt(mean(r^2)); res[[paste0(key, ".bias")]] <- -mean(r) }`, '');
  // prediction
  if (x) {
    out.push(rComment(T('Tahmin: tahmin sekmesindeki meşcere değişkenleri', 'Prediction: the stand variables of the prediction tab')),
      `x0 <- ${`list(${Object.entries(x).filter(([, v]) => Number.isFinite(v)).map(([k, v]) => `${k} = ${rNum(v)}`).join(', ')})`}; z0 <- fb_design(x0, terms)`,
      `resp <- sapply(seq_len(ncol(B)), function(k) back(exp(sum(z0 * B[, k])), k)); names(resp) <- colnames(B); print(resp)`,
      `for (k in names(resp)) res[[paste0("pred.", k)]] <- resp[[k]]`);
    if (approach === 'ppm') out.push(`p <- c(a = ${model.options.ppmLoc === 'half-dmin' ? '0.5 * resp[["dmin"]]' : rNum(model.options.a)}, b = resp[["b"]], c = resp[["c"]]); print(p); for (k in names(p)) res[[paste0("pred.param.", k)]] <- p[[k]]`);
    else if (model.family === 'weibull') out.push(...recoverBody('weibull', null, model.options.loc === 'user' ? { loc: 'user', a: model.options.aUser } : { loc: 'half-dmin' }, [{ method: model.method }], T, 'as.list(resp)'));
    else out.push(...recoverBody('parresol', null, {}, [{ method: 'johnsonsb.parresol' }], T, `c(list(xi = ${rNum(model.options.xi)}), as.list(resp))`));
    if (pred && pred.status !== 'ok') out.push(rComment(T(`Araçta tahmin geçersizdi (${pred.status}): yanıtlar tutarsız ya da geri kazanım çözümsüz; R aynı hesabı yapar, sonucu yorumlarken bunu göz önünde tutun.`, `In the tool the prediction was not valid (${pred.status}): inconsistent responses or no recovery; R does the same computation, keep that in mind when reading it.`)));
  }
  out.push('', `fb_out(res)`, '');
  return out.join('\n');
}
