// Project and inventory data manager (DI-03): several approved data packages (forest-dataset/1, PROJECT.md §4b) kept
// in this browser as projects, one of them active. The active package is written to 'dataset:approved', the key every
// tool already reads, so the tools need no change. Package content (plots, trees) is never edited here: corrections
// belong in the Data Checker with its change log; only the project's own details (name, place, year, notes) change.
//   'project:<id>'    { schema: 'forest-project/1', id, name, description, location, year, notes, origin, added,
//                       modified, sha256 (canonical digest of the package, core/record.js), dataset }
//   'project:active'  id of the active project
// Pure functions first (Node tests: tests/projects/test_di03.mjs), storage after.
import { sha256JSON } from './record.js';
import { put, get, del, keys } from './store.js';

export const SCHEMA = 'forest-project/1', LIBRARY_SCHEMA = 'forest-project-library/1', DATASET = 'forest-dataset/1';
export const ORIGINS = ['checker', 'import', 'legacy', 'copy'];
const ACTIVE = 'project:active', PFX = 'project:';
const isId = k => k.startsWith(PFX) && k !== ACTIVE;

/** Problems of a data package (same rules as the tools that read it): codes. */
export function datasetProblems(ds) {
  const p = [];
  if (!ds || typeof ds !== 'object' || Array.isArray(ds)) return ['ds.notobject'];
  if (ds.schema !== DATASET) p.push('ds.schema');
  if (!Array.isArray(ds.plots) || !Array.isArray(ds.trees)) { p.push('ds.arrays'); return p; }
  const plots = new Set();
  for (const pl of ds.plots) {
    if (!pl || typeof pl.plot_id !== 'string') p.push('ds.plotid');
    else { if (plots.has(pl.plot_id)) p.push('ds.plotdup'); plots.add(pl.plot_id); }
    if (!(pl && Number.isFinite(pl.plot_area) && pl.plot_area > 0)) p.push('ds.plotarea');
  }
  for (const t of ds.trees) {
    if (!t || !plots.has(t.plot_id)) p.push('ds.treeplot');
    if (!(t && Number.isFinite(t.dbh) && t.dbh > 0)) p.push('ds.dbh');
  }
  return [...new Set(p)];
}

const natural = (a, b) => String(a).localeCompare(String(b), 'tr', { numeric: true });
const perKey = v => v == null ? '' : String(v);
/**
 * Overview of a package along the plot → period → tree hierarchy. Counts only; nothing is computed from the
 * measurements except their range. → { plots, emptyPlots, periods: [period|null], records, trees (distinct
 * plot+tree+stem), species: [{ species, n }], dbh: {min,max}, heights: {measured, estimated}, ages, xy, strata,
 * area: {min, max, total} (m²), warnings, open, excluded, changes, byPlot: [{ plot_id, area, stratum, n: {period: records} }] }
 */
