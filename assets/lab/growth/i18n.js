// Growth function fitter: TR/EN texts.
import { makeT } from '../core/i18n.js';

export const T = makeT({
  en: {
    privacy: 'Your file is processed and stored only in this browser (IndexedDB); nothing is sent to the server.',
    'step.1': 'Data', 'step.2': 'Models', 'step.3': 'Results', next: 'Continue', back: 'Back', reset: 'Reset session', none: '—', calc: 'Fit',
    restored: p => `Previous session restored (${p.when}).`,
    'd.h': 'Age–size data', 'd.sub': 'One row per observation: age (years) and size (height, diameter, volume…). The series column is optional (e.g. a tree in stem analysis); one curve is fitted to all observations.',
    'd.col.series': 'Series (optional)', 'd.col.t': 'Age (years)', 'd.col.y': 'Size', 'd.var': 'Name of the variable', 'd.unit': 'Its unit', 'd.dec': 'Decimal separator', 'd.dec.dot': 'point', 'd.dec.comma': 'comma',
    'd.need': 'Choose the age and size columns.', 'd.read': p => `${p.n} observations read${p.s ? `, ${p.s} series` : ''}.`, 'd.prob': p => `${p.n} row(s) could not be read (rows ${p.rows}).`,
    'd.sample': 'Load the sample data', 'd.sample.note': 'The sample is simulated (not real measurements): three stem-analysis series, age and height.',
    'm.h': 'Models to fit', 'm.note': 'All parameters stay positive (growing curves with an asymptote). Starting values are the best of a small grid.', 'm.need': 'Choose at least one model.',
    'm.src.B': 'source read [B]', 'm.src.A': 'cited from a secondary source [A]', 'm.korf': 'Korf: not added, its source has not been read yet.',
    'r.h': 'Model comparison', 'r.model': 'Model', 'r.status': 'Status', 'r.params': 'Coefficients (SE)', 'r.rmse': 'RMSE', 'r.bias': 'Bias', 'r.rse': 'σ̂', 'r.aic': 'AIC', 'r.asym': 'Asymptote', 'r.infl': 'Inflection age', 'r.mai': 'MAI culmination age',
    'r.status.ok': 'converged', 'r.status.noconverge': 'did not converge', 'r.status.invalid': 'could not be fitted',
    'r.note': 'Bias = observed − predicted. σ̂ = √(SSE/(n − p)). AIC compares only models fitted to the same data. Standard errors assume independent observations; the measurements of one series are not independent, so the real uncertainty is larger.',
    'r.curves': 'Observations and fitted curves', 'r.age': 'Age (years)', 'r.sel': 'Model for the details', 'r.inc': 'Current (CAI) and mean (MAI) annual increment', 'r.cai': 'CAI = dy/dt', 'r.maiL': 'MAI = y/t', 'r.resid': 'Residuals (observed − predicted)',
    'r.der': p => `Asymptote ${p.a}; inflection point (maximum CAI) ${p.i}; MAI culmination ${p.m}.`, 'r.der.none': 'none',
    'r.cit': 'Source (required; e.g. "my own stem analyses, 2025, unpublished")', 'r.save': 'Save to the coefficient library', 'r.saved': 'The fitted curve was saved to the library.', 'r.cit.need': 'Enter a source to save.',
    'r.rcode': 'R code (.R)', 'r.rcode.note': 'The R code redoes this run in base R (nls) with the same settings: the same observations, functions and starting values; increments and culmination ages from R\'s deriv; the table of the chosen function. The data are not embedded; change the file name at the top of the script to the path of your file (an approved package or pasted table comes along as a CSV file). The site\'s tests check in R at every release that this code gives the tool\'s numbers.',
    'r.excel': 'Excel', 'r.csv': 'CSV', 'r.json': 'JSON', 'r.svg': 'SVG', 'r.tab': 'Curve table', 'r.step': 'Step (years)',
    'x.info': 'Info', 'x.cmp': 'Comparison', 'x.pred': 'Predictions', 'x.curve': 'Curves', 'x.k': 'Field', 'x.v': 'Value', 'x.tool': 'Tool', 'x.date': 'Date', 'x.lang': 'Language', 'x.data': 'Data', 'x.var': 'Variable', 'x.forms': 'Forms',
  },
});
