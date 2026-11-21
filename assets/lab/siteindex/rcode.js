// Site Index, fitting to the user's height–age series (SI03): the "R code" script (core/rcode.js). It redoes the fit
// in base R (stats::nls) with the tool's settings: the same series (series id, with the plot when a plot column is
// chosen; age and height read with the chosen decimal separator, both > 0), the same pairs of observations of one
// series (consecutive, from the first, or all; forward in age only), the chosen difference equation fitted to H2 from
// the starting values the tool's solution came from, and the same measures (e = observed − predicted). No DOM.
import { header, readBlock, FB_NUM, FB_OUT, rStr, rNum, rComment } from '../core/rcode.js';

/** The difference equations in R: H2 as a function of A1, H1, A2 and the global parameters (METHODS §15). */
const R_FORMS = {
  'cr.ada.b0': { rhs: 'H1 * ((1 - exp(-b1 * A2)) / (1 - exp(-b1 * A1)))^b2', params: ['b1', 'b2'] },
  'cr.ada.b2': { rhs: 'b0 * (H1 / b0)^(log(1 - exp(-b1 * A2)) / log(1 - exp(-b1 * A1)))', params: ['b0', 'b1'] },
  'schu.ada': { rhs: 'H1 * exp(b1 * (1 / A2 - 1 / A1))', params: ['b1'] },
};
export const R_FORM_IDS = Object.keys(R_FORMS);

/**
 * F = the page's fit settings { imp, src, map: { series, plot, A, H }, decimal, form, pairing }, FR = the page's fit
 * result (fitPairs + { series, pairing }), o = { lang, created, version, fileName }.
 */
export function buildR(F, FR, o) {
  const m = R_FORMS[FR.form], hd = c => c == null ? '' : String(F.src.headers[c]);
  const start = m.params.map((k, i) => `${k} = ${rNum(FR.start[i])}`).join(', ');
  const est = FR.params ? m.params.map(k => `${k} = ${rNum(FR.params[k])}`).join(', ') : null;
  const out = [];
  out.push(header({ title: 'Site Index, fitting to height–age series: R code', tool: { id: 'bonitet', version: o.version }, created: o.created, lang: o.lang, packages: [],
    notes: ['The difference equation is fitted to pairs of observations of the same series by nonlinear least squares (tool: Levenberg–Marquardt; R: nls, Gauss–Newton, with the PORT algorithm as a last resort). R starts from the values the tool\'s solution came from; if it does not converge from there it starts from the tool\'s estimates, then uses PORT (each step said in the output).',
      'e = observed − predicted (as in the tool); bias = mean e; RMSE = √(SSE/n); σ = √(SSE/(n − p)), n = number of pairs. Standard errors assume independent observations, which pairs of one series are not (as in the tool).'] }));
  out.push(readBlock(F.imp, o.lang, o.fileName, F.decimal));
  out.push(FB_NUM, '', FB_OUT, '');
  out.push(rComment('Settings (as in the tool)'),
    `dec <- ${rStr(F.decimal)}   # decimal separator`,
    `col_id <- ${F.map.series + 1}   # series: ${hd(F.map.series)}`,
    `col_plot <- ${F.map.plot == null ? 'NA' : F.map.plot + 1}   # plot: ${F.map.plot == null ? '(none)' : hd(F.map.plot)}`,
    `col_A <- ${F.map.A + 1}   # age: ${hd(F.map.A)}`,
    `col_H <- ${F.map.H + 1}   # height: ${hd(F.map.H)}`,
    `pairing <- ${rStr(FR.pairing)}   # "consecutive", "first" or "all"`, '',
    rComment('Series: rows with a series id and age and height numbers > 0 (entirely empty rows skipped); the key is plot / id.'),
    `txt <- function(c) trimws(dat[[c]])`,
    `An <- fb_num(dat[[col_A]], dec); Hn <- fb_num(dat[[col_H]], dec)`,
    `blank <- apply(as.matrix(dat), 1, function(r) all(trimws(r) == ""))`,
    `key <- if (is.na(col_plot)) txt(col_id) else ifelse(txt(col_plot) == "", txt(col_id), paste(txt(col_plot), txt(col_id), sep = " / "))`,
    `use <- !blank & txt(col_id) != "" & An$status == "ok" & Hn$status == "ok" & An$value > 0 & Hn$value > 0`,
    `obs <- data.frame(id = key[use], A = An$value[use], H = Hn$value[use], stringsAsFactors = FALSE)`,
    `cat(${rStr('Observations: ')}, nrow(obs), ${rStr('; series: ')}, length(unique(obs$id)), ${rStr('; rows left out: ')}, sum(!blank & !use), "\\n")`, '',
    rComment('Pairs of one series, forward in age only (equal ages give no information on growth).'),
    `pairs <- do.call(rbind, lapply(split(obs, factor(obs$id, levels = unique(obs$id))), function(s) {
  s <- s[order(s$A), ]; k <- nrow(s); out <- NULL
  for (i in seq_len(k)) for (j in seq_len(k)) {
    if (j <= i) next
    if (pairing == "consecutive" && j != i + 1) next
    if (pairing == "first" && i != 1) next
    if (!(s$A[j] > s$A[i])) next
    out <- rbind(out, data.frame(id = s$id[1], A1 = s$A[i], H1 = s$H[i], A2 = s$A[j], H2 = s$H[j]))
  }
  out
}))`,
    `cat(${rStr('Pairs: ')}, nrow(pairs), "\\n")`, '',
    rComment(`Fit: ${FR.form}`),
    `form <- H2 ~ ${m.rhs}`,
    `ctl <- nls.control(maxiter = 1000, tol = 1e-8, minFactor = 1e-12, scaleOffset = 1)   # scaleOffset: convergence test also when the residuals are very small (R ≥ 4.1)`,
    `fit <- tryCatch(nls(form, data = pairs, start = list(${start}), control = ctl), error = function(e) NULL)`,
    ...(est ? [`if (is.null(fit)) { message(${rStr('nls (Gauss–Newton) did not converge from the tool\'s start; starting from the tool\'s estimates')}); fit <- tryCatch(nls(form, data = pairs, start = list(${est}), control = ctl), error = function(e) NULL) }`,
      `if (is.null(fit)) { message(${rStr('Gauss–Newton did not converge; using nls(algorithm = "port") from the tool\'s estimates')}); fit <- nls(form, data = pairs, start = list(${est}), algorithm = "port", control = ctl) }`] : []),
    `print(summary(fit))`,
    `b <- coef(fit); se <- sqrt(diag(vcov(fit)))`,
    `e <- pairs$H2 - fitted(fit); n <- nrow(pairs); p <- length(b)`,
    `res <- c(as.list(setNames(b, names(b))), as.list(setNames(se, paste0("se.", names(se)))),`,
    `  list(n = n, series = length(unique(pairs$id)), sse = sum(e^2), rmse = sqrt(sum(e^2) / n), bias = mean(e), sigma = sqrt(sum(e^2) / (n - p))))`,
    `print(unlist(res))`,
    `fb_out(res)`);
  return out.join('\n') + '\n';
}
