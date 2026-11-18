// Volume Equations: the "R code" script (core/rcode.js). It redoes the run in base R (stats::lm) with the tool's
// settings: the same trees for each form (D > 0, V > 0, H > 0 when the form needs it), the forms of Kershaw et al. (2016)
// as linear regressions, weights σ² ∝ X^k (k given or the slope of ln e² on ln X of the OLS residuals, Parresol 1999),
// the back-transformation correction of the log forms (none or Baskerville exp(s²/2)), the measures on the volume scale.
// No DOM.
import { FORMS } from './calc.js';
import { header, readBlock, FB_NUM, FB_OUT, rStr, rNum, rComment } from '../core/rcode.js';

/** Each form in R: the lm formula, the book's parameters from the coefficients cc, the volume from p, the weight variable. */
const R_FORMS = {
  cf: { lm: 'V ~ 0 + I(D^2 * H)', p: 'c(b1 = cc[[1]])', v: 'p[["b1"]] * D^2 * H' },
  cv: { lm: 'V ~ I(D^2 * H)', p: 'c(b0 = cc[[1]], b1 = cc[[2]])', v: 'p[["b0"]] + p[["b1"]] * D^2 * H' },
  ln: { lm: 'log(V) ~ log(D) + log(H)', p: 'c(b1 = exp(cc[[1]]), b2 = cc[[2]], b3 = cc[[3]])', v: 'p[["b1"]] * D^p[["b2"]] * H^p[["b3"]]' },
  loc: { lm: 'V ~ I(D^2)', p: 'c(b0 = cc[[1]], b1 = cc[[2]])', v: 'p[["b0"]] + p[["b1"]] * D^2' },
  locln: { lm: 'log(V) ~ log(D)', p: 'c(b0 = exp(cc[[1]]), b1 = cc[[2]])', v: 'p[["b0"]] * D^p[["b1"]]' },
};
const WX = { d2h: 'D^2 * H', d2: 'D^2' };

/**
 * s = { imp, src (the table the script reads), map: { D, H, V } (columns of src), decimal, note (where the trees came
 * from) }, R = the page's results { fits: [{ id, opts, status, … }] }, o = { lang, created, version, fileName }.
 */
