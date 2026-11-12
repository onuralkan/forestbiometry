// Sources of the diameter distribution tool (stage P15): which references stand behind each registered family and
// method, with their reading status as marked in docs/METHODS.md ([B] read, [D] cited, not read; equations verified
// independently) and the METHODS.md section that documents the implementation. No DOM. Citations are copied from
// docs/DIST_SPEC.md (reference list) and docs/METHODS.md; nothing is added here that is not there.
import * as D from './index.js';

/** id → { cite, status: 'B'|'D', url? } */
export const REFS = {
  R1: { cite: 'Poudel, K.P., Cao, Q.V. 2013. Evaluation of methods to predict Weibull parameters for characterizing diameter distributions. Forest Science 59(2): 243–252. DOI: 10.5849/forsci.12-001', status: 'B' },
  R2: { cite: 'Parresol, B.R. 2003. Recovering parameters of Johnson\'s SB distribution. USDA Forest Service, Southern Research Station, Research Paper SRS-31.', status: 'B', url: 'https://www.srs.fs.usda.gov/pubs/rp/rp_srs031.pdf' },
  R6: { cite: 'ForestFit, fitWeibull (R package documentation).', status: 'D', url: 'https://search.r-project.org/CRAN/refmans/ForestFit/html/fitWeibull.html' },
  R7: { cite: 'ForestFit, fitJSB (R package documentation).', status: 'D', url: 'https://search.r-project.org/CRAN/refmans/ForestFit/html/fitJSB.html' },
  R8: { cite: 'fitdistrplus, Overview of the fitdistrplus package (vignette).', status: 'D', url: 'https://lbbe-software.github.io/fitdistrplus/articles/fitdistrplus_vignette.html' },
  R9: { cite: 'SciPy, scipy.stats.goodness_of_fit (documentation).', status: 'D', url: 'https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.goodness_of_fit.html' },
  R10: { cite: 'NIST/SEMATECH e-Handbook of Statistical Methods, Normal distribution.', status: 'D', url: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda3661.htm' },
  R11: { cite: 'NIST/SEMATECH e-Handbook of Statistical Methods, Lognormal distribution.', status: 'D', url: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda3669.htm' },
  R12: { cite: 'NIST/SEMATECH e-Handbook of Statistical Methods, Gamma distribution.', status: 'D', url: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda366b.htm' },
  R14: { cite: 'NIST/SEMATECH e-Handbook of Statistical Methods, Beta distribution.', status: 'D', url: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda366h.htm' },
  R15: { cite: 'NIST/SEMATECH e-Handbook of Statistical Methods, Exponential distribution.', status: 'D', url: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda3667.htm' },
  R16: { cite: 'SciPy, scipy.stats.fisk (documentation).', status: 'D', url: 'https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisk.html' },
  DUBEY: { cite: 'Dubey, S.D. 1967. Some percentile estimators for Weibull parameters. Technometrics 9(1): 119–129.', status: 'B' },
  KB91: { cite: 'Knoebel, B.R., Burkhart, H.E. 1991. A bivariate distribution approach to modeling forest diameter distributions at two points in time. Biometrics 47: 241–253.', status: 'D' },
  HF96: { cite: 'Hyndman, R.J., Fan, Y. 1996. Sample quantiles in statistical packages. The American Statistician 50(4): 361–365.', status: 'D' },
};
const FAMILY_REFS = { weibull: ['R6'], normal: ['R10'], lognormal: ['R11'], gamma: ['R12'], beta: ['R14'], johnsonsb: ['R7'], exponential: ['R15'], loglogistic: ['R16'] };
const FAMILY_SECTION = { weibull: 'P05', normal: 'P02', lognormal: 'P02', gamma: 'P03', beta: 'P04', johnsonsb: 'P08', exponential: 'P10', loglogistic: 'P10' };
const QUANTILE_REFS = { 'weibull.pct': ['DUBEY', 'HF96'], 'johnsonsb.kb': ['KB91', 'HF96'], 'johnsonsb.pct': ['HF96'], 'loglogistic.pct': ['HF96'] };

/** { refs: [id], section: 'P05' …, stage } for a registered method id. */
export function methodSources(id) {
  const m = D.method(id), fam = m.family;
  if (m.source === 'parresol2003') return { refs: ['R2'], section: 'P09' };
  if (String(m.source).startsWith('poudel2013.')) return { refs: ['R1'], section: m.hybrid ? 'P07' : 'P06' };
  if (m.truncation) return { refs: FAMILY_REFS[fam], section: 'P11' };
  if (['lmom', 'qme', 'mge'].includes(m.estimator)) return { refs: [...FAMILY_REFS[fam], ...(m.estimator === 'lmom' ? [] : ['R8'])], section: 'P18' };
  if (m.grouped) return { refs: FAMILY_REFS[fam], section: 'P12' };
  if (m.kind === 'recover') return { refs: FAMILY_REFS[fam], section: FAMILY_SECTION[fam] };
  return { refs: [...FAMILY_REFS[fam], ...(QUANTILE_REFS[id] || [])], section: FAMILY_SECTION[fam] };
}
/** Bootstrap (stage P14). */
export const BOOT_SOURCES = { refs: ['R9'], section: 'P14' };
/** Distinct reference ids over a list of method ids (in REFS order). */
export function refsOf(ids, extra = []) {
  const s = new Set([...ids.flatMap(id => methodSources(id).refs), ...extra]);
  return Object.keys(REFS).filter(k => s.has(k));
}
