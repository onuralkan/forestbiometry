// Systems of Equations: the "R code" script (core/rcode.js). It redoes the run in base R: the same rows (every response
// and variable present), the equations translated to R with their shared coefficients, the GLS objective
// Σ_t r_tᵀ Σ̂⁻¹ r_t (Parresol 2001 Eq. 24; Henningsen and Hamann 2007 Eq. 7) minimized by damped Gauss–Newton written out
// in R on the residuals transformed with the Cholesky factor of Σ̂⁻¹ (derivatives from R's deriv), OLS, SUR and iterated SUR as in the tool, the residual
// covariance (Eq. 37–39), R² per equation, McElroy's R², the system OLS R², the log-likelihood, and, with shared
// coefficients, the likelihood-ratio test of the restrictions (Eq. 48). systemfit is the tool's test reference for linear
// systems; its nlsystemfit did not move from OLS in the SUR step (METHODS §28), so the estimator is written out here.
// No DOM.
import { unrestrictedSystem } from './calc.js';
import { header, readBlock, FB_NUM, FB_OUT, rStr, rNum, rVec, rComment } from '../core/rcode.js';
import { rName, toR } from '../nlsreg/rcode.js';

/** The R list describing a compiled system (eqs: [{ name, y, ast, params, vars }]); y names are R columns. */
const sysR = (sys, yOf) => `list(\n${sys.eqs.map((e, i) => `  list(name = ${rStr(e.name)}, y = ${rStr(yOf(i))}, rhs = quote(${toR(e.ast)}), params = ${rVec(e.params, rStr)}, vars = ${rVec(e.vars, rStr)})`).join(',\n')})`;

/**
 * s = { imp, src, decimal, eqs: [{ y (column) }], map: { var: column } }, R = the page's results { sys, vars, start,
 * method, resid, fit }, o = { lang, created, version, fileName }.
 */
