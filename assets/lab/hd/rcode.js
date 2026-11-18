// Height–Diameter Modelling: the "R code" script (core/rcode.js). It redoes the run in base R (stats::nls) with the
// tool's settings: the same rows (filter, species, units, decimal separator, breast height), the six models fitted to
// z = h − bh from the starting values the tool's solution came from, the same error measures (e = predicted −
// observed), the standard errors and t intervals when the tool gives them, cross-validation with the tool's folds (fold
// of each tree written out, the seeded shuffle is the tool's), predictions of the chosen model. No DOM.
import { MODELS, LEVEL } from './calc.js';
import { header, readBlock, FB_NUM, FB_OUT, rStr, rNum, rVec, rComment } from '../core/rcode.js';

/** The model formulas and gradients in R (the same functions as calc.js MODELS; checked in CI against the tool). */
const R_MODELS = {
  naslund: { f: 'd^2 / (a + b * d)^2', g: 'u <- a + b * d; k <- -2 * d^2 / u^3; cbind(k, k * d)' },
  michailoff: { f: 'a * exp(-b / d)', g: 'e <- exp(-b / d); cbind(e, -a * e / d)' },
  curtis: { f: 'a * (d / (1 + d))^b', g: 'q <- d / (1 + d); e <- q^b; cbind(e, a * e * log(q))' },
  power: { f: 'a * d^b', g: 'e <- d^b; cbind(e, a * e * log(d))' },
  richards: { f: 'a * (1 - exp(-b * d))^c', g: 'E <- exp(-b * d); g1 <- 1 - E; gc <- g1^c; cbind(gc, a * c * g1^(c - 1) * d * E, a * gc * log(g1))' },
  weibull: { f: 'a * (1 - exp(-b * d^c))', g: 'dc <- d^c; E <- exp(-b * dc); cbind(1 - E, a * E * dc, a * E * b * dc * log(d))' },
};

/**
 * s = the page's settings { imp, src, dcol, hcol, pcol, scol, sval, fcol, fval, dunit, hunit, decimal, cv, model, nd },
 * R = the page's results { prep, inference, fits, cv: { mode, lopo, k, folds, sum } | { problem } | null },
 * nd = the new diameters (cm) of the page or null, o = { lang, created, fileName }.
 */
