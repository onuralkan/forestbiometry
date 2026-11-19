// Mixed-Effects Models: the "R code" script (core/rcode.js). It redoes the run with the R package nlme (Pinheiro and
// Bates 2000), the package the tool was checked against (tests/ref/sm03_mixed.R): the same rows (group and every column
// a model uses present; a model's own rows: ln of a positive number, variance covariate > 0), each linear model by lme
// and each nonlinear model by nlme (derivatives from R's deriv) with the tool's random effects, covariance structure
// (pdDiag / pdSymm), variance function (varPower) and method (ML / REML); fixed effects, SEs, σ, D, δ, log-likelihood, AIC,
// BIC, random-effect predictions; the likelihood-ratio test and the calibration of a new group the page shows (written
// out in R: BLUP; nonlinear one step of Vonesh and Chinchilli, or the conditional mode). No DOM.
import { header, readBlock, FB_NUM, FB_OUT, rStr, rNum, rVec, rComment } from '../core/rcode.js';
import { rName, toR } from '../nlsreg/rcode.js';
import { parse } from '../core/expr.js';

const TF_R = { x: n => rName(n), ln: n => `log(${rName(n)})`, sq: n => `I(${rName(n)}^2)` };

/**
 * s = { imp, src, decimal, g, y, vname: column → name used in the formulas }, R = the page's results { fits: [{ i, label,
 * kind, md, b, fit, text, params, rnames, vars, varCols, model, start }] }, cal = { idx, lines: [[values…, y]], pts:
 * [[values]], iterate } or null, lrt = [index, index] (both ML) or null, o = { lang, created, version, fileName }.
 */
