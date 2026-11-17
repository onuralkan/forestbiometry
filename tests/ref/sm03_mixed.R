# Reference for mixed-effects models (SM-03): fits with the R package nlme on the page's simulated sample.
# Run from the repository root:   Rscript tests/ref/sm03_mixed.R
# Needs: nlme (ships with R), jsonlite. Writes tests/ref/mixed_sm03.json (send it back, or commit it).
# Data: assets/lab/mixed/ornek/ornek-karma.csv (simulated with random numbers: 25 plots, height–diameter; not any
# species' values). Nothing from the package is copied into the site; the numbers below are the test reference only.
suppressPackageStartupMessages({ library(nlme); library(jsonlite) })
d <- read.csv2("assets/lab/mixed/ornek/ornek-karma.csv", stringsAsFactors = FALSE)
d$alan <- factor(d$alan)
d$lnD <- log(d$D_cm)
dat <- groupedData(H_m ~ lnD | alan, data = d)
ctl <- lmeControl(maxIter = 500, msMaxIter = 500, niterEM = 100, tolerance = 1e-10, msTol = 1e-12)

# random-effect covariance D = sigma^2 * pdMatrix (works for lme and nlme; getVarCov() is lme only)
Dmat <- function(m) { v <- pdMatrix(m$modelStruct$reStruct[[1]]) * m$sigma^2; as.matrix(v) }
vc <- function(m) { v <- Dmat(m); list(names = colnames(v), D = unname(v)) }
pw <- function(m) { s <- m$modelStruct$varStruct; if (is.null(s)) NULL else unname(coef(s, unconstrained = FALSE)) }
out_lme <- function(m) list(
  method = m$method, fixef = unname(fixef(m)), fixnames = names(fixef(m)), se = unname(sqrt(diag(vcov(m)))),
  vcov = unname(vcov(m)), sigma = m$sigma, ranefCov = vc(m), power = pw(m),
  logLik = as.numeric(logLik(m)), df = attr(logLik(m), "df"), AIC = AIC(m), BIC = BIC(m),
  ranef = lapply(split(as.data.frame(ranef(m)), seq_len(nrow(ranef(m)))), function(r) unname(unlist(r))),
  ranefGroups = rownames(ranef(m)),
  fitted0 = unname(fitted(m, level = 0))[1:10], fitted1 = unname(fitted(m, level = 1))[1:10])

# ---------- linear mixed models: H = b0 + b1 ln D, random by plot ----------
L1  <- lme(H_m ~ lnD, random = ~ 1 | alan, data = dat, method = "REML", control = ctl)
L2  <- lme(H_m ~ lnD, random = ~ lnD | alan, data = dat, method = "REML", control = ctl)                 # general 2 x 2 (pdSymm)
L3  <- lme(H_m ~ lnD, random = list(alan = pdDiag(~ lnD)), data = dat, method = "REML", control = ctl)    # diagonal
L4  <- lme(H_m ~ lnD, random = ~ lnD | alan, weights = varPower(form = ~ D_cm), data = dat, method = "REML", control = ctl)
L1m <- update(L1, method = "ML"); L2m <- update(L2, method = "ML"); L4m <- update(L4, method = "ML")
lrt <- anova(L1m, L2m)

# calibration of a "new" plot: three trees of plot 3, treated as not in the data (fixed part and variances of L2 / L4)
cal_lme <- function(m, nd) {
  X <- cbind(1, log(nd$D_cm)); Z <- X; b <- fixef(m); D <- Dmat(m); s2 <- m$sigma^2
  w <- if (is.null(m$modelStruct$varStruct)) rep(1, nrow(nd)) else nd$D_cm^(2 * pw(m))
  R <- s2 * diag(w, nrow(nd)); V <- Z %*% D %*% t(Z) + R
  u <- D %*% t(Z) %*% solve(V, nd$H_m - X %*% b)
  list(u = unname(drop(u)), pred = unname(drop(cbind(1, log(c(15, 30, 45))) %*% (b + u))))
}
nd <- subset(d, alan == "3")[1:3, ]

# ---------- nonlinear mixed models: H = 1.3 + a (1 − exp(−b D))^c ----------
cr <- function(D, a, b, c) 1.3 + a * (1 - exp(-b * D))^c
nctl <- nlmeControl(maxIter = 500, msMaxIter = 500, pnlsMaxIter = 50, tolerance = 1e-7, pnlsTol = 1e-6, msTol = 1e-10, minScale = 1e-10)
# a model that fails with these settings is tried once more with the package defaults; if that fails too, the error is
# written to the JSON and the other models go on
fitN <- function(expr) {
  w <- character(0)
  m <- tryCatch(withCallingHandlers(eval(expr), warning = function(x) { w <<- c(w, conditionMessage(x)); invokeRestart("muffleWarning") }), error = function(e) e)
  if (inherits(m, "error")) { nctl0 <- nctl; nctl <<- nlmeControl(); m <- tryCatch(eval(expr), error = function(e) e); nctl <<- nctl0
    if (!inherits(m, "error")) attr(m, "control") <- "defaults" }
  if (!inherits(m, "error")) attr(m, "warnings") <- w
  m
}
st <- c(a = 28, b = 0.045, c = 1.2)
out_nlme <- function(m) list(
  method = m$method, fixef = unname(fixef(m)), fixnames = names(fixef(m)), se = unname(sqrt(diag(vcov(m)))),
  vcov = unname(vcov(m)), sigma = m$sigma, ranefCov = vc(m), power = pw(m),
  logLik = as.numeric(logLik(m)), df = attr(logLik(m), "df"), AIC = AIC(m), BIC = BIC(m),
  ranef = lapply(split(as.data.frame(ranef(m)), seq_len(nrow(ranef(m)))), function(r) unname(unlist(r))),
  ranefGroups = rownames(ranef(m)),
  fitted0 = unname(fitted(m, level = 0))[1:10], fitted1 = unname(fitted(m, level = 1))[1:10])
