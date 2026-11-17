// Derived values handed between tools (BC03, 17 November 2026, user decision: a separate record, the data package is never
// changed). A tool that computes per-tree values for an approved data package (forest-dataset/1) writes them to the browser
// store under 'derived:<kind>:<package SHA-256>' (the canonical package fingerprint of METHODS §20), so the package and its
// fingerprint stay as approved and a reader can tell which package the values belong to. Schema in docs/PROJECT.md §4b.
//
// forest-derived/1, kind 'stem-volume' (written by Stem Section Volume, read by Biomass & Carbon):
//   { schema: 'forest-derived/1', kind: 'stem-volume', created: ISO, tool: {id, version},
//     dataset: { schema: 'forest-dataset/1', sha256, trees: number of package trees },
//     units: { volume: 'm3' }, settings: { method, layout, top, includeStump, … },
//     trees: [{ row, plot_id, tree_id, period, status, v_ob, v_ib, label }],   one per matched package tree
//     unmatched: [{ plot_id, tree_id, period }],   stem trees that have no tree in the package
//     ambiguous: [{ plot_id, tree_id, period, rows }] }   keys held by more than one package tree (not written)
// v_ob / v_ib are copied unchanged from the tool's result (no rounding, no unit change), null when that bark side was not
// computed. Readers accept every version listed in READERS and refuse others with 'derived.version'.
export const SCHEMA = 'forest-derived/1';
export const KIND_VOLUME = 'stem-volume';
export const storeKey = (kind, sha) => `derived:${kind}:${sha}`;
const keyOf = (plot, tree, period) => `${plot ?? ''}\u0001${tree}\u0001${period ?? ''}`;

/**
 * Stem volume record for a data package. results: one method's per-tree results of the Stem Section Volume engine
 * (secvol/calc.js treeVolume: { tree: {plot_id, tree_id, period}, status, ob, ib }). dataset: the package; sha256: its
 * fingerprint. Trees are matched on plot × tree × period, as when the stem table was read with the package.
 */
export function stemVolumeRecord({ dataset, sha256, results, settings, tool, created }) {
  const byKey = new Map();
  for (const t of dataset.trees) { const k = keyOf(t.plot_id ?? null, t.tree_id, t.period ?? null); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(t); }
  const trees = [], unmatched = [], ambiguous = [];
  for (const r of results) {
    const id = { plot_id: r.tree.plot_id ?? null, tree_id: r.tree.tree_id, period: r.tree.period ?? null }, list = byKey.get(keyOf(id.plot_id, id.tree_id, id.period));
    if (!list) { unmatched.push(id); continue; }
    if (list.length > 1) { ambiguous.push({ ...id, rows: list.map(t => t.row) }); continue; }
    const side = s => r[s] && r[s].status === 'ok' ? r[s].total : null, lab = r.ob || r.ib;
    trees.push({ row: list[0].row, ...id, status: r.status, v_ob: r.status === 'ok' ? side('ob') : null, v_ib: r.status === 'ok' ? side('ib') : null, label: lab && lab.label ? lab.label : null });
  }
  return { schema: SCHEMA, kind: KIND_VOLUME, created: created || new Date().toISOString(), tool: { id: tool.id, version: tool.version },
    dataset: { schema: dataset.schema, sha256, trees: dataset.trees.length }, units: { volume: 'm3' }, settings, trees, unmatched, ambiguous };
}

/** Readers by schema version. Each returns the record in the current shape. */
const READERS = { 'forest-derived/1': r => r };

/** → { ok, problems: [code], record }. Checks the version, the kind and, when given, the package fingerprint. */
export function readDerived(obj, kind, sha256 = null) {
  const problems = [];
  if (!obj || typeof obj !== 'object') return { ok: false, problems: ['derived.none'], record: null };
  const read = READERS[obj.schema];
  if (!read) return { ok: false, problems: ['derived.version'], record: null };
  const rec = read(obj);
  if (rec.kind !== kind) problems.push('derived.kind');
  if (!Array.isArray(rec.trees)) problems.push('derived.trees');
  if (sha256 != null && (!rec.dataset || rec.dataset.sha256 !== sha256)) problems.push('derived.package');
  return { ok: !problems.length, problems, record: problems.length ? null : rec };
}

/** Volume of a package tree from a stem volume record: side 'ob' | 'ib'. → (tree) → number | null, by package row. */
export function volumeLookup(rec, side) {
  const m = new Map(rec.trees.map(t => [t.row, side === 'ib' ? t.v_ib : t.v_ob]));
  return t => { const v = m.get(t.row); return v == null ? null : v; };
}
