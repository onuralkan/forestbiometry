# Independent reference for Model Evaluation 1.2.0: weighted measures, the t interval for the bias and the
# Sign convention: e = observed − predicted (y − ŷ; 19 Nov 2026, user decision).
# equivalence tests of Robinson and Froese (2004). Base R only (weighted.mean, t.test, qf with ncp, pt) and jsonlite.
# Run from the repository root: Rscript tests/ref/eval_inference.R  (writes tests/ref/eval_inference.json)
library(jsonlite)
d <- read.csv2("tests/eval/fixture.csv", colClasses = "character")
num <- function(s) suppressWarnings(ifelse(trimws(s) == "", NA, as.numeric(gsub(",", ".", s))))
obs <- num(d$h_obs); m <- list(h_m1 = num(d$h_m1), h_m2 = num(d$h_m2)); w <- num(d$dbh)
common <- !is.na(obs) & !is.na(m$h_m1) & !is.na(m$h_m2) & !is.na(w) & w > 0
wmeasures <- function(o, p, w) {
  e <- o - p; mo <- weighted.mean(o, w)
  r <- list(n = length(o), sumW = sum(w), bias = weighted.mean(e, w), mae = weighted.mean(abs(e), w),
            rmse = sqrt(weighted.mean(e^2, w)), r2 = 1 - sum(w * e^2) / sum(w * (o - mo)^2), meanObs = mo, meanPred = weighted.mean(p, w))
  r$rel_mean <- lapply(r[c("bias", "mae", "rmse")], function(x) x / mo * 100)
  r$rel_range <- lapply(r[c("bias", "mae", "rmse")], function(x) x / diff(range(o)) * 100)
  r
}
equiv <- function(e, type, value, alpha) {
  n <- length(e); s <- sd(e); delta <- if (type == "abs") value else value * s; eps <- delta / s
  ci <- t.test(e, conf.level = 1 - 2 * alpha)$conf.int
  C <- sqrt(qf(alpha, 1, n - 1, ncp = n * eps^2)); t <- mean(e) / (s / sqrt(n))
  list(type = type, value = value, alpha = alpha, delta = delta, eps = eps, tost_lo = ci[1], tost_hi = ci[2],
       tost_equivalent = ci[1] > -delta && ci[2] < delta, psi2 = n * eps^2, C = C, t = t, wellek_equivalent = abs(t) < C,
       power = 2 * pt(C, n - 1) - 1)
}
out <- list(R = R.version.string, weight = "dbh", weighted = list(), inference = list())
for (k in names(m)) {
  o <- obs[common]; p <- m[[k]][common]; e <- o - p
  out$weighted[[k]] <- wmeasures(o, p, w[common])
  ci <- lapply(c(0.9, 0.95, 0.99), function(l) as.numeric(t.test(e, conf.level = l)$conf.int))
  out$inference[[k]] <- list(n = length(e), mean = mean(e), sd = sd(e), se = sd(e) / sqrt(length(e)),
    ci90 = ci[[1]], ci95 = ci[[2]], ci99 = ci[[3]],
    equiv = list(equiv(e, "abs", 1, 0.05), equiv(e, "abs", 3, 0.05), equiv(e, "rel", 0.25, 0.05), equiv(e, "rel", 0.5, 0.01), equiv(e, "rel", 1, 0.1)))
}
# Robinson and Froese (2004), Table 1: cut-offs and power from n, the criterion ε and alpha = 0.01
rf <- function(n, eps) { C <- sqrt(qf(0.01, 1, n - 1, ncp = n * eps^2)); c(C = C, power = 2 * pt(C, n - 1) - 1) }
out$table1 <- list(d_abs025 = rf(3393, 0.25 / 1.9), d_abs050 = rf(3393, 0.5 / 1.9), d_rel10 = rf(3393, 0.1), d_rel25 = rf(3393, 0.25),
  d_rel50 = rf(3393, 0.5), v_abs1 = rf(549, 1 / 10.6), v_abs5 = rf(549, 5 / 10.6), v_rel10 = rf(549, 0.1), v_rel25 = rf(549, 0.25), v_rel50 = rf(549, 0.5))
writeLines(toJSON(out, auto_unbox = TRUE, digits = NA, pretty = TRUE), "tests/ref/eval_inference.json")
