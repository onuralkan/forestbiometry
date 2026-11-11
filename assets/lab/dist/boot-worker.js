// Web Worker for the bootstrap (stage P14): the computation runs off the interface thread; progress is posted back,
// cancelling terminates the worker (no partial result is reported as a result).
import './index.js';                                   // registers every family and method in this worker
import { bootstrapGOF, bootstrapCI } from './bootstrap.js';

self.onmessage = e => {
  const m = e.data, run = m.kind === 'gof' ? bootstrapGOF : bootstrapCI;
  try { self.postMessage({ type: 'done', res: run({ ...m.args, onProgress: (k, B) => self.postMessage({ type: 'progress', k, B }) }) }); }
  catch (err) { self.postMessage({ type: 'error', message: String(err && err.message || err) }); }
};
