# Reference for systems of equations (SM-04): fits with the R package systemfit on the page's simulated sample.
# Run from the repository root:   Rscript tests/ref/sm04_systems.R      (or in R: source("tests/ref/sm04_systems.R"))
# Needs: systemfit (install.packages("systemfit")), jsonlite. Writes tests/ref/eqsys_sm04.json (commit it or send it).
# Data: assets/lab/eqsys/ornek/ornek-sistem.csv (simulated with random numbers: 80 trees, D, H, V; not any species'
# values). Nothing from the package is copied into the site; the numbers below are the test reference only.
suppressPackageStartupMessages({ library(systemfit); library(jsonlite) })
d <- read.csv2("assets/lab/eqsys/ornek/ornek-sistem.csv", stringsAsFactors = FALSE)
d$lnD <- log(d$D_cm); d$lnH <- log(d$H_m); d$lnV <- log(d$V_m3)
safe <- function(expr) { w <- character(0)
  r <- tryCatch(withCallingHandlers(eval(expr), warning = function(x) { w <<- c(w, conditionMessage(x)); invokeRestart("muffleWarning") }), error = function(e) e)
  if (inherits(r, "error")) list(error = conditionMessage(r)) else { attr(r, "warnings") <- w; r } }

# ---------- linear systems (systemfit) ----------
eqs <- list(height = lnH ~ lnD, volume = lnV ~ lnD + I(lnD^2))
out_lin <- function(m) if (!is.null(m$error)) m else list(
  method = m$method, coef = unname(coef(m)), names = names(coef(m)), se = unname(sqrt(diag(vcov(m)))), vcov = unname(vcov(m)),
  residCov = unname(m$residCov), residCovEst = if (is.null(m$residCovEst)) NULL else unname(m$residCovEst),
  iter = if (is.null(m$iter)) NULL else m$iter, r2 = unname(sapply(m$eq, function(e) summary(e)$r.squared)),
  mcelroy = summary(m)$ols.r.squared, logLik = as.numeric(logLik(m)), df = attr(logLik(m), "df"),
  fitted1 = unname(fitted(m)[1:5, 1]), fitted2 = unname(fitted(m)[1:5, 2]), warnings = as.list(attr(m, "warnings")))
lin <- list(
  OLS     = safe(quote(systemfit(eqs, method = "OLS", data = d))),
  SUR     = safe(quote(systemfit(eqs, method = "SUR", data = d))),                                      # geomean (Eq. 38), one step
  SURnoDf = safe(quote(systemfit(eqs, method = "SUR", data = d, methodResidCov = "noDfCor"))),         # Eq. 37
  SURmax  = safe(quote(systemfit(eqs, method = "SUR", data = d, methodResidCov = "max"))),             # Eq. 39
  ISUR    = safe(quote(systemfit(eqs, method = "SUR", data = d, maxit = 500, tol = 1e-12))),            # iterated, geomean
  ISURml  = safe(quote(systemfit(eqs, method = "SUR", data = d, maxit = 500, tol = 1e-12, methodResidCov = "noDfCor"))),
  # cross-equation restriction: the same coefficient of lnD in both equations
  SURr    = safe(quote(systemfit(eqs, method = "SUR", data = d, restrict.matrix = "height_lnD - volume_lnD = 0"))),
  OLSr    = safe(quote(systemfit(eqs, method = "OLS", data = d, restrict.matrix = "height_lnD - volume_lnD = 0")))
)
lrt <- if (is.null(lin$ISURml$error)) {
  u <- lin$ISURml; r <- safe(quote(systemfit(eqs, method = "SUR", data = d, maxit = 500, tol = 1e-12, methodResidCov = "noDfCor", restrict.matrix = "height_lnD - volume_lnD = 0")))
  if (is.null(r$error)) { t <- lrtest(r, u); list(LR = t$Chisq[2], df = t$Df[2], p = t$`Pr(>Chisq)`[2], logLikR = as.numeric(logLik(r)), logLikU = as.numeric(logLik(u)), coefR = unname(coef(r))) } else r
} else NULL

# ---------- nonlinear systems (nlsystemfit) ----------
nl <- list()
if (exists("nlsystemfit")) {
  e1 <- H_m ~ 1.3 + a * (1 - exp(-b * D_cm))^c
  e2 <- V_m3 ~ k * D_cm^p * H_m^q
  e2c <- V_m3 ~ k * D_cm^p * (1.3 + a * (1 - exp(-b * D_cm))^c)^q      # compatible: shares a, b, c with e1
  st <- c(a = 30, b = 0.04, c = 1.2, k = 0.00006, p = 1.9, q = 1)
  out_nl <- function(m) if (!is.null(m$error)) m else list(
    method = m$method, coef = unname(m$b), names = names(m$b), se = unname(m$se), vcov = unname(m$covb),
    rcov = unname(m$rcov), rcovest = if (is.null(m$rcovest)) NULL else unname(m$rcovest), ols.r2 = m$ols.r2,
    eq_ssr = unname(sapply(m$eq, function(e) e$ssr)), eq_r2 = unname(sapply(m$eq, function(e) e$r2)), warnings = as.list(attr(m, "warnings")))
  nl <- list(
    OLS  = out_nl(safe(quote(nlsystemfit("OLS", list(height = e1, volume = e2), st, data = d)))),
    SUR  = out_nl(safe(quote(nlsystemfit("SUR", list(height = e1, volume = e2), st, data = d)))),
    OLSc = out_nl(safe(quote(nlsystemfit("OLS", list(height = e1, volume = e2c), st, data = d)))),
    SURc = out_nl(safe(quote(nlsystemfit("SUR", list(height = e1, volume = e2c), st, data = d)))),
    formals = lapply(as.list(formals(nlsystemfit)), function(x) paste(deparse(x), collapse = " "))
  )
}

res <- list(versions = list(R = R.version.string, systemfit = as.character(packageVersion("systemfit")), jsonlite = as.character(packageVersion("jsonlite"))),
  n = nrow(d), linear = lapply(lin, out_lin), lrt = lrt, nonlinear = nl)
writeLines(toJSON(res, digits = NA, auto_unbox = TRUE, pretty = TRUE, null = "null", force = TRUE), "tests/ref/eqsys_sm04.json")
cat("written tests/ref/eqsys_sm04.json\n")
for (k in names(lin)) if (!is.null(lin[[k]]$error)) cat("systemfit", k, "failed:", lin[[k]]$error, "\n")
for (k in setdiff(names(nl), "formals")) if (!is.null(nl[[k]]$error)) cat("nlsystemfit", k, "failed:", nl[[k]]$error, "\n")
