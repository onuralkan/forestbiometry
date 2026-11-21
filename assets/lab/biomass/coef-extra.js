// Biomass: the tool's own optional fields of a coefficient set (stored in set.meta), shared by the tool page and the
// coefficient library page (DI-02). Used only by the Monte Carlo uncertainty (BC04, mc.js); empty = not given.
export const EXTRA = [
  { key: 'cov', type: 'text', label: { en: 'Coefficient covariance matrix (optional)' },
    note: { en: 'If the source gives the covariance matrix of the coefficients, enter it in coefficient order (a, b, c), row by row: rows separated by ";", decimal point (e.g. "0.04 -0.008; -0.008 0.0025"). Used only for the uncertainty.' } },
  { key: 'rse', type: 'number', label: { en: 'Residual standard error (optional)' },
    note: { en: 'On the scale of the equation: kg for linear forms, ln B for ln forms, log₁₀ B for log₁₀ forms. It may be the SEE of the Baskerville correction; the tool does not copy one into the other.' } }];
