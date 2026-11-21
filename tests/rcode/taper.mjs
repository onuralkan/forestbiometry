// R code of the Taper fit (assets/lab/taper/rcode.js): cases for scripts/rcode-check.sh. Each case is the tool's own fit
// (fitTaper) on simulated stems (tests/ref/taper_sv02a3.json, the noisy sets), the R script the page would download,
// the observations CSV that goes with it and the numbers R must give back. Both forms, both fitting scales.
import { readFileSync } from 'node:fs';
import * as FIT from '../../assets/lab/taper/fit.js';
import { TOOL } from '../../assets/lab/taper/calc.js';
import { buildR, obsCsv } from '../../assets/lab/taper/rcode.js';

const R = JSON.parse(readFileSync(new URL('../ref/taper_sv02a3.json', import.meta.url), 'utf8'));
function stems(dvals) {
  let i = 0, row = 2;
  return { schema: 'stem-sections/1', trees: R.trees.map(t => ({ key: t.tree_id, plot_id: null, tree_id: t.tree_id, period: null, state: 'ok', dbh: t.D, height: t.H, stump_h: 0.15,
    points: t.h.map(h => ({ row: row++, plot_id: null, tree_id: t.tree_id, period: null, h, d: null, d_ib: dvals[i++], bark: 'ib', bark_t: null, kind: null })) })) };
}
export default function cases() {
  const out = [];
  for (const F of R.fits.filter(f => f.noisy)) for (const scale of ['d', 'source']) {
    const name = `taper-${F.form}-${scale}`, FR = FIT.fitTaper(stems(F.d), { form: F.form, bark: 'ib', scale });
    if (FR.status !== 'ok') throw new Error(`${name}: ${FR.status}`);
    const file = name + '.csv', script = buildR(FR, { lang: 'en', created: 'test', version: TOOL.version, fileName: file });
    const exp = {};
    for (const [k, v] of Object.entries(FR.params)) exp[k] = [v, 1e-6];
    if (FR.se) for (const [k, v] of Object.entries(FR.se)) exp['se.' + k] = [v, 1e-5];
    for (const [k, v, tol] of [['n', FR.n, 0], ['trees', FR.nTrees, 0], ['rmse', FR.rmse, 1e-7], ['bias', FR.bias, 1e-6]]) exp[k] = [v, tol];
    out.push({ name, script, files: { [file]: obsCsv(FR) }, expected: exp });
  }
  return out;
}
