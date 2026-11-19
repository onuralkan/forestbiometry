# Independent reference for the bootstrap intervals of Model Evaluation (1.2.0-beta.1): percentile and BCa
# Sign convention: e = observed − predicted (y − ŷ; 19 Nov 2026, user decision).
# (DiCiccio and Efron 1996, eqs. 2.2, 2.3, 2.8, 6.3, 6.6, 6.7), written here from the paper in base R. The draws use the
# tool's generator mulberry32 (core/stats.js rng, u = k/2^32) so that the same seed gives the same bootstrap samples.
# Percentile endpoints are also taken with quantile(type = 1) (inverse of the empirical c.d.f.; levels rounded to 12
# decimals, since (1 - 0.95)/2 is 0.025000000000000022 in floating point and type 1 would then step one order statistic up),
# and the jackknife
# influence values with boot::empinf(type = "jack") as a second implementation (it centres on the full-sample estimate,
# not on the jackknife mean of eq. 6.7, so it agrees only for linear statistics: bias and MAE).
# Run from the repository root: Rscript tests/ref/eval_boot.R  (writes tests/ref/eval_boot.json)
library(jsonlite); library(boot)
u32 <- function(x) x %% 4294967296
i32 <- function(x) { x <- u32(x); as.integer(ifelse(x >= 2147483648, x - 4294967296, x)) }
xor32 <- function(a, b) u32(bitwXor(i32(a), i32(b)))
or32 <- function(a, b) u32(bitwOr(i32(a), i32(b)))
shr32 <- function(a, n) u32(bitwShiftR(i32(a), n))
imul32 <- function(a, b) { a <- u32(a); b <- u32(b); lo <- a %% 65536; hi <- (a - lo) / 65536; u32(lo * b + ((hi * b) %% 65536) * 65536) }
fb_rng <- function(seed) { a <- u32(seed); function() { a <<- u32(a + 1831565813); t <- a
  t <- imul32(xor32(t, shr32(t, 15)), or32(t, 1)); t <- xor32(t, u32(t + imul32(xor32(t, shr32(t, 7)), or32(t, 61)))); xor32(t, shr32(t, 14)) / 4294967296 } }
meas <- function(o, p) { e <- o - p; sst <- sum((o - mean(o))^2)
  c(bias = mean(e), mae = mean(abs(e)), rmse = sqrt(mean(e^2)), r2 = if (diff(range(o)) > 0 && sst > 0) 1 - sum(e^2) / sst else NA) }
Ginv <- function(t, alpha) { B <- length(t); k <- min(B, max(1, ceiling(alpha * B - 1e-9))); sort(t)[k] }
bootci <- function(o, p, B, seed, level) {
  n <- length(o); rnd <- fb_rng(seed); est <- meas(o, p)
  reps <- t(sapply(seq_len(B), function(b) { i <- floor(sapply(seq_len(n), function(j) rnd()) * n) + 1; meas(o[i], p[i]) }))
  jack <- t(sapply(seq_len(n), function(i) meas(o[-i], p[-i])))
  lo <- (1 - level) / 2; hi <- (1 + level) / 2; out <- list()
  for (k in names(est)) {
    t <- reps[, k]; t <- t[is.finite(t)]; th <- est[[k]]
    z0 <- qnorm(mean(t < th)); J <- jack[, k]; U <- (n - 1) * (mean(J) - J); a <- sum(U^3) / (6 * sum(U^2)^1.5)
    Lb <- empinf(data = data.frame(o = o, p = p), statistic = function(d, i) meas(d$o[i], d$p[i])[[k]], type = "jack", stype = "i")
    a2 <- sum(Lb^3) / (6 * sum(Lb^2)^1.5)
    al <- function(z) pnorm(z0 + (z0 + z) / (1 - a * (z0 + z)))
    out[[k]] <- list(est = th, Bok = length(t), pct = c(Ginv(t, lo), Ginv(t, hi)), pct_q1 = as.numeric(quantile(t, round(c(lo, hi), 12), type = 1)),
      z0 = z0, a = a, a_empinf = a2, bca = c(Ginv(t, al(qnorm(lo))), Ginv(t, al(qnorm(hi)))))
  }
  out
}
d <- read.csv2("tests/eval/fixture.csv", colClasses = "character")
num <- function(s) suppressWarnings(ifelse(trimws(s) == "", NA, as.numeric(gsub(",", ".", s))))
obs <- num(d$h_obs); m1 <- num(d$h_m1); m2 <- num(d$h_m2); ok <- !is.na(obs) & !is.na(m1) & !is.na(m2)
out <- list(R = R.version.string, boot = as.character(packageVersion("boot")),
  h_m1 = bootci(obs[ok], m1[ok], 2000, 1, 0.95), h_m2 = bootci(obs[ok], m2[ok], 2000, 1, 0.95),
  small = bootci(c(10, 20, 30, 25, 14, 18, 40, 33), c(12, 18, 33, 22, 15, 21, 36, 35), 2000, 7, 0.9),
  m2_b1000_s42_99 = bootci(obs[ok], m2[ok], 1000, 42, 0.99))
writeLines(toJSON(out, auto_unbox = TRUE, digits = NA, pretty = TRUE), "tests/ref/eval_boot.json")
