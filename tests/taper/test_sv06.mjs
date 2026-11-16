// Product bucking, stage SV-06/a1 (TOOLS_SPEC TP03): assets/lab/taper/bucking.js.
//   node tests/taper/test_sv06.mjs
// Reference: tests/ref/bucking_sv06.json (tests/ref/make_bucking_sv06.py: every cut sequence enumerated on a 0.5 m grid,
// usable stems ≤ 8 m, profiles and volumes written apart in Python with scipy).
// Acceptance (TP03): the dynamic programming finds the same best value as the exhaustive search; pieces + residual =
// total stem volume (1e−10); every piece's small-end diameter is not below its product's minimum.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as B from '../../assets/lab/taper/bucking.js';
import { blankSet } from '../../assets/lab/core/coef.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/bucking_sv06.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-12);
const setOf = (form, params, bark = 'ib') => ({ ...blankSet('taper.' + form), id: 'test', params, output: { name: 'd', unit: 'cm', bark }, source: { citation: 'test values only' } });
const listOf = (name, bark = 'ib') => ({ bark, currency: 'TEST', products: R.products[name].map(p => ({ ...p })) });

function invariants(r, list, tag) {
  const v = r.volumes, sum = v.pieces + v.residual;
  ok(rel(sum, v.total) <= 1e-10, `${tag}: pieces + residual = total stem volume (${sum} vs ${v.total})`);
  ok(rel(v.stump + v.usable + v.top, v.total) <= 1e-10 && v.waste >= -1e-12, `${tag}: stump + usable + top = total, waste ≥ 0`);
  ok(r.pieces.every(q => q.dSmall >= list.products[q.product].dMin), `${tag}: every small-end diameter ≥ the product's minimum`);
  ok(r.pieces.every((q, i) => q.h1 >= r.settings.stump - 1e-12 && q.h2 <= r.hTop + 1e-9 && (i === 0 || q.h1 >= r.pieces[i - 1].h2 - 1e-12) && Math.abs(q.h2 - q.h1 - q.len) < 1e-9), `${tag}: pieces inside [stump, usable top], not overlapping, length + trim`);
  ok(r.byProduct.reduce((s, b) => s + b.n, 0) === r.pieces.length && Math.abs(r.byProduct.reduce((s, b) => s + b.V, 0) - v.pieces) < 1e-12, `${tag}: product totals add up`);
}

for (const c of R.cases) {
  const set = setOf(c.form, c.params), list = listOf(c.products), tag = `${c.form} ${c.set}, D ${c.D} H ${c.H} dTop ${c.dTop}, products ${c.products}`;
  const base = { step: c.step, stump: c.stump, dTop: c.dTop };
  const rv = B.buckTree(set, c.D, c.H, list, { ...base, method: 'value', objective: 'value' });
  ok(rv.status === 'ok', `${tag}: value method runs (${rv.status} ${JSON.stringify(rv.problems)})`);
  if (rv.status !== 'ok') continue;
  ok(Math.abs(rv.hTop - c.hTop) <= 1e-8 && rv.grid.M === c.M, `${tag}: usable top ${rv.hTop} = ${c.hTop}, grid M = ${c.M}`);
  ok(Math.abs(rv.valueTotal - c.best_value) <= 1e-9 * Math.max(1, c.best_value), `${tag}: DP best value ${rv.valueTotal} = exhaustive ${c.best_value} (${c.sequences} sequences)`);
  ok(Math.abs(rv.best - rv.valueTotal) <= 1e-9 * Math.max(1, rv.valueTotal), `${tag}: DP objective = value of the reported pieces`);
  ok(rel(rv.volumes.total, c.total) <= 1e-9 && rel(rv.volumes.stump, c.stump_v) <= 1e-9, `${tag}: total and stump volume = scipy quad`);
  invariants(rv, list, tag + ' (value)');
  const ro = B.buckTree(set, c.D, c.H, list, { ...base, method: 'value', objective: 'volume' });
  ok(ro.status === 'ok' && Math.abs(ro.volumes.pieces - c.best_volume) <= 1e-9 * Math.max(1e-6, c.best_volume), `${tag}: DP best volume ${ro.volumes.pieces} = exhaustive ${c.best_volume}`);
  invariants(ro, list, tag + ' (volume)');
  const rp = B.buckTree(set, c.D, c.H, list, { ...base, method: 'priority' });
  ok(rp.status === 'ok' && rp.pieces.length === c.greedy.length && rp.pieces.every((q, i) => q.product === c.greedy[i].product && Math.abs(q.L - c.greedy[i].L) < 1e-12 && Math.abs(q.h2 - c.greedy[i].h2) < 1e-9 && rel(q.V, c.greedy[i].V) <= 1e-9 && Math.abs(q.dSmall - c.greedy[i].dSmall) <= 1e-9),
    `${tag}: priority method = the reference replay (${rp.pieces.map(q => q.id + ' ' + q.L).join(', ')})`);
  invariants(rp, list, tag + ' (priority)');
  ok(rv.valueTotal >= rp.valueTotal - 1e-9, `${tag}: DP value ≥ priority value`);
}

