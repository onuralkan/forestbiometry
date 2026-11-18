// Nonlinear Regression: the "R code" script (core/rcode.js). It redoes the run in base R (stats::nls) with the tool's
// settings: the same rows (every column a model or weight uses must be a number, weight columns > 0), each model's
// formula translated to R, fitted from the starting values the tool's solution came from, the same weights (Parresol
// 2001: ψ = X^θ with θ fixed or estimated from the unweighted residuals, or ψ from a column; nls weights = 1/ψ), the same
// fit measures (e = predicted − observed), standard errors, t intervals, AIC, and the interval at the point the page
// shows. No DOM.
import { interval } from './calc.js';
import { header, readBlock, fbModel, FB_NUM, FB_OUT, rStr, rNum, rComment } from '../core/rcode.js';

const RESERVED = new Set(['if', 'else', 'repeat', 'while', 'function', 'for', 'next', 'break', 'TRUE', 'FALSE', 'NULL', 'Inf', 'NaN', 'NA', 'NA_integer_', 'NA_real_', 'NA_character_', 'NA_complex_', 'in']);
/** A formula name as an R name (backquoted when it is not a syntactic R name, e.g. it starts with _). */
export const rName = n => /^[A-Za-z][A-Za-z0-9_]*$/.test(n) && !RESERVED.has(n) ? n : '`' + n + '`';

const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4 };
/**
 * A formula tree (core/expr.js) as R code. R's precedence for these operators is the tool's: ^ binds tighter than unary
 * minus and is right-associative (−x^2 = −(x^2)); ln is R's log; exp, log10, sqrt, abs and pi are R's own.
 */
export function toR(n) {
  const wrap = (c, need) => need ? `(${toR(c)})` : toR(c), pr = c => c.k in PREC ? PREC[c.k] : 9;
  switch (n.k) {
    case 'num': return n.pi ? 'pi' : rNum(n.v);
    case 'name': return rName(n.v);
    case 'fn': return `${n.f === 'ln' ? 'log' : n.f}(${toR(n.a)})`;
    case 'neg': return '-' + wrap(n.a, pr(n.a) < PREC.neg || n.a.k === 'neg');
    case '^': return wrap(n.a, pr(n.a) <= PREC['^']) + '^' + wrap(n.b, pr(n.b) < PREC.neg);
    default: { const p = PREC[n.k], right = n.k === '-' || n.k === '/'; return wrap(n.a, pr(n.a) < p) + ` ${n.k} ` + wrap(n.b, right ? pr(n.b) <= p : pr(n.b) < p); }
  }
}
const rStrs = xs => `c(${xs.map(rStr).join(', ')})`;
const rList = (names, vals) => `list(${names.map((p, j) => `${rName(p)} = ${rNum(vals[j])}`).join(', ')})`;

/**
 * s = the page's settings { imp, src, decimal, y }, R = the page's results { rows, y, dropped, fits: [{ i, label, md, c,
 * X, fit, wcol }] }, iv = the interval the page shows { idx, point: { var: value }, wv } or null,
 * o = { lang, created, version, fileName }.
 */
