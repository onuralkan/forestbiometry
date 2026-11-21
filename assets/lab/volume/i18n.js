// Volume equations (SV-04): TR/EN interface texts.
import { makeT } from '../core/i18n.js';

export const T = makeT({
  en: {
    privacy: 'Your data and coefficient sets stay in this browser; nothing is sent to the server. The site contains no species or regional coefficients.',
    'step.1': 'Data', 'step.2': 'Equations', 'step.3': 'Results', next: 'Next', back: 'Back', reset: 'Reset session', calc: 'Fit', none: '—',
    restored: p => `Previous session restored (${p.when}).`,
    'tb.h': 'Tree table', 'tb.sub': 'One tree of known volume per row: diameter at breast height D (cm), total height H (m; not needed by the local equations), volume V (m³; e.g. the result of the Stem Section Volume tool).',
    'map.D': 'Diameter at breast height D (cm)', 'map.H': 'Height H (m)', 'map.V': 'Volume V (m³)', 'map.id': 'Tree (optional)', 'map.bark': 'Bark side of the volume', 'bark.ob': 'over bark', 'bark.ib': 'under bark', 'bark.na': 'not stated',
    'dec.h': 'Decimal separator', 'dec.dot': 'point (12.5)', 'dec.comma': 'comma (12,5)', 'map.use': 'Use this table', 'map.ok': p => `${p.n} trees read.`,
    'sv.h': 'or from the Stem Section Volume tool', 'sv.sub': 'If you linked the approved data in the Stem Section Volume tool and used "Send the volumes", the trees of the active package (D, H) are joined with the sent volumes.',
    'sv.use': 'Use the sent volumes', 'sv.none': 'No volumes have been sent for the active data package.', 'sv.info': p => `Sent volumes: ${p.tool}, ${p.when}, method ${p.m}; ${p.n} trees.`, 'sv.side': 'Bark side',
    'sample': 'Load the simulated table', 'sample.note': 'Simulated data for trying out (random numbers; not any species\' values).',
    'src.current': 'Data in use', 'src.info': p => `${p.name}: ${p.n} trees (${p.bark}).`, 'need.data': 'Choose data first.',
    'f.h': 'Equation forms', 'f.sub': 'Kershaw et al. (2016) §6.2: standard (D and H) and local (D only) volume equations. Choose several forms to compare them.',
    'f.cf': 'Constant form factor V = b1·D²H (6.22)', 'f.cv': 'Combined variable V = b0 + b1·D²H (6.23)', 'f.ln': 'Logarithmic ln V = ln b1 + b2·ln D + b3·ln H (6.24–6.25)', 'f.loc': 'Local V = b0 + b1·D²', 'f.locln': 'Local logarithmic ln V = ln b0 + b1·ln D (6.29)',
    'w.h': 'Weight', 'w.none': 'none (equal variance)', 'w.power': p => `σ² ∝ (${p.v})^k`, 'w.k': 'k (empty: estimate)', 'corr.h': 'Back-transformation', 'corr.none': 'no correction', 'corr.baskerville': 'Baskerville exp(s²/2)',
    'f.note': 'Weights are for the forms on the volume scale: error variance proportional to X^k (Parresol 1999, Eq. 12); if k is left empty it is estimated from the least-squares residuals by ln e² = a₁ + k·ln X (Eq. 15). Logarithmic forms have no weights; the Baskerville correction of the back-transformation is optional.',
    'p.forms': 'Choose at least one form', 'p.k': 'k must be a number or left empty',
    'r.cmp': 'Comparison (volume scale)', 'r.form': 'Form', 'r.n': 'n', 'r.s': 's (fit scale)', 'r.rmse': 'RMSE (m³)', 'r.bias': 'Bias (m³)', 'r.mae': 'MAE (m³)', 'r.r2': 'R²', 'r.w': 'Weight', 'r.cf': 'Correction',
    'r.cmpnote': 'Measures with the Model Evaluation tool\'s definitions, on the volume scale (e = observed − predicted; R² = 1 − SSE/SST). The s of logarithmic forms is on the ln scale; compare forms by the volume-scale measures.',
    'r.coef': 'Coefficients', 'r.term': 'Coefficient', 'r.est': 'Estimate', 'r.se': 'Standard error', 'r.lnnote': 'Logarithmic forms are regressions on the ln scale: the first row is ln b and its standard error; b = exp(ln b) is written as well.',
    'r.drop': p => `${p.n} tree(s) left out (missing or invalid value): rows ${p.rows}.`, 'r.bad': p => `Not fitted: ${p.why}.`,
    'e.n.few': 'too few trees for the number of coefficients', 'e.singular': 'the system is singular', 'e.weight.k': 'the variance exponent could not be estimated', 'e.weight.log': 'no weights on a logarithmic form', 'e.correction': 'invalid correction', 'e.form.unknown': 'unknown form',
    'r.k.est': 'estimated', 'ch.res': p => `${p.f}: residuals (observed − predicted)`, 'ch.x': 'Predicted V (m³)', 'ch.y': 'Residual (m³)', 'ch.obs': p => `${p.f}: observed–predicted`, 'ch.xo': 'Observed V (m³)', 'ch.yo': 'Predicted V (m³)', 'ch.svg': 'Chart (SVG)',
    'save.h': 'Save to the coefficient library', 'save.form': 'Form', 'save.cit': 'Source / description (required)', 'save.cit.ph': 'e.g. Our own felling data, 2026, n = 38', 'save.sp': 'Species (optional)', 'save.btn': 'Save the set', 'save.ok': 'Set saved; it appears in the Coefficient Library.', 'save.cit.miss': 'Fill in the source/description.',
    'ev.h': 'Send to Model Evaluation', 'ev.sub': 'The observed volumes and the volumes predicted by the fitted forms go to the Model Evaluation tool as a table; the columns are chosen when it opens. The predictions are from the fitting data (training).', 'ev.btn': 'Send and open Model Evaluation',
    'x.h': 'Download', 'x.xlsx': 'Excel report', 'x.csv': 'Trees and predictions (CSV)', 'x.json': 'JSON', 'x.fail': 'The Excel library could not be loaded.',
    'x.r': 'R code (.R)', 'x.r.note': 'The R code redoes this run in base R (lm) with the same settings: the same trees for each form, the same weights and back-transformation correction, the same measures on the volume scale. The data are not embedded; change the file name at the top of the script to the path of your file (Stem Section Volume results or a pasted table come along as a CSV file). The site\'s tests check in R at every release that this code gives the tool\'s numbers.',
    'x.r.sv': p => `The trees came from the results of ${p.src}, not from a file; the script reads them from the CSV file downloaded with it (columns: row, tree, D_cm, H_m, V_m3).`,
    'x.info': 'Info', 'x.cmp': 'Comparison', 'x.coef': 'Coefficients', 'x.trees': 'Trees', 'x.k': 'Field', 'x.v': 'Value', 'x.tool': 'Tool', 'x.date': 'Date', 'x.data': 'Data', 'x.src': 'Source', 'x.rule': 'Rule',
  },
});
