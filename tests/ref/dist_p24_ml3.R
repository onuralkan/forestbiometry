# Reference for the three-parameter Weibull ML of the Diameter Distribution tool (weibull.ml3, METHODS §12 P24).
# ForestFit (CRAN) fitWeibull(data, location = TRUE, method = "ml", starts): the help page names the method "mle" for
# the three-parameter case, the code accepts "ml" (ForestFit 2.4.3). The package minimises −ℓ with optim's
# Nelder–Mead from the starts; the best of several starts is kept. No package code or data is copied into the site.
# Writes tests/ref/dist_p24_ml3.json (data, the package's estimates and log-likelihood). Base R only, plus ForestFit.
# Usage (repository root): Rscript tests/ref/dist_p24_ml3.R
suppressMessages(library(ForestFit))
cat("ForestFit", as.character(packageVersion("ForestFit")), "\n")
ff <- function(x) {
  best <- NULL
  for (th in c(0, 0.5, 0.9) * min(x)) for (sh in c(1.5, 2.5, 4)) {
    r <- tryCatch(suppressWarnings(fitWeibull(x, TRUE, "ml", c(sh, sd(x) * 1.2, th))), error = function(e) NULL)
    if (is.null(r)) next
    ll <- r$measures[1, "log.likelihood"]
    if (is.finite(ll) && (is.null(best) || ll > best$ll)) best <- list(c = r$estimate[1, 1], b = r$estimate[1, 2], a = r$estimate[1, 3], ll = ll)
  }
  best
}
num <- function(v) formatC(v, digits = 17, format = "g")
cases <- list()
set.seed(1);  cases$sim_a5 <- 5 + 20 * rweibull(200, 2.5)
set.seed(7);  cases$sim_a10 <- 10 + 15 * rweibull(120, 1.8)
smp <- read.csv2("assets/lab/dist/ornek/ornek-caplar.csv", stringsAsFactors = FALSE); cases$sample <- smp$cap_cm
set.seed(3);  cases$shape_below1 <- 3 + 10 * rweibull(150, 0.8)
set.seed(5);  cases$true_a0 <- 25 * rweibull(150, 3.5)
out <- character()
for (k in names(cases)) {
  x <- round(cases[[k]], 1); f <- ff(x)
  cat(k, ": n =", length(x), " min =", min(x), " a =", f$a, " b =", f$b, " c =", f$c, " ll =", f$ll, "\n")
  out <- c(out, sprintf('  "%s": {"d": [%s], "ff": {"a": %s, "b": %s, "c": %s, "logLik": %s}}', k, paste(num(x), collapse = ", "), num(f$a), num(f$b), num(f$c), num(f$ll)))
}
writeLines(c("{", paste0('  "package": "ForestFit ', as.character(packageVersion("ForestFit")), '",'), paste(out, collapse = ",\n"), "}"), "tests/ref/dist_p24_ml3.json")
cat("wrote tests/ref/dist_p24_ml3.json\n")
