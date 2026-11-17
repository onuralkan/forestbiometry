// Stem Section Volume → Biomass & Carbon hand-off (TOOLS_SPEC BC03): core/derived.js and biomass bothApproaches.
//   node tests/biomass/test_bc03.mjs
// The volumes come from the Stem Section Volume engine run on its sample stem table; the test checks that the record
// carries them bit for bit (Object.is, also after a JSON round trip, as through the browser store), that Biomass reads
// the same numbers by package row, that the record is tied to the package fingerprint and to its schema version, and
// that the two approaches stay in separate rows. The conversion itself is tested against Python in test_bc01/02.
import { readFile } from 'node:fs/promises';
import * as V from '../../assets/lab/secvol/calc.js';
import * as B from '../../assets/lab/biomass/calc.js';
import * as D from '../../assets/lab/core/derived.js';
import { readStems } from '../../assets/lab/core/stems.js';
import { tableFromText } from '../../assets/lab/core/table.js';
import { sha256JSON } from '../../assets/lab/core/record.js';
import { blankSet } from '../../assets/lab/core/coef.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

// 1. Stem Section Volume on its sample (over and under bark, Smalian on boundaries)
const text = await readFile(new URL('../../assets/lab/secvol/ornek/ornek-seksiyon.csv', import.meta.url), 'utf8');
const tbl = tableFromText(text, { delim: ';', header: true, name: 'ornek-seksiyon.csv' });
const st = readStems(tbl, { plot: 0, tree: 1, h: 2, d: 3, bark_t: 4, dbh: 5, height: 6, stump_h: 7 }, { decimal: ',' });
const res = V.allTrees(st, { method: 'smalian', layout: 'ends', top: 'cone' });
ok(res.length > 3 && res.some(r => r.status === 'ok' && r.ob && r.ib && r.ib.status === 'ok'), `secvol sample: ${res.length} trees, over and under bark computed`);

// an approved package holding those trees (rows 1…n, species alternating), one extra package tree without stem
// measurements, and two package trees sharing the key of the last stem tree (ambiguous, not written)
const last = res[res.length - 1].tree;
const trees = res.slice(0, -1).map((r, i) => ({ row: i + 1, plot_id: r.tree.plot_id, tree_id: r.tree.tree_id, period: r.tree.period ?? null, species: i % 2 ? 'B' : 'A', dbh: 20 + i, height: 18 + i / 2, stem_id: null, status: null, stratum: null, x: null, y: null, extra: {} }));
const n0 = trees.length;
trees.push({ row: n0 + 1, plot_id: trees[0].plot_id, tree_id: 'yok', period: null, species: 'A', dbh: 25, height: 20, extra: {} });
trees.push({ row: n0 + 2, plot_id: last.plot_id, tree_id: last.tree_id, period: null, species: 'A', dbh: 25, height: 20, extra: {} }, { row: n0 + 3, plot_id: last.plot_id, tree_id: last.tree_id, period: null, species: 'B', dbh: 26, height: 21, extra: {} });
const plots = [...new Set(trees.map(t => t.plot_id))].map(p => ({ plot_id: p, plot_area: 400, stratum: null, area_source: 'plots', n_records: trees.filter(t => t.plot_id === p).length }));
const ds = { schema: 'forest-dataset/1', created: '2026-11-17T00:00:00Z', tool: { id: 'test', version: '0' }, units: { dbh: 'cm', height: 'm', plot_area: 'm2' }, plots, trees, derived: { note: '', trees: [], plots: [] }, warnings: [], excluded: [], changelog: [] };
const before = JSON.stringify(ds), sha = await sha256JSON(ds);

// 2. the record
const rec = D.stemVolumeRecord({ dataset: ds, sha256: sha, results: res, settings: { method: 'smalian', layout: 'ends', top: 'cone' }, tool: V.TOOL, created: '2026-11-17T10:00:00Z' });
ok(JSON.stringify(ds) === before && await sha256JSON(ds) === sha, 'the data package is not changed (same fingerprint)');
ok(rec.schema === 'forest-derived/1' && rec.kind === 'stem-volume' && rec.dataset.sha256 === sha && rec.dataset.schema === 'forest-dataset/1' && rec.units.volume === 'm3' && rec.tool.id === 'seksiyon-hacmi', 'record: schema, kind, package fingerprint, unit, tool');
ok(rec.trees.length === n0 && rec.unmatched.length === 0 && rec.ambiguous.length === 1 && rec.ambiguous[0].rows.join() === `${n0 + 2},${n0 + 3}`, 'matched by plot × tree × period; a key held by two package trees is listed with its rows, not written');
const res2 = [...res, { tree: { plot_id: 'X', tree_id: 'Z', period: null }, status: 'ok', ob: { status: 'ok', total: 1 }, ib: null }];
ok(D.stemVolumeRecord({ dataset: ds, sha256: sha, results: res2, settings: {}, tool: V.TOOL }).unmatched.length === 1, 'a stem tree without a package tree is listed as unmatched');
let bits = 0, nOb = 0, nIb = 0;
rec.trees.forEach((t, i) => {
  const r = res[i], ob = r.status === 'ok' && r.ob && r.ob.status === 'ok' ? r.ob.total : null, ib = r.status === 'ok' && r.ib && r.ib.status === 'ok' ? r.ib.total : null;
  if (!Object.is(t.v_ob, ob) || !Object.is(t.v_ib, ib) || t.row !== i + 1) bits++; if (ob != null) nOb++; if (ib != null) nIb++;
});
ok(bits === 0 && nOb > 3 && nIb > 3, `volumes in the record are the engine's numbers bit for bit (${nOb} over bark, ${nIb} under bark)`);
const stored = JSON.parse(JSON.stringify(rec)), sc = structuredClone(rec);
ok(stored.trees.every((t, i) => Object.is(t.v_ob, rec.trees[i].v_ob) && Object.is(t.v_ib, rec.trees[i].v_ib)) && sc.trees.every((t, i) => Object.is(t.v_ob, rec.trees[i].v_ob)), 'unchanged after a JSON round trip and a structured clone (the browser store)');

