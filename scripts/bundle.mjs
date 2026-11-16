// Bundler for the live site: one JavaScript file per page instead of a tree of ES modules.
//
// Why: a tool page used to fetch 12–59 module files at once; the host's bot protection answers such bursts with an
// HTML "One moment, please..." page instead of JavaScript, and the tool stays blank (docs/PROGRESS.md, 16 Nov 2026).
// The sources in assets/lab/ stay as they are (tests import them directly); this script writes assets/build/:
//   assets/build/<tool>/ui.js        the page's entry module + the shell's citation dialog (core/cite-ui.js), one file
//   assets/build/core/cite-ui.js     the citation dialog alone (pages without a tool: index, About, Guide)
//   assets/build/<tool>/<worker>.js  each Web Worker named by new URL('./x.js', import.meta.url), at the same relative
//                                    place so that the URL written in the source still resolves next to the bundle
// Each bundle is an ES module holding a small registry: every source module becomes a function that returns its
// exports (getters, so exported bindings stay live); modules run once, in the order ES modules would run them.
// Supported (and checked): named imports, namespace imports, bare imports, export declarations, export lists,
// export … from, export * from, export * as … from, dynamic import() of a relative path (bundled, resolved at call time). Not supported
// (the build stops with a message): default exports, top-level await, circular imports, imports of names a module
// does not export. Output is deterministic (no dates, sorted modules) so CI can check it is up to date:
//   node scripts/bundle.mjs           write assets/build/
//   node scripts/bundle.mjs --check   exit 1 if assets/build/ differs from what the sources give (CI, before deploy)
// Needs the acorn parser: npm install --no-save acorn@8.18.0 (or NODE_PATH pointing at an installed acorn).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const acorn = require('acorn');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const LAB = 'assets/lab', OUT = 'assets/build', CITE = 'core/cite-ui.js';
const CHECK = process.argv.includes('--check');
const die = m => { console.error('bundle: ' + m); process.exit(2); };
const rd = id => fs.readFileSync(path.join(ROOT, LAB, id), 'utf8');
const norm = (from, spec) => {
  if (!/^\.{1,2}\//.test(spec)) die(`${from}: only relative imports can be bundled ("${spec}")`);
  const id = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  if (id.startsWith('..')) die(`${from}: import leaves ${LAB} ("${spec}")`);
  return id;
};
function walk(node, fn) {
  if (!node || typeof node.type !== 'string') return;
  fn(node);
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, fn));
    else if (v && typeof v.type === 'string') walk(v, fn);
  }
}

