// Web Worker for stand-model training (stages P16–P17): training and plot-level validation off the interface thread
// (the CDF fits re-run the recovery methods for every unit at every step). Messages: { units, cfg, K } → done | error; { kind: 'compare', units, configs, opts } → progress … done | error (stage P26).
import * as D from './index.js';
self.onmessage = e => {
  const { units, cfg, K } = e.data;
  if (e.data.kind === 'compare') {   // stage P26: comparison of methods over repeated fit / validation splits
    try {
      const r = D.standcmp.compareStand(units, e.data.configs, e.data.opts, (done, total) => self.postMessage({ type: 'progress', done, total }));
      self.postMessage({ type: 'done', cmp: { ...r, methods: r.methods.map(m => ({ ...m, byUnit: [...m.byUnit.entries()] })) } });
    } catch (err) { self.postMessage({ type: 'error', message: err.message || String(err) }); }
    return;
  }
  try {
    const m = D.stand.train(units, cfg), cv = m.status === 'ok' ? D.stand.crossValidate(units, cfg, K) : null;
    self.postMessage({ type: 'done', model: m.status === 'ok' ? D.stand.exportModel(m, cv) : m, cv });
  } catch (err) { self.postMessage({ type: 'error', message: err.message || String(err) }); }
};
