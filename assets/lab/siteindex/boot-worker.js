// Site Index (SI04): the series bootstrap off the main thread, so that the page does not freeze for large B.
// Same function and the same seed as in calc.js: the replicates are identical to an inline run.
import { bootstrapSeries } from './calc.js';
self.onmessage = e => {
  const { id, series, pairing, full, opts } = e.data;
  const out = bootstrapSeries(id, series, pairing, full, { ...opts, onProgress: b => { if (b % 25 === 0) self.postMessage({ progress: b }); } });
  self.postMessage({ done: out });
};
