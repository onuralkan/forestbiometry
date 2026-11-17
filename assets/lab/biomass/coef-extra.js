// Biomass: the tool's own optional fields of a coefficient set (stored in set.meta), shared by the tool page and the
// coefficient library page (DI-02). Used only by the Monte Carlo uncertainty (BC04, mc.js); empty = not given.
export const EXTRA = [
  { key: 'cov', type: 'text', label: { tr: 'Katsayı kovaryans matrisi (isteğe bağlı)', en: 'Coefficient covariance matrix (optional)' },
    note: { tr: 'Kaynak katsayıların kovaryans matrisini veriyorsa katsayı sırasıyla (a, b, c), satır satır girin: satırlar ";" ile, ondalık nokta (ör. "0.04 -0.008; -0.008 0.0025"). Yalnızca belirsizlik hesabında kullanılır.',
      en: 'If the source gives the covariance matrix of the coefficients, enter it in coefficient order (a, b, c), row by row: rows separated by ";", decimal point (e.g. "0.04 -0.008; -0.008 0.0025"). Used only for the uncertainty.' } },
  { key: 'rse', type: 'number', label: { tr: 'Artık standart hatası (isteğe bağlı)', en: 'Residual standard error (optional)' },
    note: { tr: 'Denklemin kendi ölçeğinde: doğrusal biçimlerde kg, ln biçimlerinde ln B, log₁₀ biçimlerinde log₁₀ B. Baskerville düzeltmesindeki SEE ile aynı olabilir; araç birinden ötekini almaz.',
      en: 'On the scale of the equation: kg for linear forms, ln B for ln forms, log₁₀ B for log₁₀ forms. It may be the SEE of the Baskerville correction; the tool does not copy one into the other.' } }];