export function buildR(s, R, o) {
  const hd = c => c == null ? '' : String(s.src.headers[c]);
  const sys = R.sys, G = sys.eqs.length, out = [];
  out.push(header({ title: 'Systems of Equations: R code', tool: { id: 'denklem-sistemleri', version: o.version }, created: o.created, lang: o.lang, packages: [],
    notes: ['Estimator: Σ_t r_tᵀ Σ̂⁻¹ r_t is minimized (Parresol 2001 Eq. 24; Henningsen and Hamann 2007 Eq. 7); the residuals are transformed with the Cholesky factor of Σ̂⁻¹; damped Gauss–Newton (Levenberg–Marquardt) is written out here, derivatives from R\'s deriv. OLS: Σ̂ = I; SUR: Σ̂ from the OLS residuals; iterated SUR: Σ̂ from the previous residuals at each step. A coefficient name in several equations is one coefficient (a cross-equation restriction).',
    'The systemfit package is the tool\'s test reference for linear systems; for nonlinear systems nlsystemfit did not move from OLS in the SUR step on such data, so the estimator is written out here.'] }));
  out.push(readBlock(s.imp, o.lang, o.fileName, s.decimal));
  out.push(FB_NUM, '', FB_OUT, '');
  const vcols = R.vars.map(v => [v, s.map[v]]), ycols = s.eqs.map(e => e.y), need = [...new Set([...ycols, ...vcols.map(x => x[1])])];
  out.push(rComment('Settings (as in the tool)'),
    `dec <- ${rStr(s.decimal)}   # decimal separator`,
    `num <- function(k) fb_num(dat[[k]], dec)$value`,
    rComment('Rows: every equation\'s response and variables must be numbers (the system needs the same T observations in every equation).'),
    `keep <- Reduce(\`&\`, lapply(c(${need.map(c => c + 1).join(', ')}), function(k) is.finite(num(k))))`,
    `d <- data.frame(row = row_no[keep]${vcols.map(([v, c]) => `, ${rName(v)} = num(${c + 1})[keep]`).join('')}${ycols.map((c, i) => `, .y${i + 1} = num(${c + 1})[keep]`).join('')}, check.names = FALSE)`,
    rComment([...vcols.map(([v, c]) => `${v} = ${hd(c)}`), ...ycols.map((c, i) => `.y${i + 1} = ${hd(c)} (${sys.eqs[i].name})`)].join('; ')),
    `n_t <- nrow(d); cat(${rStr('Observations (T): ')}, n_t, ${rStr('; rows left out: ')}, sum(!keep), "\\n")`,
    `resid_cov <- ${rStr(R.resid)}   # residual covariance: noDfCor = u'u/T (Eq. 37), geomean = /√((T − Ki)(T − Kj)) (Eq. 38), max = /(T − max(Ki, Kj)) (Eq. 39)`, '');
  out.push(`# Functions of a system: predictions (T × G) and each equation's derivatives with respect to the coefficients (T × K)
fb_system <- function(eqs) {
  P <- unique(unlist(lapply(eqs, function(e) e$params)))
  for (k in seq_along(eqs)) {
    e <- eqs[[k]]
    eqs[[k]]$fn <- tryCatch(deriv(e$rhs, e$params, function.arg = c(e$params, e$vars)), error = function(err) NULL)
    if (is.null(eqs[[k]]$fn)) message(e$name, ${rStr(': deriv cannot differentiate this formula; numerical derivatives')})
  }
  eval1 <- function(e, b) {
    if (!is.null(e$fn)) { v <- do.call(e$fn, c(as.list(b[e$params]), as.list(d[e$vars]))); g <- attr(v, "gradient") }
    else { env <- list2env(c(as.list(b[e$params]), as.list(d[e$vars]))); v <- numericDeriv(e$rhs, e$params, env, central = TRUE); g <- attr(v, "gradient") }
    if (nrow(g) == 1) g <- g[rep(1, n_t), , drop = FALSE]
    J <- matrix(0, n_t, length(P), dimnames = list(NULL, P)); J[, e$params] <- g
    list(f = rep_len(as.vector(v), n_t), J = J)
  }
  Y <- sapply(eqs, function(e) d[[e$y]])
  K <- sapply(eqs, function(e) length(e$params))
  list(eqs = eqs, P = P, Y = Y, K = K, G = length(eqs),
       at = function(b) { r <- lapply(eqs, eval1, b = b); list(F = sapply(r, function(x) x$f), J = lapply(r, function(x) x$J)) })
}
# Residual covariance (Henningsen and Hamann 2007 Eq. 37–39)
fb_sigma <- function(S, U, rc) { M <- crossprod(U); K <- S$K
  if (rc == "noDfCor") M / n_t else if (rc == "max") M / (n_t - outer(K, K, pmax)) else M / sqrt(outer(n_t - K, n_t - K)) }
# GLS for a fixed Σ̂: Σ_t ‖R r_t‖² (Σ̂⁻¹ = RᵀR) by damped Gauss–Newton (Levenberg–Marquardt); an invalid or worse step is rejected and the damping grows
fb_gls <- function(S, Sig, start) {
  Rm <- chol(solve(Sig)); b <- setNames(unname(start), S$P)
  tr_ <- function(M) do.call(rbind, lapply(seq_len(S$G), function(i) Reduce(\`+\`, lapply(seq_len(S$G), function(j) Rm[i, j] * M[[j]]))))
  obj <- function(a) { U <- S$Y - a$F; v <- sum((U %*% t(Rm))^2); if (is.finite(v)) v else Inf }
  a <- S$at(b); R0 <- obj(a); if (!is.finite(R0)) stop("start")
  lam <- 0
  for (it in 1:500) {
    Jt <- tr_(a$J); r <- as.vector((S$Y - a$F) %*% t(Rm)); A <- crossprod(Jt); g <- drop(crossprod(Jt, r)); moved <- FALSE
    for (k in 1:60) {
      st <- tryCatch(solve(A + lam * diag(diag(A), nrow(A)), g), error = function(e) NULL)
      if (!is.null(st)) { bn <- b + st; an <- tryCatch(S$at(bn), error = function(e) NULL)
        if (!is.null(an) && all(is.finite(an$F)) && all(sapply(an$J, function(M) all(is.finite(M))))) { Rn <- obj(an); if (Rn <= R0) { moved <- TRUE; break } } }
      lam <- if (lam == 0) 1e-6 else lam * 4
    }
    if (!moved) break
    rel <- max(abs(st) / (abs(bn) + 1e-12)); gn <- lam == 0
    b <- bn; a <- an; R0 <- Rn; lam <- if (lam / 3 < 1e-9) 0 else lam / 3
    if (gn && rel < 1e-12) break
  }
  list(b = b, U = S$Y - a$F, F = a$F, A = crossprod(tr_(a$J)))
}
# OLS, SUR or iterated SUR (the tool's steps)
fb_fit <- function(S, method, rc, start, fallback = NULL) {
  I <- diag(S$G)
  ols <- tryCatch(fb_gls(S, I, start), error = function(e) NULL)
  if (is.null(ols) && !is.null(fallback)) { message(${rStr('the model cannot be evaluated at the tool\'s start; starting from the tool\'s OLS estimates')}); ols <- fb_gls(S, I, fallback) }
  shared <- sum(sapply(S$P, function(p) sum(sapply(S$eqs, function(e) p %in% e$params)) > 1)) > 0
  if (method == "OLS") {
    # covariance: σ̂ per equation without restrictions, one pooled σ̂² with shared coefficients (as systemfit)
    s <- fb_sigma(S, ols$U, rc); Sig <- if (shared) I * sum(ols$U^2) / (S$G * n_t - length(S$P)) else diag(diag(s), S$G)
    Rm <- chol(solve(Sig)); a <- S$at(ols$b); Jt <- do.call(rbind, lapply(seq_len(S$G), function(i) Reduce(\`+\`, lapply(seq_len(S$G), function(j) Rm[i, j] * a$J[[j]]))))
    return(modifyList(ols, list(Sig = Sig, A = crossprod(Jt))))
  }
  Sig <- fb_sigma(S, ols$U, rc); fit <- ols
  for (it in 1:(if (method == "ISUR") 200 else 1)) {
    f <- fb_gls(S, Sig, fit$b); change <- sqrt(sum((f$b - fit$b)^2) / sum(f$b^2)); fit <- f
    if (method != "ISUR") break
    Sn <- fb_sigma(S, f$U, rc)
    if (change < 1e-12) break
    Sig <- Sn
  }
  modifyList(fit, list(Sig = Sig))
}
# identification (tool rule): the information matrix scaled to unit diagonal, condition number λmax/λmin (limit 1e8);
# the coefficients of the near-null direction (|eigenvector component| ≥ 0.3) when it is exceeded
fb_ident <- function(A, names) { d <- sqrt(diag(A)); C <- A / outer(d, d); e <- eigen(C, symmetric = TRUE)
  cond <- if (min(e$values) > 0) max(e$values) / min(e$values) else Inf
  list(cond = cond, weak = if (cond > 1e8) names[abs(e$vectors[, which.min(e$values)]) >= 0.3] else character(0)) }
fb_logLik <- function(S, U) { S37 <- crossprod(U) / n_t; -S$G * n_t / 2 * log(2 * pi) - n_t / 2 * as.numeric(determinant(S37)$modulus) - S$G * n_t / 2 }
res <- list()
`);
  const L = (names, vals) => `c(${names.map((p, j) => `${rName(p)} = ${rNum(vals[j])}`).join(', ')})`;
  const startV = sys.params.map(p => R.start[p] ?? 0), ols = R.fits && R.fits.OLS && R.fits.OLS.status === 'ok' ? R.fits.OLS.coef : null;
  out.push(rComment('The system (as in the tool)'),
    `S <- fb_system(${sysR(sys, i => '.y' + (i + 1))})`,
    `start <- ${L(sys.params, startV)}   # the tool's starting values (empty = 0)`,
    ...(ols ? [`ols_tool <- ${L(sys.params, ols)}   # the tool's OLS estimates (fallback start)`] : [`ols_tool <- NULL`]),
    `fit <- fb_fit(S, ${rStr(R.method)}, resid_cov, start, ols_tool)`,
    `V <- solve(fit$A); se <- sqrt(diag(V))`,
    `rc <- fb_sigma(S, fit$U, resid_cov); ssr <- colSums(fit$U^2); Yc <- scale(S$Y, scale = FALSE); r2 <- 1 - ssr / colSums(Yc^2)`,
    `Si <- solve(fit$Sig); mcelroy <- 1 - sum((fit$U %*% Si) * fit$U) / sum((Yc %*% Si) * Yc); ols_r2 <- 1 - sum(ssr) / sum(Yc^2)`,
    `ll <- fb_logLik(S, fit$U); df <- if (${rStr(R.method)} == "OLS") length(S$P) + 1 else length(S$P) + S$G * (S$G + 1) / 2`,
    `print(cbind(estimate = fit$b, se = se)); print(rc); cat("R2", signif(r2, 8), " McElroy", signif(mcelroy, 8), " logLik", signif(ll, 10), " df", df, "\\n")`,
    `res[paste0("b.", names(fit$b))] <- as.list(unname(fit$b)); res[paste0("se.", names(fit$b))] <- as.list(unname(se))`,
    `for (i in seq_len(S$G)) { res[[paste0("eq", i, ".ssr")]] <- ssr[[i]]; res[[paste0("eq", i, ".r2")]] <- r2[[i]]; for (j in seq_len(S$G)) res[[paste0("rcov.", i, ".", j)]] <- rc[i, j] }`,
    `res[["mcelroy"]] <- mcelroy; res[["ols_r2"]] <- ols_r2; res[["logLik"]] <- ll; res[["df"]] <- df`,
    `id <- fb_ident(fit$A, names(fit$b)); res[["cond"]] <- id$cond; res[["weak"]] <- as.numeric(id$cond > 1e8)`,
    `if (id$cond > 1e8) cat(${rStr('Warning: weakly identified coefficients, condition number ')}, signif(id$cond, 3), ":", id$weak, "\n")`,
    `if (any(se > abs(fit$b))) cat(${rStr('Note: standard error larger than the estimate: ')}, names(fit$b)[se > abs(fit$b)], "\n")`, '');
  if (sys.shared.length) {
    const u = unrestrictedSystem(sys, R.vars);
    if (u.ok && u !== sys) {
      out.push(rComment(`Likelihood-ratio test of the shared coefficients (Eq. 48): both systems by iterated SUR with Eq. 37; in the unrestricted system each shared coefficient is separate per equation (${Object.entries(u.renamed).map(([k, v]) => `${k} → ${v.join(', ')}`).join('; ')}), started from the restricted estimates.`),
        rComment('Without the restriction some coefficients may not be identified by the data (a flat likelihood); R and the tool can then stop at different points of it and the LR can differ. Print and look at the unrestricted estimates.'),
        `Su <- fb_system(${sysR(u, i => '.y' + (i + 1))})`,
        `fr <- fb_fit(S, "ISUR", "noDfCor", start, ols_tool)`,
        `orig <- c(${u.params.map(p => `${rStr(p)} = ${rStr(Object.entries(u.renamed).find(([, v]) => v.includes(p))?.[0] ?? p)}`).join(', ')})   # unrestricted coefficient → restricted coefficient`,
        `su <- fr$b[orig[Su$P]]`,
        rComment('Reliability (tool rules): the unrestricted log L must not be below the restricted one; no separated copy may run off (|value| > 1e6·max(1, |shared value|)); condition number ≤ 1e8; if these hold the system is fitted again from four starts with the second and later copies times 0.5, 0.8, 1.25, 2, and all must reach the same maximum. Otherwise no p-value.'),
        `moved <- ${rVec(Object.values(u.renamed).flatMap(v => v.slice(1)), rStr)}`,
        `llr <- fb_logLik(S, fr$U)`,
        `checks <- function(fu) { why <- c(); llu <- fb_logLik(Su, fu$U); if (llu < llr - 1e-8 * max(1, abs(llr))) why <- c(why, "below")
  if (any(abs(fu$b[names(orig)]) > 1e6 * pmax(1, abs(fr$b[orig])))) why <- c(why, "boundary")
  if (fb_ident(fu$A, names(fu$b))$cond > 1e8) why <- c(why, "weak"); why }`,
        `fu <- fb_fit(Su, "ISUR", "noDfCor", su); why <- checks(fu)`,
        `if (!length(why)) { fus <- c(list(fu), lapply(${rVec([0.5, 0.8, 1.25, 2])}, function(f) { s1 <- su; s1[moved] <- s1[moved] * f; tryCatch(fb_fit(Su, "ISUR", "noDfCor", s1), error = function(e) NULL) }))
  fus <- Filter(Negate(is.null), fus); lls <- sapply(fus, function(x) fb_logLik(Su, x$U)); fu <- fus[[which.max(lls)]]
  if (any(abs(lls - max(lls)) > 1e-6 * max(1, abs(max(lls))))) why <- c(why, "multi") }`,
        `LR <- n_t * (as.numeric(determinant(crossprod(fr$U) / n_t)$modulus) - as.numeric(determinant(crossprod(fu$U) / n_t)$modulus)); ldf <- length(Su$P) - length(S$P)`,
        `print(fu$b); cat(${rStr('LR = ')}, signif(LR, 8), " df", ldf, if (length(why)) paste(${rStr(' — not reliable: ')}, paste(why, collapse = ", ")) else paste(" p", signif(pchisq(LR, ldf, lower.tail = FALSE), 6)), "\\n")`,
        `res[["lrt.reliable"]] <- as.numeric(!length(why)); res[["lrt.df"]] <- ldf; res[["lrt.llr"]] <- llr`,
        `if (!length(why)) { res[["lrt.LR"]] <- LR; res[["lrt.p"]] <- pchisq(LR, ldf, lower.tail = FALSE); res[["lrt.llu"]] <- fb_logLik(Su, fu$U) }`, '');
    }
  }
  out.push(`fb_out(res)`, '');
  return out.join('\n');
}
