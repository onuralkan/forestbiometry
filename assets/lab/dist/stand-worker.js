// Web Worker for stand-model training (stages P16–P17): training and plot-level validation off the interface thread
// (the CDF fits re-run the recovery methods for every unit at every step). Messages: { units, cfg, K } → done | error.
import * as D from './index.js';
self.onmessage = e => {
  const { units, cfg, K } = e.data;
  try {
    const m = D.stand.train(units, cfg), cv = m.status === 'ok' ? D.stand.crossValidate(units, cfg, K) : null;
    self.postMessage({ type: 'done', model: m.status === 'ok' ? D.stand.exportModel(m, cv) : m, cv });
  } catch (err) { self.postMessage({ type: 'error', message: err.message || String(err) }); }
};