export function summarize(ds) {
  const plots = ds.plots || [], trees = ds.trees || [];
  const per = [...new Set(trees.map(t => perKey(t.period)))].sort(natural);
  const byPlot = new Map(plots.map(p => [p.plot_id, { plot_id: p.plot_id, area: p.plot_area, stratum: p.stratum ?? null, n: {} }]));
  const sp = new Map(), ids = new Set();
  let dmin = Infinity, dmax = -Infinity, hm = 0, he = 0, ages = 0, xy = 0;
  for (const t of trees) {
    const b = byPlot.get(t.plot_id); if (b) b.n[perKey(t.period)] = (b.n[perKey(t.period)] || 0) + 1;
    const s = t.species == null || t.species === '' ? '' : String(t.species); sp.set(s, (sp.get(s) || 0) + 1);
    ids.add(JSON.stringify([t.plot_id, t.tree_id ?? null, t.stem_id ?? null]));
    if (Number.isFinite(t.dbh)) { dmin = Math.min(dmin, t.dbh); dmax = Math.max(dmax, t.dbh); }
    if (t.height != null) (t.height_source === 'estimated' ? he++ : hm++);
    if (t.age != null) ages++;
    if (Number.isFinite(t.x) && Number.isFinite(t.y)) xy++;
  }
  const areas = plots.map(p => p.plot_area).filter(Number.isFinite);
  const w = Array.isArray(ds.warnings) ? ds.warnings : [];
  return {
    plots: plots.length, emptyPlots: [...byPlot.values()].filter(b => !Object.keys(b.n).length).length,
    periods: per.map(k => k === '' ? null : k), records: trees.length, trees: ids.size,
    species: [...sp.entries()].map(([species, n]) => ({ species, n })).sort((a, b) => b.n - a.n || natural(a.species, b.species)),
    dbh: trees.length ? { min: dmin, max: dmax } : null, heights: { measured: hm, estimated: he }, ages, xy, strata: [...new Set(plots.map(p => p.stratum).filter(s => s != null && s !== ''))].sort(natural),
    area: areas.length ? { min: Math.min(...areas), max: Math.max(...areas), total: areas.reduce((a, b) => a + b, 0) } : null,
    warnings: w.length, open: w.filter(x => !x.accepted).length, excluded: Array.isArray(ds.excluded) ? ds.excluded.length : 0, changes: Array.isArray(ds.changelog) ? ds.changelog.length : 0,
    byPlot: [...byPlot.values()].sort((a, b) => natural(a.plot_id, b.plot_id)),
  };
}

/** Project details the user edits. → problem codes ('name.missing', 'year.bad', 'text.long'). */
export function metaProblems(m) {
  const p = [];
  if (!String(m.name ?? '').trim()) p.push('name.missing');
  const y = String(m.year ?? '').trim();
  if (y && !(/^\d{4}$/.test(y) && +y >= 1800 && +y <= 2200)) p.push('year.bad');
  if (['name', 'location'].some(k => String(m[k] ?? '').length > 200) || ['description', 'notes'].some(k => String(m[k] ?? '').length > 5000)) p.push('text.long');
  return p;
}
export const cleanMeta = m => ({ name: String(m.name ?? '').trim(), description: String(m.description ?? '').trim(), location: String(m.location ?? '').trim(),
  year: String(m.year ?? '').trim() ? +String(m.year).trim() : null, notes: String(m.notes ?? '').trim() });

/** Default name: the tree file's name without extension, else 'veri paketi' / 'data package'. */
export function defaultName(ds, lang = 'tr') {
  const n = ds && ds.source && ds.source.trees && ds.source.trees.name;
  return n ? String(n).replace(/\.(csv|txt|tsv|xlsx|xlsm|json)$/i, '').trim() || n : 'data package';
}
export const newId = () => 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

/** A new project around a package (async: fingerprint). meta: details; origin: one of ORIGINS. */
export async function makeProject(ds, meta, origin, now = new Date().toISOString()) {
  const m = cleanMeta(meta);
  return { schema: SCHEMA, id: newId(), ...m, origin, added: now, modified: now, sha256: await sha256JSON(ds), dataset: ds };
}
/** Copy: same package, new id, name with a suffix. */
export const copyProject = (p, suffix, now = new Date().toISOString()) => ({ ...p, id: newId(), name: `${p.name} (${suffix})`, origin: 'copy', added: now, modified: now });

/**
 * What an imported JSON file would do to the list (nothing changes until the plan is applied). obj: a data package
 * (forest-dataset/1), one project (forest-project/1) or a backup (forest-project-library/1). existing: projects.
 * → { ok, kind, items: [{ action: 'add'|'same'|'reject', project?, name, reason? }] } ('same': a project with the
 * same package fingerprint exists; its details are left as they are).
 */