// larger trees, 0.1 m grid (no exhaustive search): invariants, DP ≥ priority, outside-bark set
{
  const C0 = R.cases[0], set = setOf('mb76', C0.params);
  const list = { bark: 'ib', currency: null, products: [
    { id: 'saw', name: 'saw log', dMin: 20, L: 4, Lmax: 6, Lstep: 0.5, trim: 10, priority: 1, value: 120 },
    { id: 'small', name: 'small saw log', dMin: 12, L: 2.5, Lmax: null, Lstep: null, trim: 10, priority: 2, value: 80 },
    { id: 'pulp', name: 'pulpwood', dMin: 7, L: 1, Lmax: 3, Lstep: 0.1, trim: 0, priority: 3, value: 30 }] };
  for (const [D, H] of [[25, 18], [38, 27.5], [52, 33]]) {
    for (const method of ['value', 'priority']) {
      const r = B.buckTree(set, D, H, list, { method, step: 0.1, stump: 0.3, dTop: 7 });
      ok(r.status === 'ok' && r.pieces.length > 0, `D ${D} H ${H} ${method}: runs on the 0.1 m grid`);
      invariants(r, list, `D ${D} H ${H} ${method}`);
    }
    const a = B.buckTree(set, D, H, list, { method: 'value', step: 0.1, stump: 0.3, dTop: 7 }), b = B.buckTree(set, D, H, list, { method: 'priority', step: 0.1, stump: 0.3, dTop: 7 });
    ok(a.valueTotal >= b.valueTotal - 1e-9, `D ${D} H ${H}: DP value ${a.valueTotal.toFixed(3)} ≥ priority ${b.valueTotal.toFixed(3)}`);
  }
  const ko = B.buckTree(setOf('kozak02', R.cases.find(c => c.form === 'kozak02').params), 40, 26, list, { step: 0.1, dTop: 7 });
  ok(ko.status === 'ok', 'Kozak set, 0.1 m grid'); invariants(ko, list, 'Kozak D 40 H 26');
}

// trees, totals, validation, JSON
{
  const C0 = R.cases[0], set = setOf('mb76', C0.params), list = listOf('A');
  const T = B.buckTrees(set, [{ id: 1, D: 20, H: 7.5 }, { id: 2, D: 26, H: 8 }, { id: 3, D: -1, H: 8 }], list, { step: 0.5, dTop: 5 });
  ok(T.nOk === 2 && T.nFailed === 1 && T.results[2].r.status === 'invalid', 'tree table: a bad tree is refused, the others bucked');
  ok(Math.abs(T.volumes.pieces + T.volumes.residual - T.volumes.total) < 1e-12 && T.byProduct.reduce((s, b) => s + b.n, 0) === T.results.filter(x => x.r.status === 'ok').reduce((s, x) => s + x.r.pieces.length, 0), 'tree table: totals by product and volume balance');
  const codes = (l, o = {}) => B.buckTree(set, 20, 7.5, l, { step: 0.5, ...o }).problems.map(p => p.code);
  ok(codes({ ...list, bark: 'ob' }).includes('bark.mismatch'), 'products on the other bark side than the set: refused');
  ok(codes({ ...list, products: [{ ...list.products[0], trim: 10 }] }).includes('length.grid'), 'length + trim off the grid: refused');
  ok(codes({ ...list, products: [{ ...list.products[0], value: null }] }).includes('product.value.missing') && !codes({ ...list, products: [{ ...list.products[0], value: null }] }, { objective: 'volume' }).length && !codes({ ...list, products: [{ ...list.products[0], value: null }] }, { method: 'priority' }).length, 'a value is needed only for the value objective');
  ok(B.checkProducts({ bark: 'ib', products: [{ ...list.products[0] }, { ...list.products[0] }] }).some(p => p.code === 'product.id.duplicate'), 'duplicate product id refused');
  ok(B.checkProducts({ bark: 'ib', products: [{ ...list.products[1], Lmax: 1 }] }).some(p => p.code === 'product.Lrange'), 'bad length range refused');
  ok(JSON.stringify(B.lengthsOf({ L: 1, Lmax: 3, Lstep: 0.1 })) === JSON.stringify(Array.from({ length: 21 }, (_, i) => +(1 + i * 0.1).toFixed(10))), 'variable lengths 1.0 … 3.0 by 0.1 without drift');
  const back = B.parseProducts(B.productsToJSON(list));
  ok(back.problems.length === 0 && JSON.stringify(back.list.products) === JSON.stringify(list.products.map(p => ({ ...p, Lstep: p.Lmax == null ? null : p.Lstep }))), 'product list JSON round trip');
  ok(B.parseProducts('{').problems[0].code === 'json.parse' && B.parseProducts('{"schema":"x"}').problems[0].code === 'json.schema', 'bad JSON and wrong schema refused');
  const none = B.buckTree(set, 20, 7.5, list, { step: 0.5, dTop: 30 });
  ok(none.status === 'ok' && none.pieces.length === 0 && none.hTop === 0.3 && Math.abs(none.volumes.residual - none.volumes.total) < 1e-15, 'top diameter above the stump diameter: nothing usable, everything residual');
}

console.log(`bucking SV-06/a1: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
