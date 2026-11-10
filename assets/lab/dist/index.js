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
import { normalRecover, lognormalRecover, gammaRecover } from './recover/moments.js';

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
registerMethod(normalRecover);
registerMethod(lognormalRecover);
registerMethod(gammaRecover);

export * from './registry.js';
export * as gof from './gof.js';
export * from './data.js';
