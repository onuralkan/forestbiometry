// Registers the families and methods that are implemented AND verified. Anything not listed here does not exist
// for the interface (docs/DIST_SPEC.md §0, rule 8).
import { registerFamily, registerMethod } from './registry.js';
import { weibull } from './families/weibull.js';
import { weibullML, weibullMoments, weibullPercentiles } from './fit/weibull.js';
import { normal } from './families/normal.js';
import { lognormal } from './families/lognormal.js';
import { normalML, lognormalML, lognormalMoments } from './fit/normal.js';
import { gamma } from './families/gamma.js';
import { gammaML, gammaMoments } from './fit/gamma.js';
import { beta } from './families/beta.js';
import { betaML, betaMoments } from './fit/beta.js';
import { johnsonsb } from './families/johnsonsb.js';
import { sbCML, sbMOM, sbKB, sbPCT } from './fit/johnsonsb.js';
import { exponential } from './families/exponential.js';
import { exponentialML } from './fit/exponential.js';
import { loglogistic } from './families/loglogistic.js';
import { llML, llPCT, llLOGMOM } from './fit/loglogistic.js';
import { gengamma } from './families/gengamma.js';
import { ggML } from './fit/gengamma.js';
import { gumbel } from './families/gumbel.js';
import { gumbelML, gumbelMoments } from './fit/gumbel.js';
import { weibullM2, weibullM3, weibullM4, weibullM5, weibullM6, weibullM7, weibullM8, weibullM9, weibullM10 } from './recover/weibull.js';
import { parresolRecover } from './recover/parresol.js';
import { fonsecaRecover } from './recover/fonseca.js';
import { makeTML } from './fit/truncated.js';
import { makeGML } from './fit/grouped.js';
import { normalRecover, lognormalRecover, gammaRecover } from './recover/moments.js';
import { generalMethods } from './fit/general.js';

registerFamily(weibull);
registerMethod(weibullML);
registerMethod(weibullMoments);
registerMethod(weibullPercentiles);
registerFamily(normal);
registerFamily(lognormal);
registerMethod(normalML);
registerMethod(lognormalML);
registerMethod(lognormalMoments);
registerFamily(gamma);
registerMethod(gammaML);
registerMethod(gammaMoments);
registerFamily(beta);
registerMethod(betaML);
registerMethod(betaMoments);
registerFamily(johnsonsb);
registerMethod(sbCML);
registerMethod(sbMOM);
registerMethod(sbKB);
registerMethod(sbPCT);
registerFamily(exponential);
registerMethod(exponentialML);
registerFamily(loglogistic);
registerMethod(llML);
registerMethod(llPCT);
registerMethod(llLOGMOM);
registerFamily(gengamma);                             // P20: optional (not switched on by default), like every method of the family
registerMethod(ggML);
registerFamily(gumbel);                               // P20: maximum form only; optional
registerMethod(gumbelML);
registerMethod(gumbelMoments);
for (const m of generalMethods) registerMethod(m);   // P18: L-moments, QME, MGE (optional, not switched on by default)
// conditional ML for thresholded data (P11): one per family, built on the family's untruncated ML
for (const [f, b] of [['weibull', 'weibull.ml'], ['normal', 'normal.ml'], ['lognormal', 'lognormal.ml'], ['gamma', 'gamma.ml'], ['beta', 'beta.ml'], ['johnsonsb', 'johnsonsb.cml'], ['exponential', 'exponential.ml'], ['loglogistic', 'loglogistic.ml']]) { registerMethod(makeTML(f, b)); registerMethod(makeGML(f, b)); }
// Gumbel: the fitted model's probability of a negative diameter is reported under thresholds and classes too
const withP0 = m => m.family !== 'gumbel' ? m : { ...m, run: (i, o) => { const r = m.run(i, o); return r.status === 'ok' ? { ...r, diagnostics: { ...(r.diagnostics || {}), pBelowZero: gumbel.diagnostics(r.params).pBelowZero } } : r; } };
for (const [f, b] of [['gengamma', 'gengamma.ml'], ['gumbel', 'gumbel.ml']]) { registerMethod(withP0({ ...makeTML(f, b), optional: true })); registerMethod(withP0({ ...makeGML(f, b), optional: true })); }
registerMethod(normalRecover);
registerMethod(lognormalRecover);
registerMethod(gammaRecover);
registerMethod(weibullM2);
registerMethod(weibullM3);
registerMethod(weibullM4);
registerMethod(weibullM5);
registerMethod(weibullM6);
registerMethod(weibullM7);
registerMethod(weibullM8);
registerMethod(weibullM9);
registerMethod(weibullM10);
registerMethod(parresolRecover);
registerMethod(fonsecaRecover);

export * from './registry.js';
export { weibullSummary } from './recover/weibull.js';
export { fonsecaFromRaw } from './recover/fonseca.js';
export * as gof from './gof.js';
export * from './data.js';
export * as trunc from './truncate.js';
export * as classes from './classes.js';
export { groupedLogLik, checkGrouped } from './fit/grouped.js';
export * as compare from './compare.js';
export * as boot from './bootstrap.js';
export * as stand from './stand.js';