export function buildR(s, R, iv, o) {
  const tr = o.lang === 'tr', T = (a, b) => (tr ? a : b), hd = c => c == null ? '' : String(s.src.headers[c]);
  const fitted = R.fits.filter(q => q.fit.status === 'ok' || q.fit.status === 'singular');
  const out = [];
  out.push(header({ title: T('Doğrusal Olmayan Regresyon: R kodu', 'Nonlinear Regression: R code'), tool: { id: 'dogrusal-olmayan-regresyon', version: o.version }, created: o.created, lang: o.lang, packages: [],
    notes: [T('Modeller doğrusal olmayan en küçük kareler ile fit edilir (araç: Levenberg–Marquardt, tam Jacobian; R: nls, Gauss–Newton, türevler R\'ın deriv işleviyle). R aracın çözümünün geldiği başlangıç değerlerinden başlar; orada yakınsamazsa aracın tahminlerinden başlar ve bunu yazar.',
      'The models are fitted by nonlinear least squares (tool: Levenberg–Marquardt with exact Jacobians; R: nls, Gauss–Newton with derivatives from R\'s deriv). R starts from the values the tool\'s solution came from; if it does not converge there, it starts from the tool\'s estimates and says so.'),
    T('Ağırlık (Parresol 2001): Var(e) = σ²ψ; nls ağırlığı 1/ψ. ψ = X^θ (θ verilmişse o, verilmemişse ağırlıksız fit artıklarından ln e² = ln σ² + θ ln X ile) ya da ψ bir sütundan.',
      'Weights (Parresol 2001): Var(e) = σ²ψ; the nls weight is 1/ψ. ψ = X^θ (θ as given or, when not given, from ln e² = ln σ² + θ ln X on the unweighted residuals) or ψ from a column.'),
    T('Hata = tahmin − gözlem; RMSE = √(SSE/n); R² = 1 − SSE/SST; σ = √(S/(n − p)), S ağırlıklı kalıntı kareler toplamı. AIC R\'ın logLik\'iyle (k = katsayı sayısı + 1; tahmin edilen θ sayılmaz), aracınkiyle aynı.',
      'Error = predicted − observed; RMSE = √(SSE/n); R² = 1 − SSE/SST; σ = √(S/(n − p)), S the weighted residual sum of squares. AIC from R\'s logLik (k = number of coefficients + 1; an estimated θ not counted), as in the tool.')] }));
  out.push(readBlock(s.imp, o.lang, o.fileName, s.decimal));
  out.push(FB_NUM, '', FB_OUT, '');
  // the columns every model and weight uses: a number in each (weight columns > 0), as the tool compares models on the same rows
  const need = new Map([[s.y, false]]);
  for (const q of R.fits) { if (!q.c) continue; for (const v of q.c.vars) if (!need.has(q.md.map[v])) need.set(q.md.map[v], false); if (q.wcol != null) need.set(q.wcol, true); }
  const cols = [...need.keys()];
  out.push(rComment(T('Ayarlar (araçtaki gibi)', 'Settings (as in the tool)')),
    `dec <- ${rStr(s.decimal)}   # ${T('ondalık ayırıcı', 'decimal separator')}`,
    `col_y <- ${s.y + 1}   # ${T('yanıt', 'response')}: ${hd(s.y)}`,
    `num <- function(k) fb_num(dat[[k]], dec)$value`, '',
    rComment(T('Ortak satırlar: modellerin ve ağırlıkların kullandığı her sütunda sayı (ağırlık sütunlarında > 0); bütün modeller aynı ağaçlarda karşılaştırılır.',
      'Common rows: a number in every column the models and weights use (> 0 in weight columns); all models are compared on the same trees.')),
    `need <- c(${cols.map(c => c + 1).join(', ')})   # ${cols.map(hd).join(', ')}`,
    `positive <- c(${cols.map(c => need.get(c) ? 'TRUE' : 'FALSE').join(', ')})`,
    `keep <- Reduce(\`&\`, lapply(seq_along(need), function(j) { v <- num(need[j]); !is.na(v) & (!positive[j] | v > 0) }))`,
    `y <- num(col_y)[keep]; rows_used <- row_no[keep]; n <- length(y)`,
    `cat(${rStr(T('Kullanılan satır: ', 'Rows used: '))}, n, ${rStr(T('; dışarıda kalan: ', '; left out: '))}, sum(!keep), "\\n")`, '');
  out.push(fbModel(o.lang), '');
  out.push(`fb_nls <- function(form, data, start, fallback) {
  ctl <- nls.control(maxiter = 1000, tol = 1e-8, minFactor = 1e-12)
  f <- tryCatch(nls(form, data = data, start = start, weights = .w, control = ctl), error = function(e) NULL)
  if (is.null(f) && !is.null(fallback)) {
    message(${rStr(T('nls aracın başlangıcından yakınsamadı; aracın tahminlerinden başlıyor', 'nls did not converge from the tool\'s start; starting from the tool\'s estimates'))})
    f <- tryCatch(nls(form, data = data, start = fallback, weights = .w, control = ctl), error = function(e) NULL)
  }
  f
}
fb_report <- function(id, f, data, level, se_ok) {
  th <- coef(f); pred <- fitted(f); e <- pred - data$.y; sse <- sum(e^2)
  out <- list(); out[paste0(id, ".", names(th))] <- as.list(unname(th))
  m <- c(n = length(e), rmse = sqrt(sse / length(e)), bias = mean(e), mae = mean(abs(e)), r2 = 1 - sse / sum((data$.y - mean(data$.y))^2), sigma = summary(f)$sigma, aic = AIC(f))
  for (k in names(m)) out[[paste0(id, ".", k)]] <- unname(m[[k]])
  if (se_ok) {
    se <- summary(f)$coefficients[, 2]; tq <- qt(1 - (1 - level) / 2, df.residual(f))
    out[paste0(id, ".se.", names(th))] <- as.list(unname(se)); out[paste0(id, ".lo.", names(th))] <- as.list(unname(th - tq * se)); out[paste0(id, ".hi.", names(th))] <- as.list(unname(th + tq * se))
    print(cbind(estimate = th, se = se, lower = th - tq * se, upper = th + tq * se))
  } else print(th)
  cat("RMSE", signif(m[["rmse"]], 8), " bias", signif(m[["bias"]], 8), " R2", signif(m[["r2"]], 8), " AIC", signif(m[["aic"]], 10), "\\n")
  out
}
res <- list()
fits <- list()
`);
  for (const q of R.fits) {
    const id = 'm' + (q.i + 1), x = q.fit;
    const title = `${q.label}: ${q.md.kind === 'ready' ? (q.md.ready + ', ') : ''}y = ${q.c ? q.c.text : q.md.expr}`;
    if (!fitted.includes(q)) { out.push(rComment(T(`${title}\nAraçta fit edilmedi (${x.status}${x.code ? ', ' + x.code : ''}); R'da da fit edilmez.`, `${title}\nNot fitted by the tool (${x.status}${x.code ? ', ' + x.code : ''}); not fitted in R either.`)), ''); continue; }
    const vars = q.c.vars, w = x.weight || { kind: 'none' }, wc = q.wcol;
    out.push(rComment(`${title}\n${vars.map(v => `${v} = ${hd(q.md.map[v])}`).join(', ')}${w.kind === 'none' ? '' : `; ${T('ağırlık', 'weight')}: ${w.kind === 'power' ? `ψ = ${hd(wc)}^θ${w.estimated ? T(' (θ tahmin edilir)', ' (θ estimated)') : ''}` : `ψ = ${hd(wc)}`}`}`),
      `${id}_data <- data.frame(.y = y, ${vars.map(v => `${rName(v)} = num(${q.md.map[v] + 1})[keep]`).join(', ')}, check.names = FALSE)`,
      `${id} <- fb_model(quote(${toR(q.c.ast)}), ${rStrs(q.c.params)}, ${rStrs(vars)})`,
      `${id}_start <- ${rList(q.c.params, x.start)}   # ${q.md.kind === 'ready' && !(q.md.starts && Object.values(q.md.starts).some(v => String(v).trim() !== '')) ? T('aracın veriden seçtiği başlangıç', 'the start the tool chose from the data') : T('kullanıcının başlangıç değerleri', 'the user\'s starting values')}`,
      `${id}_tool <- ${rList(q.c.params, x.theta)}   # ${T('aracın tahminleri', 'the tool\'s estimates')}`);
    if (w.kind === 'power' && w.estimated) out.push(
      `${id}_wx <- num(${wc + 1})[keep]`,
      `${id}_data$.w <- 1`,
      `${id}_u <- fb_nls(${id}$form, ${id}_data, ${rList(q.c.params, x.ustart)}, NULL)   # ${T('ağırlıksız fit (aracın başlangıcı)', 'unweighted fit (the tool\'s start)')}`,
      `${id}_e <- ${id}_data$.y - fitted(${id}_u); ${id}_ok <- ${id}_e != 0 & is.finite(${id}_e)`,
      `${id}_theta <- unname(coef(lm(log(${id}_e[${id}_ok]^2) ~ log(${id}_wx[${id}_ok])))[2])   # ${T('Parresol 2001, Denk. 4–5', 'Parresol 2001, Eq. 4–5')}`,
      `cat(${rStr(id + ': θ = ')}, signif(${id}_theta, 10), "\\n"); res[[${rStr(id + '.theta_w')}]] <- ${id}_theta`,
      `${id}_data$.w <- 1 / ${id}_wx^${id}_theta`,
      `${id}_start <- as.list(coef(${id}_u))   # ${T('araçtaki gibi ağırlıklı fit ağırlıksız tahminlerden başlar', 'as in the tool, the weighted fit starts from the unweighted estimates')}`);
    else if (w.kind === 'power') out.push(`${id}_theta <- ${rNum(w.theta)}`, `${id}_data$.w <- 1 / num(${wc + 1})[keep]^${id}_theta`);
    else if (w.kind === 'column') out.push(`${id}_data$.w <- 1 / num(${wc + 1})[keep]`);
    else out.push(`${id}_data$.w <- 1`);
    out.push(`fits[[${rStr(id)}]] <- f <- fb_nls(${id}$form, ${id}_data, ${id}_start, ${id}_tool)`,
      `cat("\\n", ${rStr(q.label)}, "\\n")`,
      `if (is.null(f)) cat(${rStr(T('fit edilemedi', 'not fitted'))}, "\\n") else res <- c(res, fb_report(${rStr(id)}, f, ${id}_data, ${rNum(x.level)}, ${x.status === 'ok' ? 'TRUE' : 'FALSE'}))`, '');
  }
  // interval at a point (the page's interval card)
  const q = iv && R.fits[iv.idx];
  if (q && q.fit.status === 'ok') {
    const w = q.fit.weight, id = 'm' + (q.i + 1);
    const psi = w.kind === 'none' ? 1 : w.kind === 'power' ? iv.wv ** w.theta : iv.wv;
    const r = interval(q.c, q.fit, iv.point, psi);
    if (r && q.c.vars.every(v => iv.point[v] > 0)) {
      out.push(rComment(T(`Bir noktada tahmin, ortalamanın güven aralığı ve yeni gözlemin tahmin aralığı (Parresol 2001, Denk. 10–11; gradyan R\'ın deriv\'iyle, olmazsa sayısal): ${q.label}`,
        `Prediction at a point, confidence interval of the mean and prediction interval of a new observation (Parresol 2001, Eq. 10–11; gradient from R\'s deriv, else numerical): ${q.label}`)),
        `f <- fits[[${rStr(id)}]]`,
        `pt <- ${rList(q.c.vars, q.c.vars.map(v => iv.point[v]))}`,
        `psi_pt <- ${w.kind === 'none' ? '1' : w.kind === 'power' ? `${rNum(iv.wv)}^${id}_theta` : rNum(iv.wv)}   # ${T('ψ noktada', 'ψ at the point')}`,
        `g <- fb_grad(${id}, coef(f), pt)`,
        `yhat <- eval(${id}$rhs, c(as.list(coef(f)), pt)); S2 <- drop(g %*% vcov(f) %*% t(g)); tq <- qt(1 - (1 - ${rNum(q.fit.level)}) / 2, df.residual(f)); s2 <- summary(f)$sigma^2`,
        `iv <- c(yhat = yhat, ci_lo = yhat - tq * sqrt(S2), ci_hi = yhat + tq * sqrt(S2), pi_lo = yhat - tq * sqrt(S2 + s2 * psi_pt), pi_hi = yhat + tq * sqrt(S2 + s2 * psi_pt))`,
        `print(iv); for (k in names(iv)) res[[paste0("iv.", k)]] <- unname(iv[[k]])`, '');
    }
  }
  out.push(`fb_out(res)`, '');
  return out.join('\n');
}
