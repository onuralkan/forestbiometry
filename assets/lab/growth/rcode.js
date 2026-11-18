// Growth Function Fitter: the "R code" script (core/rcode.js). It redoes the run in base R (stats::nls) with the tool's
// settings: the same observations (age and size read with the chosen decimal separator, both > 0, empty rows skipped),
// the chosen forms fitted from the starting values the tool's solution came from with derivatives from R's deriv, the
// same measures (bias = observed − predicted, as in the tool), AIC, the asymptote, the inflection age (the forms'
// closed forms, METHODS §18), the age where MAI culminates (t·y'(t) − y(t) from + to −, y' from R's deriv) and the
// table of the chosen form. No DOM.
import { FORMS } from './calc.js';
import { header, readBlock, fbModel, FB_NUM, FB_OUT, rStr, rNum, rComment } from '../core/rcode.js';

/** The forms in R, and their inflection ages (closed forms; NA where the form has none for these parameters). */
const R_FORMS = {
  cr: { rhs: 'b0 * (1 - exp(-b1 * t))^b2', infl: 'if (b[3] > 1) log(b[3]) / b[2] else NA' },
  schu: { rhs: 'b0 * exp(-b1 / t)', infl: 'b[2] / 2' },
  gomp: { rhs: 'b0 * exp(-b1 * exp(-b2 * t))', infl: 'if (b[2] > 1) log(b[2]) / b[3] else NA' },
  logi: { rhs: 'b0 / (1 + b1 * exp(-b2 * t))', infl: 'if (b[2] > 1) log(b[2]) / b[3] else NA' },
  mono: { rhs: 'b0 * (1 - b1 * exp(-b2 * t))', infl: 'NA' },
  weib: { rhs: 'b0 - b1 * exp(-b2 * t^b3)', infl: 'if (b[4] > 1) ((b[4] - 1) / (b[3] * b[4]))^(1 / b[4]) else NA' },
};

/**
 * s = the page's settings { imp, src, map: { series, t, y }, decimal, sel, step: table step (years) }, R = the page's
 * results { tMax, obs, fits }, o = { lang, created, version, fileName }.
 */