export function buildR(s, R, cal, lrt, o) {
  const tr = o.lang === 'tr', T = (a, b) => (tr ? a : b), hd = c => c == null ? '' : String(s.src.headers[c]);
  const out = [];
  out.push(header({ title: T('Karma Etkili Modeller: R kodu', 'Mixed-Effects Models: R code'), tool: { id: 'karma-modeller', version: o.version }, created: o.created, lang: o.lang, packages: ['nlme'],
    notes: [T('Doğrusal modeller lme, doğrusal olmayanlar nlme ile (Pinheiro ve Bates 2000; araç da Lindstrom–Bates yöntemini uygular ve nlme ile sınanmıştır). Rastgele etkiler, kovaryans yapısı (pdDiag / pdSymm), varyans fonksiyonu (varPower: Var = σ²|v|^(2δ)) ve yöntem araçtakiyle aynı.',
      'Linear models by lme, nonlinear ones by nlme (Pinheiro and Bates 2000; the tool implements the Lindstrom–Bates method too and was tested against nlme). Random effects, covariance structure (pdDiag / pdSymm), variance function (varPower: Var = σ²|v|^(2δ)) and method as in the tool.'),
    T('k = sabit etkiler + kovaryans parametreleri + varyans parametresi + 1 (σ); AIC = −2ℓ + 2k; BIC\'de REML için ln(N − p), nlme\'deki gibi. Doğrusal olmayan REML\'de nlme REML optimumuna gitmeyebilir (ML göreli kesinliğinde durur); orada aracın REML olabilirliği daha yüksek çıkabilir.',
      'k = fixed effects + covariance parameters + variance parameter + 1 (σ); AIC = −2ℓ + 2k; BIC with ln(N − p) for REML, as nlme. For nonlinear REML nlme may stop short of the REML optimum (at the ML relative precision); there the tool\'s REML log-likelihood can be higher.')] }));
  out.push(readBlock(s.imp, o.lang, o.fileName, s.decimal));
  out.push(FB_NUM, '', FB_OUT, '');
  // columns: response, group, and every column a model uses, under the names the formulas use
  const cols = new Map();   // name → column
  for (const q of R.fits) {
    if (q.kind === 'linear') for (const t of q.md.terms) cols.set(s.vname(t.col), t.col);
    else q.vars.forEach((v, j) => cols.set(v, q.varCols[j]));
    if (q.md.vvar !== '' && q.md.vvar != null) { const c = +q.md.vvar; if (![...cols.values()].includes(c)) cols.set(s.vname(c), c); }
  }
  const used = [...new Set([s.y, ...cols.values()])];
  out.push(rComment(T('Ayarlar (araçtaki gibi)', 'Settings (as in the tool)')),
    `dec <- ${rStr(s.decimal)}   # ${T('ondalık ayırıcı', 'decimal separator')}`,
    `num <- function(k) fb_num(dat[[k]], dec)$value`,
    `grp <- trimws(dat[[${s.g + 1}]])   # ${T('grup', 'group')}: ${hd(s.g)}`,
    rComment(T('Ortak satırlar: grup boş değil, yanıt ve modellerin kullandığı her sütun sayı.', 'Common rows: a group, and a number in the response and in every column the models use.')),
    `keep <- grp != "" & Reduce(\`&\`, lapply(c(${used.map(c => c + 1).join(', ')}), function(k) is.finite(num(k))))   # ${used.map(hd).join(', ')}`,
    `d <- data.frame(.g = factor(grp[keep]), .y = num(${s.y + 1})[keep], row = row_no[keep])   # y: ${hd(s.y)}`);
  for (const [n, c] of cols) out.push(`d[[${rStr(n)}]] <- num(${c + 1})[keep]   # ${hd(c)}`);
  out.push(`cat(${rStr(T('Satır: ', 'Rows: '))}, nrow(d), ${rStr(T('; grup: ', '; groups: '))}, nlevels(d$.g), ${rStr(T('; dışarıda kalan: ', '; left out: '))}, sum(!keep), "\\n")`, '',
    `ctl <- lmeControl(maxIter = 500, msMaxIter = 500, niterEM = 100, tolerance = 1e-10, msTol = 1e-12)`,
    `nctl <- nlmeControl(maxIter = 500, msMaxIter = 500, pnlsMaxIter = 50, tolerance = 1e-7, pnlsTol = 1e-6, msTol = 1e-10, minScale = 1e-10)`,
    `fb_D <- function(m) unname(as.matrix(pdMatrix(m$modelStruct$reStruct[[1]]) * m$sigma^2))   # ${T('rastgele etkilerin kovaryansı', 'covariance of the random effects')}`,
    `fb_delta <- function(m) { v <- m$modelStruct$varStruct; if (is.null(v)) NA else unname(coef(v, unconstrained = FALSE)) }`,
    `fb_report <- function(id, m) {
  b <- fixef(m); se <- sqrt(diag(vcov(m))); D <- fb_D(m); re <- as.matrix(ranef(m)); out <- list()
  out[paste0(id, ".b.", seq_along(b))] <- as.list(unname(b)); out[paste0(id, ".se.", seq_along(b))] <- as.list(unname(se))
  out[[paste0(id, ".sigma")]] <- m$sigma; if (!is.na(fb_delta(m))) out[[paste0(id, ".delta")]] <- fb_delta(m)
  for (i in seq_len(nrow(D))) for (j in seq_len(ncol(D))) out[[paste0(id, ".D.", i, ".", j)]] <- D[i, j]
  out[[paste0(id, ".ll")]] <- as.numeric(logLik(m)); out[[paste0(id, ".k")]] <- attr(logLik(m), "df"); out[[paste0(id, ".aic")]] <- AIC(m); out[[paste0(id, ".bic")]] <- BIC(m)
  for (g in rownames(re)) for (j in seq_len(ncol(re))) out[[paste0(id, ".re.", g, ".", j)]] <- re[g, j]
  print(summary(m)$tTable); cat("sigma", signif(m$sigma, 8), " logLik", signif(as.numeric(logLik(m)), 10), " AIC", signif(AIC(m), 10), " BIC", signif(BIC(m), 10), "\\n"); print(D)
  out
}
res <- list(); fits <- list()
`);
  const ok = q => q.fit.status === 'ok';
  for (const q of R.fits) {
    const id = 'm' + (q.i + 1), md = q.md, vcol = md.vvar === '' || md.vvar == null ? null : +md.vvar;
    if (!ok(q)) { out.push(rComment(T(`${q.label}: y = ${q.text}\nAraçta fit edilmedi (${q.fit.code}); R'da da fit edilmez.`, `${q.label}: y = ${q.text}\nNot fitted by the tool (${q.fit.code}); not fitted in R either.`)), ''); continue; }
    const vn = vcol == null ? null : q.kind === 'linear' ? s.vname(vcol) : q.vars[q.varCols.indexOf(vcol)];
    const wArg = vn ? `, weights = varPower(form = ~ ${rName(vn)})` : '';
    const cov = q.rnames.length > 1 ? (q.fit.cov === 'symm' ? 'pdSymm' : 'pdDiag') : 'pdDiag';
    out.push(rComment(`${q.label}: y = ${q.text}\n${T('rastgele', 'random')}: ${q.rnames.join(', ')}${q.rnames.length > 1 ? ` (${cov})` : ''}; ${q.fit.method}${vn ? `; varPower(${vn})` : ''}`));
    if (q.kind === 'linear') {
      const terms = md.terms.map(t => TF_R[t.tf](s.vname(t.col)));
      const filt = [...md.terms.filter(t => t.tf === 'ln').map(t => `${rName(s.vname(t.col))} > 0`), ...(vn ? [`${rName(vn)} > 0`] : [])];
      const rterms = md.rTerms.map((b, j) => b ? terms[j] : null).filter(Boolean);
      const rf = `~ ${rterms.join(' + ') || '1'}${md.rInt ? '' : ' - 1'}`;
      const random = q.rnames.length === 1 && md.rInt ? '~ 1 | .g' : `list(.g = ${cov}(${rf}))`;
      out.push(`${id}_d <- ${filt.length ? `subset(d, ${filt.join(' & ')})` : 'd'}`,
        `fits$${id} <- m <- lme(.y ~ ${terms.join(' + ')}, random = ${random}${wArg}, data = ${id}_d, method = ${rStr(q.fit.method)}, control = ctl)`);
    } else {
      const ast = parse(q.text).ast, params = q.params, re = q.rnames;
      const filt = vn ? `subset(d, ${rName(vn)} > 0)` : 'd';
      out.push(`${id}_d <- ${filt}`,
        `${id}_f <- deriv(quote(${toR(ast)}), ${rVec(params, rStr)}, function.arg = ${rVec([...params, ...q.vars], rStr)})   # ${T('model ve parametre türevleri (deriv)', 'model and parameter derivatives (deriv)')}`,
        `${id}_start <- ${`c(${params.map((p, j) => `${rName(p)} = ${rNum(q.start[j])}`).join(', ')})`}   # ${T('aracın başlangıcı: havuzlanmış doğrusal olmayan EKK', 'the tool\'s start: pooled nonlinear least squares')}`,
        `${id}_tool <- ${`c(${params.map((p, j) => `${rName(p)} = ${rNum(q.fit.beta[j])}`).join(', ')})`}   # ${T('aracın kestirimleri', 'the tool\'s estimates')}`,
        `${id}_call <- function(st) nlme(.y ~ ${id}_f(${[...params, ...q.vars].map(rName).join(', ')}), data = ${id}_d, fixed = ${params.map(rName).join(' + ')} ~ 1,`,
        `  random = ${cov}(${re.map(rName).join(' + ')} ~ 1), groups = ~ .g, start = st${wArg}, method = ${rStr(q.fit.method)}, control = nctl)`,
        `m <- tryCatch(${id}_call(${id}_start), error = function(e) NULL)`,
        `if (is.null(m)) { message(${rStr(q.label + T(': nlme aracın başlangıcından yakınsamadı; aracın kestirimlerinden başlıyor', ': nlme did not converge from the tool\'s start; starting from the tool\'s estimates'))}); m <- ${id}_call(${id}_tool) }`,
        `fits$${id} <- m`);
      if (q.fit.method === 'REML') out.push(rComment(T('REML: nlme burada ML göreli kesinliğinde durabilir; sonuçlar araçtan ayrılabilir (başta not).', 'REML: nlme may stop here at the ML relative precision; the results can differ from the tool (see the note at the top).')));
    }
    out.push(`cat("\\n", ${rStr(q.label)}, "\\n"); res <- c(res, fb_report(${rStr(id)}, m))`, '');
  }
  // likelihood-ratio test
  if (lrt) {
    const [a, b] = lrt.map(i => R.fits[i]);
    if (a && b && ok(a) && ok(b) && a.fit.method === 'ML' && b.fit.method === 'ML') {
      const [s0, s1] = a.fit.k <= b.fit.k ? [a, b] : [b, a];
      out.push(rComment(T(`Olabilirlik oranı testi (ML): ${s0.label} ile ${s1.label}`, `Likelihood-ratio test (ML): ${s0.label} against ${s1.label}`)),
        `a <- anova(fits$m${s0.i + 1}, fits$m${s1.i + 1}); print(a)`,
        `res[["lrt.L"]] <- a$L.Ratio[2]; res[["lrt.df"]] <- diff(a$df); res[["lrt.p"]] <- a$\`p-value\`[2]`, '');
    }
  }
  // calibration of a new group
  const cq = cal && R.fits[cal.idx];
  if (cq && ok(cq) && cal.lines && cal.lines.length) {
    const id = 'm' + (cq.i + 1), nv = cq.vars.length, md = cq.md, vcol = md.vvar === '' || md.vvar == null ? null : +md.vvar;
    const vIdx = vcol == null ? -1 : cq.kind === 'linear' ? cq.vars.indexOf(s.vname(vcol)) : cq.varCols.indexOf(vcol);
    out.push(rComment(T(`Yeni bir grubun kalibrasyonu: ${cq.label}; grubun ölçümleri (sütunlar: ${cq.vars.join(', ')}, y). Rastgele etkiler modelin sabit kısmı ve varyanslarıyla, grup fit'e katılmadan.`,
      `Calibration of a new group: ${cq.label}; the group's measurements (columns: ${cq.vars.join(', ')}, y). Random effects with the model's fixed part and variances, the group not added to the fit.`)),
      `m <- fits$${id}; beta <- fixef(m); D <- fb_D(m); s2 <- m$sigma^2; dl <- fb_delta(m)`,
      `nd <- data.frame(${cq.vars.map((v, j) => `${rName(v)} = ${rVec(cal.lines.map(r => r[j]))}`).join(', ')}, check.names = FALSE); ny <- ${rVec(cal.lines.map(r => r[nv]))}`,
      `w <- ${vIdx >= 0 ? `abs(nd[[${vIdx + 1}]])^(2 * dl)` : 'rep(1, nrow(nd))'}   # ${T('varyans fonksiyonu', 'variance function')}`);
    const pts = (cal.pts || []).map(p => p[0]);
    if (cq.kind === 'linear') {
      const terms = md.terms.map(t => TF_R[t.tf](s.vname(t.col))), rterms = md.rTerms.map((b, j) => b ? terms[j] : null).filter(Boolean);
      out.push(`Xf <- function(nd) model.matrix(~ ${terms.join(' + ')}, nd); Zf <- function(nd) model.matrix(~ ${rterms.join(' + ') || '1'}${md.rInt ? '' : ' - 1'}, nd)`,
        `X <- Xf(nd); Z <- Zf(nd); V <- Z %*% D %*% t(Z) + s2 * diag(w, nrow(nd))`,
        `u <- drop(D %*% t(Z) %*% solve(V, ny - X %*% beta))   # BLUP`,
        `pr <- function(nd) cbind(fixed = drop(Xf(nd) %*% beta), calibrated = drop(Xf(nd) %*% beta + Zf(nd) %*% u))`);
    } else {
      const re = cq.rnames;
      out.push(`ref <- ${rVec(re, rStr)}`,
        `fN <- function(nd, u) { p <- beta; p[ref] <- p[ref] + u; do.call(${id}_f, c(as.list(p), as.list(nd))) }`,
        `Zat <- function(u) matrix(attr(fN(nd, u), "gradient")[, ref, drop = FALSE], ncol = length(ref))`,
        `Z0 <- Zat(rep(0, length(ref))); e0 <- ny - as.vector(fN(nd, rep(0, length(ref))))`,
        `u <- drop(D %*% t(Z0) %*% solve(s2 * diag(w, nrow(nd)) + Z0 %*% D %*% t(Z0), e0))   # ${T('tek adım (Vonesh ve Chinchilli 1997)', 'one step (Vonesh and Chinchilli 1997)')}`);
      if (cal.iterate) out.push(rComment(T('Koşullu mod: β sabit, cezalı en küçük kareler (Gauss–Newton), sıfırdan başlayarak.', 'Conditional mode: β fixed, penalized least squares (Gauss–Newton), from zero.')),
        `u <- rep(0, length(ref)); Di <- solve(D)`,
        `for (it in 1:200) { Z <- Zat(u); r <- ny - as.vector(fN(nd, u))`,
        `  du <- drop(solve(Di + t(Z) %*% (Z / (s2 * w)), t(Z) %*% (r / (s2 * w)) - Di %*% u)); u <- u + du; if (max(abs(du)) < 1e-12) break }`);
      out.push(`pr <- function(nd) cbind(fixed = as.vector(fN(nd, rep(0, length(ref)))), calibrated = as.vector(fN(nd, u)))`);
    }
    out.push(`cat("\\n", ${rStr(T('Kalibrasyon: rastgele etkiler', 'Calibration: random effects'))}, signif(u, 8), "\\n")`,
      `for (j in seq_along(u)) res[[paste0("cal.b", j)]] <- u[j]`,
      `p_obs <- pr(nd); print(cbind(nd, y = ny, p_obs)); res[["cal.fixed.sum"]] <- sum(p_obs[, 1]); res[["cal.cal.sum"]] <- sum(p_obs[, 2])`);
    if (pts.length && nv === 1) out.push(`p_new <- pr(data.frame(${rName(cq.vars[0])} = ${rVec(pts)}, check.names = FALSE)); print(p_new); for (j in seq_len(nrow(p_new))) res[[paste0("cal.pt.", j)]] <- unname(p_new[j, 2])`);
    out.push('');
  }
  out.push(`fb_out(res)`, '');
  return out.join('\n');
}