export function buildR(s, R, o) {
  const tr = o.lang === 'tr', T = (a, b) => (tr ? a : b), hd = c => c == null ? '' : String(s.src.headers[c]);
  const out = [];
  out.push(header({ title: T('Hacim Denklemleri: R kodu', 'Volume Equations: R code'), tool: { id: 'hacim-denklemleri', version: o.version }, created: o.created, lang: o.lang, packages: [],
    notes: [T('Biçimler (Kershaw ve ark. 2016, §6.2) doğrusal regresyon olarak lm ile fit edilir; logaritmik biçimler ln ölçeğinde. Ağırlık: σ² ∝ X^k, lm ağırlığı 1/X^k; k verilmemişse ağırlıksız artıklardan ln e² = a + k ln X (Parresol 1999).',
      'The forms (Kershaw et al. 2016, §6.2) are fitted as linear regressions by lm; the logarithmic forms on the ln scale. Weights: σ² ∝ X^k, the lm weight 1/X^k; when k is not given, from ln e² = a + k ln X on the unweighted residuals (Parresol 1999).'),
    T('Logaritmik biçimlerde geri dönüşüm düzeltmesi: yok ya da Baskerville exp(s²/2), s ln ölçeğindeki kalıntı standart hatası. Ölçütler hacim ölçeğinde: hata = tahmin − gözlem, RMSE = √(SSE/n), R² = 1 − SSE/SST.',
      'Back-transformation correction of the log forms: none or Baskerville exp(s²/2), s the residual standard error on the ln scale. Measures on the volume scale: error = predicted − observed, RMSE = √(SSE/n), R² = 1 − SSE/SST.'),
    ...(s.note ? [s.note] : [])] }));
  out.push(readBlock(s.imp, o.lang, o.fileName, s.decimal));
  out.push(FB_NUM, '', FB_OUT, '');
  out.push(rComment(T('Ayarlar (araçtaki gibi)', 'Settings (as in the tool)')),
    `dec <- ${rStr(s.decimal)}   # ${T('ondalık ayırıcı', 'decimal separator')}`,
    `num <- function(k) fb_num(dat[[k]], dec)$value`,
    `trees <- data.frame(row = row_no,`,
    `  D = num(${s.map.D + 1}),   # ${hd(s.map.D)} (cm)`,
    `  H = ${s.map.H != null ? `num(${s.map.H + 1})` : 'NA_real_'},   # ${s.map.H != null ? hd(s.map.H) + ' (m)' : T('boy sütunu yok', 'no height column')}`,
    `  V = num(${s.map.V + 1}))   # ${hd(s.map.V)} (m³)`,
    `cat(${rStr(T('Ağaç: ', 'Trees: '))}, nrow(trees), "\\n")`, '');
  out.push(`fb_metrics <- function(obs, pred) {
  e <- pred - obs; sse <- sum(e^2)
  c(n = length(e), rmse = sqrt(sse / length(e)), bias = mean(e), mae = mean(abs(e)), r2 = 1 - sse / sum((obs - mean(obs))^2))
}
res <- list(); fits <- list()
`);
  for (const x of R.fits) {
    const F = FORMS[x.id], rf = R_FORMS[x.id], id = x.id;
    if (x.status !== 'ok') { out.push(rComment(T(`${F.formula}: araçta fit edilmedi (${x.code}); R'da da fit edilmez.`, `${F.formula}: not fitted by the tool (${x.code}); not fitted in R either.`)), ''); continue; }
    const w = x.weight, log = F.scale === 'log';
    out.push(rComment(`${F.formula} (Kershaw et al. 2016, ${F.eq})${w.kind === 'power' ? `; ${T('ağırlık', 'weight')} σ² ∝ (${WX[w.var]})^k${w.estimated ? T(', k tahmin edilir', ', k estimated') : ''}` : ''}${log ? `; ${T('düzeltme', 'correction')}: ${x.correction}` : ''}`),
      `d <- subset(trees, is.finite(D) & D > 0 & is.finite(V) & V > 0${F.needsH ? ' & is.finite(H) & H > 0' : ''})`,
      `d$w <- 1`);
    if (w.kind === 'power') {
      out.push(`X <- with(d, ${WX[w.var]})`);
      if (w.estimated) out.push(`e <- residuals(lm(${rf.lm}, data = d))`,
        `k <- unname(coef(lm(log(e^2) ~ log(X), subset = is.finite(log(e^2)) & is.finite(log(X))))[2])   # ${T('Parresol 1999, Denk. 15', 'Parresol 1999, Eq. 15')}`);
      else out.push(`k <- ${rNum(w.k)}`);
      out.push(`d$w <- 1 / X^k; res[[${rStr(id + '.k')}]] <- k`);
    }
    out.push(`fits$${id} <- f <- lm(${rf.lm}, data = d, weights = w)`,
      `cc <- unname(coef(f)); se <- unname(summary(f)$coefficients[, 2]); s <- summary(f)$sigma`,
      `p <- ${rf.p}`,
      `cf <- ${log ? (x.correction === 'baskerville' ? 'exp(s^2 / 2)   # Baskerville' : `1   # ${T('düzeltme yok', 'no correction')}`) : '1'}`,
      `pred <- with(d, ${rf.v}) * cf; m <- fb_metrics(d$V, pred)`,
      `cat("\\n", ${rStr(F.formula)}, "\\n"); print(summary(f)$coefficients); print(c(p, s = s, cf = cf, m))`,
      `res[paste0(${rStr(id + '.c')}, seq_along(cc))] <- as.list(cc); res[paste0(${rStr(id + '.se')}, seq_along(se))] <- as.list(se); res[paste0(${rStr(id + '.')}, names(p))] <- as.list(unname(p))`,
      `res[[${rStr(id + '.s')}]] <- s; res[[${rStr(id + '.cf')}]] <- cf; for (q in names(m)) res[[paste0(${rStr(id + '.')}, q)]] <- unname(m[[q]])`, '');
  }
  out.push(`fb_out(res)`, '');
  return out.join('\n');
}