export function buildR(s, R, o) {
  const tr = o.lang === 'tr', T = (a, b) => (tr ? a : b), hd = c => c == null ? '' : String(s.src.headers[c]);
  const ok = R.fits.filter(q => q.status === 'ok'), sel = ok.find(q => q.form === s.sel);
  const out = [];
  out.push(header({ title: T('Büyüme İşlevi Fit Etme: R kodu', 'Growth Function Fitter: R code'), tool: { id: 'buyume-islevi', version: o.version }, created: o.created, lang: o.lang, packages: [],
    notes: [T('İşlevler doğrusal olmayan en küçük kareler ile fit edilir (araç: Levenberg–Marquardt; R: nls, Gauss–Newton, türevler R\'ın deriv işleviyle). R aracın çözümünün geldiği başlangıç değerlerinden başlar; orada yakınsamazsa aracın tahminlerinden başlar ve bunu yazar.',
      'The functions are fitted by nonlinear least squares (tool: Levenberg–Marquardt; R: nls, Gauss–Newton, derivatives from R\'s deriv). R starts from the values the tool\'s solution came from; if it does not converge there, it starts from the tool\'s estimates and says so.'),
    T('Yanlılık = gözlem − tahmin (araçtaki gibi); RMSE = √(SSE/n); σ = √(SSE/(n − p)); AIC R\'ın logLik\'iyle (k = p + 1). Standart hatalar gözlemlerin bağımsız olduğunu varsayar; aynı ağacın yinelenen ölçümlerinde bu varsayım tutmaz.',
      'Bias = observed − predicted (as in the tool); RMSE = √(SSE/n); σ = √(SSE/(n − p)); AIC from R\'s logLik (k = p + 1). Standard errors assume independent observations, which repeated measurements of the same tree are not.'),
    T('Cari yıllık artım CAI = dy/dt (R\'ın deriv işleviyle), ortalama yıllık artım MAI = y/t; MAI\'nin doruğu t·y\' − y\'nin +\'dan −\'ye geçtiği yaş.',
      'Current annual increment CAI = dy/dt (from R\'s deriv), mean annual increment MAI = y/t; MAI culminates where t·y\' − y turns from + to −.')] }));
  out.push(readBlock(s.imp, o.lang, o.fileName, s.decimal));
  out.push(FB_NUM, '', FB_OUT, '');
  out.push(rComment(T('Ayarlar (araçtaki gibi)', 'Settings (as in the tool)')),
    `dec <- ${rStr(s.decimal)}   # ${T('ondalık ayırıcı', 'decimal separator')}`,
    `col_t <- ${s.map.t + 1}   # ${T('yaş', 'age')}: ${hd(s.map.t)}`,
    `col_y <- ${s.map.y + 1}   # ${T('büyüklük', 'size')}: ${hd(s.map.y)}`, '',
    rComment(T('Gözlemler: yaş ve büyüklük sayı ve > 0; bütünüyle boş satırlar atlanır.', 'Observations: age and size numbers and > 0; entirely empty rows are skipped.')),
    `tn <- fb_num(dat[[col_t]], dec); yn <- fb_num(dat[[col_y]], dec)`,
    `blank <- apply(as.matrix(dat), 1, function(r) all(trimws(r) == ""))`,
    `use <- !blank & tn$status == "ok" & yn$status == "ok" & tn$value > 0 & yn$value > 0`,
    `gd <- data.frame(row = row_no[use], t = tn$value[use], .y = yn$value[use])`,
    `t_max <- max(gd$t)`,
    `cat(${rStr(T('Gözlem: ', 'Observations: '))}, nrow(gd), ${rStr(T('; dışarıda kalan satır: ', '; rows left out: '))}, sum(!blank & !use), "\\n")`, '');
  out.push(fbModel(o.lang), '');
  out.push(`fb_nls <- function(form, data, start, fallback) {
  ctl <- nls.control(maxiter = 1000, tol = 1e-8, minFactor = 1e-12)
  f <- tryCatch(nls(form, data = data, start = start, control = ctl), error = function(e) NULL)
  if (is.null(f) && !is.null(fallback)) {
    message(${rStr(T('nls aracın başlangıcından yakınsamadı; aracın tahminlerinden başlıyor', 'nls did not converge from the tool\'s start; starting from the tool\'s estimates'))})
    f <- tryCatch(nls(form, data = data, start = fallback, control = ctl), error = function(e) NULL)
  }
  f
}
# ${T('y(t), CAI(t) = dy/dt (deriv), MAI(t) = y/t', 'y(t), CAI(t) = dy/dt (deriv), MAI(t) = y/t')}
fb_curve <- function(m, b, t) {
  d <- deriv(m$rhs, "t", function.arg = c(m$params, "t"))
  v <- do.call(d, c(as.list(b), list(t = t)))
  data.frame(t = t, y = as.vector(v), cai = as.vector(attr(v, "gradient")), mai = as.vector(v) / t)
}
# ${T('MAI\'nin doruğu: (0, 10·t_max] aralığında t·y\' − y\'nin +\'dan −\'ye ilk geçişi (4000 aralık), uniroot ile', 'MAI culmination: the first change of t·y\' − y from + to − on (0, 10·t_max] (4000 intervals), by uniroot')}
fb_mai_peak <- function(m, b) {
  hi <- 10 * t_max; k <- 4000; g <- function(t) { cc <- fb_curve(m, b, t); t * cc$cai - cc$y }
  tt <- hi * (1:k) / k; gv <- g(tt)
  i <- which(is.finite(gv[-k]) & is.finite(gv[-1]) & gv[-k] > 0 & gv[-1] < 0)[1]
  if (is.na(i)) return(NA)
  uniroot(g, c(tt[i], tt[i + 1]), tol = 1e-14)$root
}
res <- list(); fits <- list(); models <- list()
`);
  for (const q of R.fits) {
    const F = FORMS[q.form], id = q.form;
    if (q.status !== 'ok') { out.push(rComment(T(`${F.name}: araçta fit edilmedi (${q.status}); R'da da fit edilmez.`, `${F.name}: not fitted by the tool (${q.status}); not fitted in R either.`)), ''); continue; }
    const L = th => `list(${F.params.map((p, j) => `${p} = ${rNum(th[j])}`).join(', ')})`;
    out.push(rComment(`${F.name}: ${F.formula}`),
      `models$${id} <- m <- fb_model(quote(${R_FORMS[id].rhs}), c(${F.params.map(rStr).join(', ')}), "t")`,
      `fits$${id} <- f <- fb_nls(m$form, gd, ${L(q.start)}, ${L(q.theta)})`,
      `if (is.null(f)) cat(${rStr(F.name + T(': fit edilemedi', ': not fitted'))}, "\\n") else {`,
      `  b <- coef(f); e <- gd$.y - fitted(f); se <- summary(f)$coefficients[, 2]; sse <- sum(e^2)`,
      `  infl <- unname(${R_FORMS[id].infl}); if (!is.na(infl) && infl <= 0) infl <- NA`,
      `  tm <- fb_mai_peak(m, b)`,
      `  v <- c(n = nrow(gd), sse = sse, rmse = sqrt(sse / nrow(gd)), bias = mean(e), rse = summary(f)$sigma, aic = AIC(f), asymptote = unname(b[1]), inflection = infl,`,
      `         cai_max = if (is.na(infl)) NA else fb_curve(m, b, infl)$cai, mai_culmination = tm, mai_max = if (is.na(tm)) NA else fb_curve(m, b, tm)$mai)`,
      `  cat("\\n", ${rStr(F.name)}, "\\n"); print(cbind(estimate = b, se = se)); print(signif(v, 8))`,
      `  res[paste0(${rStr(id + '.')}, names(b))] <- as.list(unname(b)); res[paste0(${rStr(id + '.se.')}, names(b))] <- as.list(unname(se))`,
      `  for (k in names(v)) if (!is.na(v[[k]])) res[[paste0(${rStr(id + '.')}, k)]] <- unname(v[[k]])`,
      `}`, '');
  }
  if (sel) {
    const F = FORMS[sel.form];
    out.push(rComment(T(`Seçilen işlev: ${F.name}. Tablo: t = adım, 2·adım, … 1,25·t_max'a kadar; y, CAI, MAI.`, `Chosen function: ${F.name}. Table: t = step, 2·step, … up to 1.25·t_max; y, CAI, MAI.`)),
      `step <- ${rNum(s.step)}`,
      `tab <- fb_curve(models$${sel.form}, coef(fits$${sel.form}), step * seq_len(floor((1.25 * t_max + 1e-9) / step)))`,
      `print(tab)`,
      `res[["curve.n"]] <- nrow(tab); res[["curve.y"]] <- sum(tab$y); res[["curve.cai"]] <- sum(tab$cai); res[["curve.mai"]] <- sum(tab$mai)`, '');
  }
  out.push(`fb_out(res)`, '');
  return out.join('\n');
}
