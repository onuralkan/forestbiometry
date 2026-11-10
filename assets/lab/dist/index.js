// Registers the families and methods that are implemented AND verified. Anything not listed here does not exist
// for the interface (docs/DIST_SPEC.md §0, rule 8).
import { registerFamily, registerMethod } from './registry.js';
import { weibull } from './families/weibull.js';
import { weibullML, weibullMoments } from './fit/weibull.js';

registerFamily(weibull);
registerMethod(weibullML);
registerMethod(weibullMoments);

export * from './registry.js';
export * as gof from './gof.js';
export * from './data.js';