// ---- one module: parse, record imports/exports, rewrite into a registry function ----
const mods = new Map();
function load(id) {
  if (mods.has(id)) return mods.get(id);
  const src = rd(id);
  let ast; try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' }); } catch (e) { die(`${id}: ${e.message}`); }
  const m = { id, deps: [], dyn: [], workers: [], local: new Map(), reexp: [], nsexp: [], star: [], imports: [], named: new Set(), edits: [], head: [] };
  mods.set(id, m);
  for (const n of ast.body) {
    if (n.type === 'ImportDeclaration') {
      const dep = norm(id, n.source.value); m.deps.push(dep);
      const named = [], ns = [];
      for (const s of n.specifiers) {
        if (s.type === 'ImportDefaultSpecifier') die(`${id}: default imports are not supported`);
        if (s.type === 'ImportNamespaceSpecifier') ns.push(s.local.name);
        else { named.push([s.imported.name, s.local.name]); m.imports.push([dep, s.imported.name]); m.named.add(dep); }
      }
      const req = `__fb_r(${JSON.stringify(dep)})`;
      if (named.length) m.head.push(`const { ${named.map(([a, b]) => a === b ? a : `${a}: ${b}`).join(', ')} } = ${req};`);
      for (const b of ns) m.head.push(`const ${b} = ${req};`);
      if (!named.length && !ns.length) m.head.push(`${req};`);
      m.edits.push([n.start, n.end, '']);
    } else if (n.type === 'ExportDefaultDeclaration') die(`${id}: default exports are not supported`);
    else if (n.type === 'ExportAllDeclaration') {
      const dep = norm(id, n.source.value); m.deps.push(dep); m.edits.push([n.start, n.end, '']);
      if (n.exported) m.nsexp.push([n.exported.name, dep]); // export * as name from: the namespace as one export
      else m.star.push(dep);
      m.head.push(`__fb_r(${JSON.stringify(dep)});`);       // evaluated here, in source order (registration side effects)
    } else if (n.type === 'ExportNamedDeclaration') {
      if (n.source) {
        const dep = norm(id, n.source.value); m.deps.push(dep);
        for (const s of n.specifiers) { m.reexp.push([s.exported.name, dep, s.local.name]); m.imports.push([dep, s.local.name]); }
        m.head.push(`__fb_r(${JSON.stringify(dep)});`);
        m.edits.push([n.start, n.end, '']);
      } else if (n.declaration) {
        const d = n.declaration;
        if (d.type === 'VariableDeclaration') for (const v of d.declarations) {
          if (v.id.type !== 'Identifier') die(`${id}: destructuring in an export declaration is not supported`);
          m.local.set(v.id.name, v.id.name);
        } else m.local.set(d.id.name, d.id.name);
        m.edits.push([n.start, d.start, '']); // drop the word "export"
      } else {
        for (const s of n.specifiers) m.local.set(s.exported.name, s.local.name);
        m.edits.push([n.start, n.end, '']);
      }
    } else if (n.type === 'ExpressionStatement' && n.expression.type === 'AwaitExpression') die(`${id}: top-level await is not supported`);
  }
  walk(ast, n => {
    if (n.type === 'ImportExpression') {
      if (n.source.type !== 'Literal') die(`${id}: import() needs a literal path`);
      const dep = norm(id, n.source.value); m.dyn.push(dep);
      m.edits.push([n.start, n.end, `Promise.resolve().then(() => __fb_r(${JSON.stringify(dep)}))`]);
    }
    // new URL('./worker.js', import.meta.url): a worker file next to this module → bundled separately at that place
    if (n.type === 'NewExpression' && n.callee.name === 'URL' && n.arguments.length === 2 && n.arguments[0].type === 'Literal'
        && n.arguments[1].type === 'MemberExpression' && n.arguments[1].object.type === 'MetaProperty' && /\.m?js$/.test(n.arguments[0].value)) {
      m.workers.push(norm(id, n.arguments[0].value));
    }
    if (n.type === 'AwaitExpression') { /* inside functions only: top-level await is caught above */ }
  });
  // apply edits back to front
  let body = src;
  for (const [a, b, t] of m.edits.sort((x, y) => y[0] - x[0])) body = body.slice(0, a) + t + body.slice(b);
  m.body = body;
  for (const d of [...m.deps, ...m.dyn]) load(d);
  for (const w of m.workers) load(w);
  return m;
}
const own = m => [...m.local.keys(), ...m.reexp.map(r => r[0]), ...m.nsexp.map(r => r[0])];
/** Names exported by id through export * (name → the star dependency it comes through), resolved statically. */
function starNames(id, seen = new Set()) {
  if (seen.has(id)) die(`circular export * at ${id}`); seen.add(id);
  const m = mods.get(id), mine = new Set(own(m)), out = new Map();
  for (const s of m.star) for (const k of exportNames(s, new Set(seen))) {
    if (k === 'default' || mine.has(k)) continue;
    if (out.has(k) && out.get(k) !== s) die(`${id}: "${k}" comes through two export * (${out.get(k)}, ${s})`);
    out.set(k, s);
  }
  return out;
}
const exportNames = (id, seen = new Set()) => new Set([...own(mods.get(id)), ...starNames(id, seen).keys()]);