export async function planImport(existing, obj, { lang = 'tr', now = new Date().toISOString() } = {}) {
  const have = new Map(existing.map(p => [p.sha256, p]));
  const items = [], seen = new Set();
  const one = async (ds, meta, origin) => {
    const probs = datasetProblems(ds);
    const name = String(meta.name || defaultName(ds, lang));
    if (probs.length) { items.push({ action: 'reject', name, reason: probs }); return; }
    const mp = metaProblems({ ...meta, name });
    if (mp.length) { items.push({ action: 'reject', name, reason: mp }); return; }
    const sha = await sha256JSON(ds);
    if (have.has(sha) || seen.has(sha)) { items.push({ action: 'same', name, other: (have.get(sha) || {}).name || name }); return; }
    seen.add(sha);
    items.push({ action: 'add', name, project: { schema: SCHEMA, id: newId(), ...cleanMeta({ ...meta, name }), origin, added: meta.added || now, modified: now, sha256: sha, dataset: ds } });
  };
  if (!obj || typeof obj !== 'object') return { ok: false, kind: null, items };
  if (obj.schema === DATASET) await one(obj, {}, 'import');
  else if (obj.schema === SCHEMA) await one(obj.dataset, obj, 'import');
  else if (obj.schema === LIBRARY_SCHEMA && Array.isArray(obj.projects)) for (const p of obj.projects) await one(p && p.dataset, p || {}, 'import');
  else return { ok: false, kind: obj.schema || null, items };
  return { ok: true, kind: obj.schema, items };
}
/** Whole list as one file (the active choice is not part of it). */
export const backup = (projects, now = new Date().toISOString()) => ({ schema: LIBRARY_SCHEMA, created: now, projects });

/* ---------------- storage (IndexedDB through core/store.js) ---------------- */
export async function listProjects() {
  const out = [];
  for (const k of (await keys(PFX)).filter(isId)) { const p = await get(k); if (p && p.schema === SCHEMA) out.push(p); }
  return out.sort((a, b) => String(b.added).localeCompare(String(a.added)));
}
export const getProject = id => get(PFX + id);
export async function saveProject(p) { await put(PFX + p.id, p); return p; }
export const activeId = () => get(ACTIVE);
/** Makes a project the active one: its package goes to 'dataset:approved', which the tools read. */
export async function setActive(id) {
  const p = await getProject(id); if (!p) return false;
  await put('dataset:approved', p.dataset); await put(ACTIVE, id); return true;
}
/** No package active any more (the projects stay in the list). */
export async function deactivate() { await del(ACTIVE); await del('dataset:approved'); }
/** Deletes a project; if it was active, no package is active any more (the tools see none). */
export async function deleteProject(id) {
  const wasActive = (await activeId()) === id;
  await del(PFX + id);
  if (wasActive) { await del(ACTIVE); await del('dataset:approved'); }
  return wasActive;
}
/**
 * A package approved in the Data Checker: added to the list (unless the same package is already there) and made
 * active. → the project.
 */
export async function registerApproved(ds, lang = 'tr') {
  const sha = await sha256JSON(ds), all = await listProjects();
  let p = all.find(x => x.sha256 === sha);
  if (!p) p = await saveProject(await makeProject(ds, { name: defaultName(ds, lang) }, 'checker'));
  await put('dataset:approved', ds); await put(ACTIVE, p.id);
  return p;
}
/**
 * Packages approved before DI-03 live only in 'dataset:approved': adopt it once as a project (origin 'legacy') and
 * mark it active, so that nothing approved earlier is lost. → the project or null.
 */
export async function adoptApproved(lang = 'tr') {
  const ds = await get('dataset:approved');
  if (!ds || datasetProblems(ds).length) return null;
  const sha = await sha256JSON(ds), all = await listProjects();
  let p = all.find(x => x.sha256 === sha);
  if (!p) p = await saveProject(await makeProject(ds, { name: defaultName(ds, lang) }, 'legacy'));
  if (!(await activeId())) await put(ACTIVE, p.id);
  return p;
}