// 3. reading it back
ok(D.readDerived(stored, D.KIND_VOLUME, sha).ok, 'read: current version, right kind, same package');
ok(D.readDerived(stored, D.KIND_VOLUME, 'f'.repeat(64)).problems.includes('derived.package'), 'refused for another package (fingerprint differs)');
ok(D.readDerived({ ...stored, schema: 'forest-derived/9' }, D.KIND_VOLUME, sha).problems.join() === 'derived.version', 'an unknown schema version is refused, never guessed');
ok(D.readDerived({ ...stored, kind: 'other' }, D.KIND_VOLUME, sha).problems.includes('derived.kind') && D.readDerived(null, D.KIND_VOLUME).problems.join() === 'derived.none', 'other kind / nothing stored');
ok(D.storeKey(D.KIND_VOLUME, sha) === 'derived:stem-volume:' + sha, 'store key carries the package fingerprint');

// 4. Biomass from the transferred volumes: V is the engine's number; separate sides; old packages untouched
const factors = { mode: 'bef', bark: 'ob', D: 0.5, BEF: 1.3, R: 0.25 };
const look = D.volumeLookup(D.readDerived(stored, D.KIND_VOLUME, sha).record, 'ob');
const vol = B.computeVolume(ds, look, { bark: 'ob', factors, CF: 0.47, emptyCombos: 'unmeasured' });
let vb = 0; vol.trees.slice(0, n0).forEach((x, i) => { if (!Object.is(x.V, rec.trees[i].v_ob)) vb++; if (x.V != null) { const r = B.fromVolume({ V: x.V, bark: 'ob' }, factors); if (!Object.is(x.total, r.total * 1000)) vb++; } });
ok(vb === 0, 'Biomass reads the volumes bit for bit and converts them as from a column');
ok(vol.missing.join() === `${n0 + 1},${n0 + 2},${n0 + 3}`, 'package trees without a transferred volume: "no volume" with their rows');
const lib = D.volumeLookup(stored, 'ib'), firstIb = rec.trees.find(t => t.v_ib != null);
ok(Object.is(lib(trees[firstIb.row - 1]), firstIb.v_ib) && firstIb.v_ib < firstIb.v_ob, 'under-bark side read separately');
ok(B.computeVolume(ds, look, { bark: 'ib', factors, CF: 0.47 }).trees.every(x => x.status !== 'ok'), 'bark sides differ (volume ib, factors ob): nothing computed');
const oldDs = JSON.parse(before), byCol = B.computeVolume(oldDs, () => null, { bark: 'ob', factors, CF: 0.47 });
ok(oldDs.schema === 'forest-dataset/1' && byCol.trees.length === oldDs.trees.length, 'a package without transferred volumes (forest-dataset/1 as before) is read as before');

// 5. both approaches on the same trees, in separate rows
const set = { ...blankSet('biomass.pow.d'), id: 's', params: { a: 0.11, b: 2.37 }, transform: null, source: { citation: 'test values only' }, origin: 'user-entered' };
const allo = B.computeAllometric(ds, { components: [{ key: 'c1', CF: 0.5 }], map: { A: { c1: 's' }, B: { c1: 's' } } }, new Map([['s', set]]));
const both = B.bothApproaches(allo, vol);
ok(both.units.length === 2 * allo.units.length && both.trees.length === 2 * ds.trees.length, 'one row per unit and approach, one row per tree and approach');
ok(both.trees.every((x, i) => x.approach === (i % 2 ? 'volume' : 'allometric') && x.row === ds.trees[i >> 1].row), 'tree rows alternate allometric / volume for the same package row');
ok(both.trees.filter(x => x.approach === 'allometric').every((x, i) => Object.is(x.B, allo.trees[i].sum)) && both.trees.filter(x => x.approach === 'volume').every((x, i) => Object.is(x.B, vol.trees[i].total)), 'values are those of each approach, not mixed or averaged');
ok(both.units.filter(u => u.approach === 'volume').every((u, i) => Object.is(u.B, vol.units[i].B) && Object.is(u.CO2, vol.units[i].CO2)) && both.units.filter(u => u.approach === 'allometric').every((u, i) => Object.is(u.C, allo.units[i].C)), 'unit rows equal each approach\'s own totals');
ok(/^1\.0\.0-beta\.[2-9]$/.test(B.TOOL.version), 'tool version at least 1.0.0-beta.2 (new input source and approach)');

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