// ---- a bundle: the static + dynamic closure of its entries, in a registry ----
function closure(entries) {
  const set = new Set(), st = new Map();
  const visit = (id, trail) => {
    // a cycle is accepted only where the edge back into a module still running is a namespace (or bare) import or a
    // dynamic import: those are read at call time, as with ES modules; a named import would be read too early here
    if (st.get(id) === 1) {
      const from = trail[trail.length - 1];
      if (mods.get(from).named.has(id)) die(`circular named import: ${[...trail, id].join(' > ')}`);
      return;
    }
    if (st.get(id) === 2) return;
    st.set(id, 1); const m = mods.get(id);
    for (const d of [...m.deps, ...m.dyn]) visit(d, [...trail, id]);
    st.set(id, 2); set.add(id);
  };
  for (const e of entries) visit(e, []);
  return [...set].sort();
}
function bundle(entries) {
  const ids = closure(entries);
  for (const id of ids) for (const [dep, name] of mods.get(id).imports)
    if (!exportNames(dep).has(name)) die(`${id}: "${name}" is not exported by ${dep}`);
  const parts = [
    `// Generated by scripts/bundle.mjs from ${LAB}/ — do not edit; edit the sources and run: node scripts/bundle.mjs`,
    `// Entry: ${entries.join(', ')}. Modules: ${ids.length}.`,
    `const __fb_m = Object.create(null), __fb_c = Object.create(null);`,
    `function __fb_r(id) {`,
    `  if (id in __fb_c) return __fb_c[id];`,
    `  const x = Object.create(null); x[Symbol.toStringTag] = 'Module';`,
    `  __fb_c[id] = x; __fb_m[id](x); Object.preventExtensions(x); return x;`,
    `}`,
    `function __fb_x(x, g) { for (const k of Object.keys(g).sort()) Object.defineProperty(x, k, { enumerable: true, get: g[k] }); }`,
  ];
  for (const id of ids) {
    const m = mods.get(id), g = [];
    for (const [ex, loc] of [...m.local].sort((a, b) => a[0] < b[0] ? -1 : 1)) g.push(`${JSON.stringify(ex)}: () => ${loc}`);
    for (const [ex, dep] of [...starNames(id)].sort((a, b) => a[0] < b[0] ? -1 : 1)) g.push(`${JSON.stringify(ex)}: () => __fb_r(${JSON.stringify(dep)})[${JSON.stringify(ex)}]`);
    for (const [ex, dep] of m.nsexp) g.push(`${JSON.stringify(ex)}: () => __fb_r(${JSON.stringify(dep)})`);
    for (const [ex, dep, name] of m.reexp) g.push(`${JSON.stringify(ex)}: () => __fb_r(${JSON.stringify(dep)})[${JSON.stringify(name)}]`);
    // exports are defined before the body runs (live getters), so a function declared in the body is reachable even
    // while later modules are still evaluating; values read before their declaration throw, as in ES modules
    parts.push(
      `\n// ---- ${LAB}/${id}`,
      `__fb_m[${JSON.stringify(id)}] = function (__fb_e) {`,
      `__fb_x(__fb_e, { ${g.join(', ')} });`,
      ...m.head,
      m.body.replace(/\s+$/, ''),
      `};`);
  }
  parts.push('');
  // entries run in page order; an error in one is reported but does not stop the next (as separate module scripts)
  for (const e of entries) parts.push(`try { __fb_r(${JSON.stringify(e)}); } catch (e) { setTimeout(() => { throw e; }); }`);
  return parts.join('\n') + '\n';
}

// ---- entries: the page scripts named in the PHP pages ----
const pageEntries = new Set();
for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith('.php')).sort()) {
  for (const mm of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/src="assets\/lab\/([^"?]+\.js)/g)) pageEntries.add(mm[1]);
}
load(CITE);
for (const e of pageEntries) load(e);
const outputs = new Map();
outputs.set(CITE, bundle([CITE]));
for (const e of [...pageEntries].sort()) outputs.set(e, bundle([CITE, e]));
const workers = new Set(); for (const m of mods.values()) for (const w of m.workers) workers.add(w);
for (const w of [...workers].sort()) {
  if (outputs.has(w)) die(`${w} is both a page entry and a worker`);
  outputs.set(w, bundle([w]));
}

// ---- write or check ----
const outDir = path.join(ROOT, OUT), have = new Set();
const list = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(x => x.isDirectory() ? list(path.join(d, x.name)) : [path.join(d, x.name)]) : [];
for (const f of list(outDir)) have.add(path.relative(outDir, f).split(path.sep).join('/'));
let diff = 0;
for (const [id, text] of outputs) {
  const file = path.join(outDir, id), cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (cur !== text) {
    diff++;
    if (CHECK) console.error(`bundle: ${OUT}/${id} is ${cur === null ? 'missing' : 'out of date'}`);
    else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }
  }
  have.delete(id);
}
for (const f of have) { diff++; if (CHECK) console.error(`bundle: ${OUT}/${f} is not produced by the sources`); else fs.unlinkSync(path.join(outDir, f)); }
if (CHECK) {
  if (diff) { console.error('bundle: run node scripts/bundle.mjs and commit assets/build/'); process.exit(1); }
  console.log(`bundle: ${outputs.size} bundles up to date`);
} else console.log(`bundle: ${outputs.size} bundles (${diff} written or removed): ${[...outputs.keys()].join(', ')}`);