N1  <- fitN(quote(nlme(H_m ~ cr(D_cm, a, b, c), fixed = a + b + c ~ 1, random = a ~ 1 | alan, data = d, start = st, method = "ML", control = nctl)))
st1 <- if (inherits(N1, "error")) st else fixef(N1)
N2  <- fitN(quote(nlme(H_m ~ cr(D_cm, a, b, c), fixed = a + b + c ~ 1, random = pdDiag(a + b ~ 1), groups = ~ alan, data = d, start = st1, method = "ML", control = nctl)))
N3  <- fitN(quote(nlme(H_m ~ cr(D_cm, a, b, c), fixed = a + b + c ~ 1, random = pdSymm(a + b ~ 1), groups = ~ alan, data = d, start = st1, method = "ML", control = nctl)))
N4  <- fitN(quote(nlme(H_m ~ cr(D_cm, a, b, c), fixed = a + b + c ~ 1, random = a ~ 1 | alan, weights = varPower(form = ~ D_cm), data = d, start = st1, method = "ML", control = nctl)))
N1r <- fitN(quote(nlme(H_m ~ cr(D_cm, a, b, c), fixed = a + b + c ~ 1, random = a ~ 1 | alan, data = d, start = st1, method = "REML", control = nctl)))
ok <- function(m) !inherits(m, "error")
outN <- function(m) if (ok(m)) c(out_nlme(m), list(control = if (is.null(attr(m, "control"))) "script" else attr(m, "control"), warnings = as.list(attr(m, "warnings")))) else list(error = conditionMessage(m))
nlrt <- if (ok(N1) && ok(N3)) { a <- anova(N1, N3); list(L = a$L.Ratio[2], p = a$`p-value`[2], df = a$df) } else NULL

# calibration of the new plot under N1 and N3: random effects maximizing the conditional density (penalized least
# squares, Gauss–Newton with a numeric Jacobian; written here, not from the package), and the one-step approximation
cal_nlme <- function(m, nd, re) {
  b <- fixef(m); D <- Dmat(m); s2 <- m$sigma^2; q <- length(re)
  f <- function(u) { p <- b; p[re] <- p[re] + u; cr(nd$D_cm, p["a"], p["b"], p["c"]) }
  # one-step approximation (Vonesh and Chinchilli 1997, as used by Calama and Montero 2004, Raptis et al. 2021,
  # Ciceu et al. 2020): b = D Z' (R + Z D Z')^-1 e, Z = df/db at b = 0, e = y - f(beta, 0)
  J0 <- matrix(sapply(1:q, function(j) { h <- 1e-6; e <- rep(0, q); e[j] <- h; (f(e) - f(-e)) / (2 * h) }), ncol = q)
  w <- if (is.null(m$modelStruct$varStruct)) rep(1, nrow(nd)) else nd$D_cm^(2 * pw(m))
  u1 <- drop(D %*% t(J0) %*% solve(s2 * diag(w, nrow(nd)) + J0 %*% D %*% t(J0), nd$H_m - f(rep(0, q))))
  p1 <- b; p1[re] <- p1[re] + u1
  u <- rep(0, q); Di <- solve(D)
  for (it in 1:200) {
    r <- (nd$H_m - f(u)) / sqrt(w); J <- sapply(1:q, function(j) { h <- 1e-6 * max(1, abs(u[j])); e <- rep(0, q); e[j] <- h; (f(u + e) - f(u - e)) / (2 * h) })
    J <- matrix(J, ncol = q) / sqrt(w)
    du <- solve(t(J) %*% J / s2 + Di, t(J) %*% r / s2 - Di %*% u)
    u <- u + drop(du); if (max(abs(du)) < 1e-12) break
  }
  p <- b; p[re] <- p[re] + u
  list(u = unname(u), pred = unname(cr(c(15, 30, 45), p["a"], p["b"], p["c"])),
       u1 = unname(u1), pred1 = unname(cr(c(15, 30, 45), p1["a"], p1["b"], p1["c"])))
}

res <- list(
  versions = list(R = R.version.string, nlme = as.character(packageVersion("nlme")), jsonlite = as.character(packageVersion("jsonlite"))),
  n = nrow(d), groups = nlevels(d$alan),
  lme = list(L1 = out_lme(L1), L2 = out_lme(L2), L3 = out_lme(L3), L4 = out_lme(L4), L1m = out_lme(L1m), L2m = out_lme(L2m), L4m = out_lme(L4m)),
  lrt = list(L = lrt$L.Ratio[2], p = lrt$`p-value`[2], df = lrt$df),
  calib_lme = list(trees = nd$agac, L2 = cal_lme(L2, nd), L4 = cal_lme(L4, nd)),
  nlme = list(N1 = outN(N1), N2 = outN(N2), N3 = outN(N3), N4 = outN(N4), N1r = outN(N1r)),
  nlrt = nlrt,
  calib_nlme = list(trees = nd$agac, N1 = if (ok(N1)) cal_nlme(N1, nd, "a"), N3 = if (ok(N3)) cal_nlme(N3, nd, c("a", "b")), N4 = if (ok(N4)) cal_nlme(N4, nd, "a"))
)
writeLines(toJSON(res, digits = NA, auto_unbox = TRUE, pretty = TRUE, null = "null"), "tests/ref/mixed_sm03.json")
cat("written tests/ref/mixed_sm03.json\n")
for (k in names(res$nlme)) if (!is.null(res$nlme[[k]]$error)) cat("nlme", k, "failed:", res$nlme[[k]]$error, "\n")
