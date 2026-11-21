// Taper, fitting to stem measurements (SV-02/a3): the "R code" script (core/rcode.js). The stem table is read and checked
// by the tool (core/stems.js: tree-level checks, bark, two diameters); the script starts from the observations the
// tool used, which the page downloads with it as a CSV file (row, tree, D, H, h, d), and redoes the FIT in base R:
//   mb76  (Max and Burkhart 1976): nonlinear least squares on d (scale 'd') or on y = d²/D² (scale 'source');
//   kozak02 (Kozak 2004): nonlinear least squares on d (scale 'd') or ordinary least squares on ln d (scale 'source').
// R starts from the values the tool started from; the same measures on the d scale (e = observed − predicted). No DOM.
import { header, FB_OUT, rStr, rNum, rComment } from '../core/rcode.js';

const MB_Y = 'b1 * (x - 1) + b2 * (x^2 - 1) + b3 * (a1 - x)^2 * (x <= a1) + b4 * (a2 - x)^2 * (x <= a2)';
const KZ_E = 'b1 * z^4 + b2 / exp(D / H) + b3 * X^0.1 + b4 / D + b5 * H^Q + b6 * X';
const PARAMS = { mb76: ['b1', 'b2', 'b3', 'b4', 'a1', 'a2'], kozak02: ['a0', 'a1', 'a2', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6'] };

/** Observations the fit used, as CSV (point → full precision). */
export function obsCsv(FR) {
  const q = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  return ['row,tree,D,H,h,d', ...FR.obs.map(o => [o.row, q([o.plot_id, o.tree_id, o.period].filter(x => x != null && x !== '').join(' / ')), o.D, o.H, o.h, o.d].join(','))].join('\n') + '\n';
}

/** FR = the page's fit result (fitTaper), o = { lang, created, version, fileName (the observations CSV) }. */
export function buildR(FR, o) {
  const form = FR.form.replace(/^taper\./, ''), P = PARAMS[form], st = FR.start;
  const lst = th => th ? 'list(' + P.map((k, i) => `${k} = ${rNum(th[i])}`).join(', ') + ')' : null;
  const est = lst(P.map(k => FR.params[k])), start = lst(st);
  const out = [];
  out.push(header({ title: 'Taper, fitting to stem measurements: R code', tool: { id: 'govde-profili', version: o.version }, created: o.created, lang: o.lang, packages: [],
    notes: ['The stem table was read and checked by the tool; this script starts from the observations the tool used (the CSV file downloaded with it) and redoes the fit.',
      'Nonlinear least squares: tool Levenberg–Marquardt, R nls (Gauss–Newton, with the PORT algorithm as a last resort), started from the values the tool started from; each fallback is said in the output.',
      'Measures on the d scale (cm) whatever the fitting scale: e = observed − predicted, bias = mean e, RMSE = √(mean e²). Standard errors assume independent observations, which the points of one tree are not (as in the tool).'] }));
  out.push(`data_file <- ${rStr(o.fileName || 'taper-observations.csv')}   # the observations the tool used (row, tree, D cm, H m, h m, d cm)`,
    `obs <- read.csv(data_file, stringsAsFactors = FALSE, fileEncoding = "UTF-8-BOM")   # the site writes CSV with a byte-order mark`,
    `obs$x <- obs$h / obs$H   # relative height`,
    `cat(${rStr('Observations: ')}, nrow(obs), ${rStr('; trees: ')}, length(unique(obs$tree)), "\\n")`, '', FB_OUT, '',
    `ctl <- nls.control(maxiter = 1000, tol = 1e-8, minFactor = 1e-12, scaleOffset = 1)`,
    `fb_fit <- function(f, start, est, lower = NULL, upper = NULL) {
  fit <- tryCatch(nls(f, data = obs, start = start, control = ctl), error = function(e) NULL)
  if (is.null(fit)) { message(${rStr('nls (Gauss–Newton) did not converge from the tool\'s start; starting from the tool\'s estimates')}); fit <- tryCatch(nls(f, data = obs, start = est, control = ctl), error = function(e) NULL) }
  if (is.null(fit)) { message(${rStr('Gauss–Newton did not converge; using nls(algorithm = "port") from the tool\'s estimates')})
    fit <- if (is.null(lower)) nls(f, data = obs, start = est, algorithm = "port", control = ctl) else nls(f, data = obs, start = est, algorithm = "port", lower = lower, upper = upper, control = ctl) }
  fit
}`, '');
  if (form === 'mb76') {
    out.push(rComment(`Max and Burkhart (1976): y = d²/D² = ${MB_Y}; scale ${FR.scale === 'source' ? '"source": fitted on y' : '"d": fitted on d = D·√y'}`),
      FR.scale === 'source' ? `obs$y <- (obs$d / obs$D)^2\nfit <- fb_fit(y ~ ${MB_Y}, ${start}, ${est}, lower = c(-Inf, -Inf, -Inf, -Inf, 0, 0), upper = c(Inf, Inf, Inf, Inf, 1, 1))`
        : `fit <- fb_fit(d ~ D * sqrt(${MB_Y}), ${start}, ${est}, lower = c(-Inf, -Inf, -Inf, -Inf, 0, 0), upper = c(Inf, Inf, Inf, Inf, 1, 1))`,
      `b <- coef(fit); se <- sqrt(diag(vcov(fit)))`,
      `y_hat <- with(as.list(b), with(obs, ${MB_Y}))`,
      `pred <- ifelse(y_hat >= 0, obs$D * sqrt(pmax(y_hat, 0)), NA)`);
  } else {
    out.push(rComment('Kozak (2004), model 02: d = a0·D^a1·H^a2·X^E, X = (1 − z^(1/3))/(1 − (1.3/H)^(1/3)), Q = 1 − z^(1/3), z = h/H;'),
      rComment(`E = ${KZ_E}. Points at the tip (h ≥ H) were left out by the tool (ln X undefined).`),
      `obs$z <- obs$h / obs$H; obs$X <- (1 - obs$z^(1/3)) / (1 - (1.3 / obs$H)^(1/3)); obs$Q <- 1 - obs$z^(1/3)`);
    if (FR.scale === 'source') out.push(rComment('Scale "source": ordinary least squares on ln d (Kozak\'s log-linearization); no back-transformation correction (as in the tool).'),
      `lf <- lm(log(d) ~ log(D) + log(H) + I(z^4 * log(X)) + I(log(X) / exp(D / H)) + I(X^0.1 * log(X)) + I(log(X) / D) + I(H^Q * log(X)) + I(X * log(X)), data = obs)`,
      `cf <- unname(coef(lf)); b <- c(a0 = exp(cf[1]), a1 = cf[2], a2 = cf[3], b1 = cf[4], b2 = cf[5], b3 = cf[6], b4 = cf[7], b5 = cf[8], b6 = cf[9]); se <- NULL`,
      `print(summary(lf))`);
    else out.push(`fit <- fb_fit(d ~ a0 * D^a1 * H^a2 * X^(${KZ_E}), ${start}, ${est})`, `b <- coef(fit); se <- sqrt(diag(vcov(fit)))`);
    out.push(`pred <- with(as.list(b), with(obs, a0 * D^a1 * H^a2 * X^(${KZ_E})))`);
  }
  out.push(...(form === 'mb76' || FR.scale !== 'source' ? [`print(summary(fit))`] : []),
    `e <- obs$d - pred; ok <- !is.na(e)`,
    `res <- c(as.list(b), if (!is.null(se)) as.list(setNames(se, paste0("se.", names(se)))) else list(),`,
    `  list(n = nrow(obs), trees = length(unique(obs$tree)), rmse = sqrt(mean(e[ok]^2)), bias = mean(e[ok])))`,
    `print(unlist(res))`,
    `fb_out(res)`);
  return out.join('\n') + '\n';
}
