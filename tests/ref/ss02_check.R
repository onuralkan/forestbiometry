# Numerical check of the Stand Structure spatial measures against R packages (METHODS §16 SS02, SS-07; source status
# [P]/[A]; user decision 16 Nov 2026). Run from the repository root:
#     Rscript tests/ref/ss02_check.R          →  tests/ref/structure_ss02_r.json
# then  node tests/structure/test_ss02_r.mjs  compares the tool with it (and commit the JSON).
# Packages: jsonlite, spatstat.geom, spatstat.explore, forestSAS, siplab  (install.packages(c(...)) once).
# Patterns: the random test patterns of tests/ref/structure_ss02.json (simulated, not real trees).
#   Clark–Evans R without correction and with Donnelly's edge correction: spatstat.explore::clarkevans (Donnelly only
#     for rectangular windows, so rectangles only);
#   U (dominance; Hui et al. 1998): forestSAS::dominance on c(d_i, d of the 4 nearest neighbours), the neighbours from
#     spatstat.geom::nnwhich, i.e. independent of the tool's neighbour search;
#   Hegyi: siplab::pairwise with powers_ker (p_i = p_j = p_r = 1 by default: (d_j/d_i)/dist), competitors within 6 m,
#     no edge correction. The index is read from the last mark column of the result (its name, written to the JSON as
#     hegyiColumns, depends on the siplab version; the first run of 18 Nov 2026 with siplab 1.6 had no 'cmpt' column).
suppressPackageStartupMessages({
  library(jsonlite); library(spatstat.geom); library(spatstat.explore); library(forestSAS); library(siplab)
})
ref <- fromJSON("tests/ref/structure_ss02.json", simplifyVector = FALSE)
ver <- function(p) as.character(packageVersion(p))
out <- list(R = paste(R.version$major, R.version$minor, sep = "."),
            packages = list(spatstat.explore = ver("spatstat.explore"), spatstat.geom = ver("spatstat.geom"),
                            forestSAS = ver("forestSAS"), siplab = ver("siplab")),
            hegyiRadius = 6, cases = list())
for (k in seq_along(ref$cases)) {
  cs <- ref$cases[[k]]; g <- cs$geom
  x <- unlist(cs$x); y <- unlist(cs$y); d <- unlist(cs$dbh); n <- length(x)
  rect <- identical(g$shape, "rect")
  win <- if (rect) owin(c(g$x0, g$x1), c(g$y0, g$y1)) else owin(range(x) + c(-1, 1), range(y) + c(-1, 1))
  X <- ppp(x, y, window = win, marks = d)
  nn <- nnwhich(X, k = 1:4)
  U <- vapply(seq_len(n), function(i) as.numeric(dominance(c(d[i], d[nn[i, ]]))), numeric(1))
  res <- list(shape = g$shape, n = n, U = U, nn = unname(nn))
  if (rect) {
    res$R <- unname(clarkevans(X, correction = "none"))
    res$RD <- unname(clarkevans(X, correction = "Donnelly"))
    P <- pairwise(X, maxR = out$hegyiRadius, kernel = powers_ker)
    m <- marks(P)                                  # siplab appends the competition index as the last mark column
    res$hegyiColumns <- if (is.data.frame(m)) names(m) else "vector"
    res$hegyi <- if (is.data.frame(m)) as.numeric(m[[ncol(m)]]) else as.numeric(m)
    stopifnot(length(res$hegyi) == n)
  }
  out$cases[[k]] <- res
}
write_json(out, "tests/ref/structure_ss02_r.json", digits = NA, auto_unbox = TRUE, pretty = TRUE)
cat("written tests/ref/structure_ss02_r.json\n")