export function buildR(s, R, nd, o) {
  const tr = o.lang === 'tr', T = (a, b) => (tr ? a : b), col = c => c == null ? null : c + 1, hd = c => c == null ? '' : s.src.headers[c];
  const fd = { cm: 1, mm: 0.1, m: 100 }[s.dunit], fh = { m: 1, dm: 0.1, cm: 0.01 }[s.hunit], p = R.prep;
  const ok = R.fits.filter(f => f.status === 'ok'), sel = s.model && ok.find(f => f.id === s.model);
  const out = [];
  out.push(header({ title: T('Boy–Çap Modelleme: R kodu', 'Height–Diameter Modelling: R code'), tool: { id: 'boy-cap', version: o.version }, created: o.created, lang: o.lang, packages: [],
    notes: [T('Modeller doğrusal olmayan en küçük kareler ile fit edilir (araç: Levenberg–Marquardt; R: nls, Gauss–Newton). R aracın çözümünün geldiği başlangıç değerlerinden başlar; orada yakınsamazsa aracın tahminlerinden başlar ve bunu yazar.',
      'The models are fitted by nonlinear least squares (tool: Levenberg–Marquardt; R: nls, Gauss–Newton). R starts from the values the tool\'s solution came from; if it does not converge there, it starts from the tool\'s estimates and says so.'),
    T('Hata = tahmin − gözlem. RMSE = √(SSE/n); kalıntı standart hatası σ = √(SSE/(n − p)); AIC ve BIC R\'ın logLik\'iyle (k = p + 1), aracınkiyle aynı.', 'Error = predicted − observed. RMSE = √(SSE/n); residual standard error σ = √(SSE/(n − p)); AIC and BIC from R\'s logLik (k = p + 1), as in the tool.')] }));
  out.push(readBlock(s.imp, o.lang, o.fileName, s.decimal));
  out.push(FB_NUM, '', FB_OUT, '');
  out.push(rComment(T('Ayarlar (araçtaki gibi)', 'Settings (as in the tool)')),
    `dec <- ${rStr(s.decimal)}          # ${T('ondalık ayırıcı', 'decimal separator')}`,
    `bh <- ${rNum(p.bh)}               # ${T('göğüs yüksekliği (m)', 'breast height (m)')}`,
    `col_d <- ${col(s.dcol)}; f_d <- ${rNum(fd)}   # ${hd(s.dcol)} (${s.dunit} → cm)`,
    `col_h <- ${col(s.hcol)}; f_h <- ${rNum(fh)}   # ${hd(s.hcol)} (${s.hunit} → m)`,
    s.pcol != null ? `col_plot <- ${col(s.pcol)}   # ${hd(s.pcol)}` : `col_plot <- NA   # ${T('örnek alan sütunu yok', 'no plot column')}`, '');
  if (s.fcol != null && s.fval != null) out.push(rComment(T(`Süzgeç: ${hd(s.fcol)} = "${s.fval}" olan satırlar (metin, birebir)`, `Filter: rows with ${hd(s.fcol)} = "${s.fval}" (text, exact)`)),
    `keep <- dat[[${col(s.fcol)}]] == ${rStr(s.fval)}; dat <- dat[keep, , drop = FALSE]; row_no <- row_no[keep]`, '');
  if (s.scol != null && s.sval != null) out.push(rComment(T(`Tür: ${hd(s.scol)} = "${s.sval}" (boşluklar kırpılarak)`, `Species: ${hd(s.scol)} = "${s.sval}" (spaces trimmed)`)),
    `keep <- trimws(dat[[${col(s.scol)}]]) == ${rStr(s.sval)}; dat <- dat[keep, , drop = FALSE]; row_no <- row_no[keep]`, '');
  out.push(rComment(T('Satırların durumu: fit için çap ve boy geçerli olmalı, boy > bh; boyu boş satırlara ayrı tahmin yapılır (ölçülmüş boy değiştirilmez).',
    'Row status: fitting needs a valid diameter and height, height > bh; rows with an empty height get a separate prediction (the measured height is never changed).')),
    `dn <- fb_num(dat[[col_d]], dec); hn <- fb_num(dat[[col_h]], dec)`,
    `d_all <- dn$value * f_d; h_all <- hn$value * f_h`,
    `plot_all <- if (is.na(col_plot)) rep("", nrow(dat)) else trimws(dat[[col_plot]])`,
    `is_fit <- dn$status == "ok" & d_all > 0 & hn$status == "ok" & h_all > bh`,
    `is_missing <- dn$status == "ok" & d_all > 0 & hn$status == "empty"`,
    `fd <- data.frame(row = row_no[is_fit], plot = plot_all[is_fit], d = d_all[is_fit], h = h_all[is_fit])`,
    `fd$z <- fd$h - bh`,
    `cat(${rStr(T('Fit edilen ağaç: ', 'Trees fitted: '))}, nrow(fd), ${rStr(T('; boyu boş: ', '; empty height: '))}, sum(is_missing), "\\n")`, '');
  // models
  out.push(rComment(T('Modeller: z = h − bh = f(d; θ)', 'Models: z = h − bh = f(d; θ)')),
    `models <- list(`);
  out.push(MODELS.map(m => `  ${m.id} = list(formula = z ~ ${R_MODELS[m.id].f}, grad = function(th, d) { a <- th[1]; b <- th[2]; ${m.p > 2 ? 'c <- th[3]; ' : ''}${R_MODELS[m.id].g} })`).join(',\n'), ')', '');
  out.push(`fb_fit <- function(id, start, fallback, data) {
  ctl <- nls.control(maxiter = 1000, tol = 1e-8, minFactor = 1e-12)
  f <- tryCatch(nls(models[[id]]$formula, data = data, start = start, control = ctl), error = function(e) NULL)
  if (is.null(f) && !is.null(fallback)) {
    message(id, ${rStr(T(': nls aracın başlangıcından yakınsamadı; aracın tahminlerinden başlıyor', ': nls did not converge from the tool\'s start; starting from the tool\'s estimates'))})
    f <- tryCatch(nls(models[[id]]$formula, data = data, start = fallback, control = ctl), error = function(e) NULL)
  }
  f
}
fb_metrics <- function(f, data) {
  e <- fitted(f) - data$z; n <- nrow(data); sse <- sum(e^2)
  c(n = n, sse = sse, bias = mean(e), mae = mean(abs(e)), rmse = sqrt(sse / n), sigma = summary(f)$sigma, aic = AIC(f), bic = BIC(f))
}
`);
  const names = m => m.names;
  out.push(rComment(T('Aracın fit ettiği modeller ve başlangıç değerleri', 'Models the tool fitted, and their starting values')));
  out.push(`starts <- list(`);
  out.push(ok.map(f => { const m = MODELS.find(x => x.id === f.id); const L = th => `c(${names(m).map((nm, j) => `${nm} = ${rNum(th[j])}`).join(', ')})`;
    return `  ${f.id} = list(start = ${L(f.start)}, tool = ${L(f.theta)})`; }).join(',\n'), ')');
  for (const f of R.fits.filter(x => x.status !== 'ok')) out.push(rComment(T(`${f.id}: araçta fit edilmedi (${f.status}); R'da da fit edilmez.`, `${f.id}: not fitted by the tool (${f.status}); not fitted in R either.`)));
  out.push(`fits <- lapply(names(starts), function(id) fb_fit(id, as.list(starts[[id]]$start), as.list(starts[[id]]$tool), fd)); names(fits) <- names(starts)`,
    `res <- list()`,
    `for (id in names(fits)) {`,
    `  f <- fits[[id]]; if (is.null(f)) { cat(id, ${rStr(T(': fit edilemedi', ': not fitted'))}, "\\n"); next }`,
    `  mm <- fb_metrics(f, fd); th <- coef(f)`,
    `  cat("\\n", id, ":", paste(names(th), signif(th, 8), collapse = ", "), "| RMSE", signif(mm[["rmse"]], 8), "\\n")`,
    `  res[paste0(id, ".", names(th))] <- as.list(unname(th)); for (k in names(mm)) res[[paste0(id, ".", k)]] <- unname(mm[[k]])`);
  if (R.inference) out.push(
    `  ${rComment(T('Ağaçlar bağımsız sayılabildiği için (örnek alan sütunu yok ya da tek örnek alan) standart hata ve t aralıkları, araçtaki gibi:', 'Trees may be treated as independent (no plot column or one plot), so standard errors and t intervals, as in the tool:'))}`,
    `  se <- summary(f)$coefficients[, 2]; tq <- qt(1 - (1 - ${rNum(LEVEL)}) / 2, df.residual(f))`,
    `  res[paste0(id, ".se.", names(th))] <- as.list(unname(se)); res[paste0(id, ".lo.", names(th))] <- as.list(unname(th - tq * se)); res[paste0(id, ".hi.", names(th))] <- as.list(unname(th + tq * se))`);
  else out.push(`  ${rComment(T('Birden çok örnek alan: ağaçlar bağımsız değil, araç standart hata, aralık ve AIC vermez (burada hesaplanan AIC karşılaştırma için kullanılmamalı).', 'Several plots: trees are not independent, the tool gives no standard errors, intervals or AIC (the AIC computed here should not be used for comparison).'))}`);
  out.push(`}`, '');
  // cross-validation
  const cv = R.cv;
  if (cv && !cv.problem && cv.folds) {
    const foldOf = new Array(p.fitRows.length).fill(0); cv.folds.forEach((f, k) => f.test.forEach(i => { foldOf[i] = k + 1; }));
    out.push(rComment(T(`Çapraz doğrulama (${cv.mode === 'plot' ? (cv.lopo ? 'her seferinde bir örnek alan dışarıda' : 'örnek alan grupları') : 'ağaç düzeyinde'}): her ağacın katı aracınkiyle aynı (araç ${cv.mode === 'plot' && cv.lopo ? 'örnek alanları sırayla' : 'tohum 20261109 ile karıştırıp'} dağıttı). Her katta her model yalnızca eğitim ağaçlarına fit edilir; modeller, bütün modellerin yakınsadığı katların ortak dışarıda bırakılan ağaçlarında karşılaştırılır; "seçim" satırı her katta eğitim AIC'si en küçük modeli kullanır.`,
      `Cross-validation (${cv.mode === 'plot' ? (cv.lopo ? 'leave one plot out' : 'groups of plots') : 'tree level'}): each tree's fold is the tool's (the tool ${cv.mode === 'plot' && cv.lopo ? 'took the plots in order' : 'shuffled with seed 20261109'}). In each fold every model is fitted to the training trees only; models are compared on the held-out trees of the folds where all models converged; the "selection" row uses, in each fold, the model with the smallest training AIC.`)),
      `fold <- ${rVec(foldOf)}`,
      `cv_starts <- list(`);
    out.push(cv.folds.map((f, k) => `  list(${MODELS.map((m, j) => `${m.id} = ${f.starts && f.starts[j] ? `list(start = c(${m.names.map((nm, q) => `${nm} = ${rNum(f.starts[j][q])}`).join(', ')}), tool = c(${m.names.map((nm, q) => `${nm} = ${rNum(f.thetas[j][q])}`).join(', ')}))` : 'NULL'}`).join(', ')})`).join(',\n'), ')');
    out.push(`cv_err <- lapply(${rVec(MODELS.map(m => m.id), rStr)}, function(id) numeric(0)); names(cv_err) <- ${rVec(MODELS.map(m => m.id), rStr)}; sel_err <- numeric(0)
for (k in seq_along(cv_starts)) {
  tr_ <- fd[fold != k, ]; te_ <- fd[fold == k, ]; pr <- list(); aic <- c()
  for (id in names(cv_err)) { st <- cv_starts[[k]][[id]]; if (is.null(st)) next
    f <- fb_fit(id, as.list(st$start), as.list(st$tool), tr_); if (is.null(f)) next
    pr[[id]] <- bh + predict(f, newdata = te_); aic[id] <- AIC(f) }
  if (length(pr) == length(cv_err)) { for (id in names(pr)) cv_err[[id]] <- c(cv_err[[id]], pr[[id]] - te_$h)
    sel_err <- c(sel_err, pr[[names(which.min(aic))]] - te_$h) }
}
for (id in names(cv_err)) { e <- cv_err[[id]]; res[[paste0("cv.", id, ".rmse")]] <- sqrt(mean(e^2)); res[[paste0("cv.", id, ".bias")]] <- mean(e); res[[paste0("cv.", id, ".mae")]] <- mean(abs(e)) }
res[["cv.selection.rmse"]] <- sqrt(mean(sel_err^2)); res[["cv.n"]] <- length(sel_err)
cat("\\n", ${rStr(T('Çapraz doğrulama RMSE: ', 'Cross-validation RMSE: '))}, paste(names(cv_err), signif(sapply(cv_err, function(e) sqrt(mean(e^2))), 6), collapse = ", "), "\\n")
`);
  } else out.push(rComment(T('Çapraz doğrulama yapılmadı.', 'No cross-validation.')), '');
  // predictions with the chosen model
  if (sel) {
    const m = MODELS.find(x => x.id === sel.id);
    out.push(rComment(T(`Seçilen model: ${sel.id}. Boyu boş ağaçlara tahmin (ayrı sütun; fit aralığı dışındaki çaplar işaretlenir).`, `Chosen model: ${sel.id}. Predicted heights for trees without a height (separate column; diameters outside the fitted range are flagged).`)),
      `fm <- fits[[${rStr(sel.id)}]]`,
      `miss <- data.frame(row = row_no[is_missing], d = d_all[is_missing])`,
      `miss$h_pred <- bh + predict(fm, newdata = miss); miss$outside <- miss$d < min(fd$d) | miss$d > max(fd$d)`,
      `print(head(miss, 20))`,
      `if (nrow(miss)) { res[["pred.missing.n"]] <- nrow(miss); res[["pred.missing.sum"]] <- sum(miss$h_pred) }`, '');
    if (nd && nd.length) {
      out.push(rComment(T('Yeni çaplar (cm) için tahmin' + (R.inference ? ', ortalama eğrinin güven aralığı ve tek ağaç tahmin aralığı (delta yöntemi, t)' : ''), 'Predictions for the new diameters (cm)' + (R.inference ? ', confidence interval of the mean curve and single-tree prediction interval (delta method, t)' : ''))),
        `new_d <- ${rVec(nd)}`,
        `nd_tab <- data.frame(d = new_d, h_pred = bh + predict(fm, newdata = data.frame(d = new_d)))`);
      if (R.inference) out.push(`G <- models[[${rStr(sel.id)}]]$grad(coef(fm), new_d); v <- rowSums((G %*% vcov(fm)) * G); tq <- qt(1 - (1 - ${rNum(LEVEL)}) / 2, df.residual(fm)); s2 <- summary(fm)$sigma^2`,
        `nd_tab$ci_lo <- nd_tab$h_pred - tq * sqrt(v); nd_tab$ci_hi <- nd_tab$h_pred + tq * sqrt(v); nd_tab$pi_lo <- nd_tab$h_pred - tq * sqrt(s2 + v); nd_tab$pi_hi <- nd_tab$h_pred + tq * sqrt(s2 + v)`);
      out.push(`print(nd_tab)`, `for (j in seq_len(nrow(nd_tab))) for (k in names(nd_tab)[-1]) res[[paste0("nd.", j, ".", k)]] <- nd_tab[[k]][j]`, '');
    }
    void m;
  } else out.push(rComment(T('Araçta model seçilmedi: tahmin bölümü yok.', 'No model chosen in the tool: no predictions.')), '');
  out.push(`fb_out(res)`, '');
  return out.join('\n');
}
