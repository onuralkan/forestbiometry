// Reproducibility layer (DI-07): assets/lab/core/record.js.
//   node tests/record/test_di07.mjs
// References: RFC 8785 (JSON Canonicalization Scheme) examples, §3.2.2–3.2.3 (sorting) and the §3.2.4 example
// input/output; SHA-256 against Node's own implementation (node:crypto createHash, OpenSSL) and the FIPS 180-2
// test vectors for "abc" and the empty string.
import { createHash } from 'node:crypto';
import * as R from '../../assets/lab/core/record.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const node = b => createHash('sha256').update(b).digest('hex');

// SHA-256
ok(await R.sha256Hex('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'FIPS 180-2 vector "abc"');
ok(await R.sha256Hex('') === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'FIPS 180-2 vector ""');
const rnd = new Uint8Array(200003); let s = 12345; for (let i = 0; i < rnd.length; i++) { s = (s * 1103515245 + 12345) >>> 0; rnd[i] = s >>> 24; }
ok(await R.sha256Hex(rnd) === node(rnd), 'random bytes = node:crypto');
ok(await R.sha256Hex(rnd.buffer) === node(rnd), 'ArrayBuffer accepted');
ok(await R.sha256Hex(rnd.subarray(10, 5000)) === node(rnd.subarray(10, 5000)), 'typed-array view hashes only its own bytes');
ok(await R.sha256Hex('Kızılçam ğüşöç €') === node(Buffer.from('Kızılçam ğüşöç €', 'utf8')), 'string → UTF-8 bytes');

// RFC 8785 §3.2.4 example
const inJCS = '{"numbers":[333333333.33333329,1E30,4.50,2e-3,0.000000000000000000000000001],"string":"\\u20ac$\\u000F\\u000aA\'\\u0042\\u0022\\u005c\\\\\\"\\/","literals":[null,true,false]}';
const outJCS = '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\\u000f\\nA\'B\\"\\\\\\\\\\"/"}';
ok(R.canonical(JSON.parse(inJCS)) === outJCS, 'RFC 8785 §3.2.4 example: ' + R.canonical(JSON.parse(inJCS)));
// RFC 8785 §3.2.3 sorting example: keys in UTF-16 code-unit order
const sortIn = { '€': 'Euro Sign', '\r': 'Carriage Return', 'דּ': 'Hebrew Letter Dalet With Dagesh', '1': 'One', '😀': 'Emoji: Grinning Face', '\u0080': 'Control', 'ö': 'Latin Small Letter O With Diaeresis' };
const keyOrder = [...R.canonical(sortIn).matchAll(/("(?:[^"\\]|\\.)*"):"/g)].map(m => JSON.parse(m[1]));
ok(JSON.stringify(keyOrder) === JSON.stringify(['\r', '1', '\u0080', '\u00f6', '\u20ac', '\ud83d\ude00', '\ufb33']),
  'RFC 8785 §3.2.3 key order: \\r, 1, \\u0080, ö, €, 😀, דּ');
ok(R.canonical({ b: [1, { d: 1, c: -0 }], a: 'x' }) === '{"a":"x","b":[1,{"c":0,"d":1}]}', 'nested sort, -0 → 0, no whitespace');
let threw = false; try { R.canonical(NaN); } catch (e) { threw = true; } ok(threw, 'non-finite numbers rejected');
ok(R.canonical(R.normalize({ a: NaN, b: undefined, c: Infinity })) === '{"a":null,"c":null}', 'normalize = file round trip (NaN, Infinity → null; undefined dropped)');
ok(await R.sha256JSON({ y: 2, x: [1.5, 'ı'] }) === node(Buffer.from('{"x":[1.5,"ı"],"y":2}', 'utf8')), 'JSON fingerprint = SHA-256 of the canonical text');

// inputs
const csv = Buffer.from('plot;tree;dbh\n1;1;23,5\n', 'utf8'); const buf = csv.buffer.slice(csv.byteOffset, csv.byteOffset + csv.length);
const fi = await R.describeInput('trees', { kind: 'csv', name: 'a.csv', buf, encoding: 'utf-8', delim: null, detected: ';', header: true });
ok(fi.kind === 'file' && fi.bytes === csv.length && fi.sha256 === node(csv) && fi.delimiter === ';' && fi.header === true && !fi.data, 'file input: bytes, digest, reading options, nothing embedded by default');
const fe = await R.describeInput('trees', { kind: 'csv', name: 'a.csv', buf, encoding: 'utf-8', header: true }, true);
ok(fe.data.encoding === 'base64' && Buffer.from(fe.data.value, 'base64').equals(csv), 'embedded file = base64 of the exact bytes');
const pi = await R.describeInput('data', { kind: 'paste', text: 'a\tb\n1\t2', detected: '\t', header: true }, true);
ok(pi.kind === 'paste' && pi.sha256 === node(Buffer.from('a\tb\n1\t2')) && pi.data.value === 'a\tb\n1\t2', 'pasted text: UTF-8 digest, text embedded');
const ds = { schema: 'forest-dataset/1', created: '2026-11-16T10:00:00Z', trees: [{ row: 2, plot_id: '001', dbh: 23.5, height: null }], plots: [] };
const di = await R.describeInput('dataset', { kind: 'dataset', dataset: ds });
ok(di.kind === 'dataset' && di.schema === 'forest-dataset/1' && di.trees === 1 && di.sha256 === node(Buffer.from(R.canonical(ds))), 'approved data set: canonical digest');
const big = new Uint8Array(300001).map((_, i) => i * 7);
ok(Buffer.from(R.toBase64(big), 'base64').equals(Buffer.from(big)) && Buffer.from(R.fromBase64(R.toBase64(big))).equals(Buffer.from(big)), 'base64 round trip of 300 kB (chunked)');

// record, seal, verification
const payload = { tool: { id: 'x', version: '0' }, created: '2026-11-16T12:00:00.000Z', settings: { method: 'ml', n1: true }, results: [{ a: 1 / 3, b: NaN }] };
const rec = await R.makeRecord(payload, { tool: { id: 'boy-cap', version: '1.1.0' }, ids: ['SM-01'], page: 'boy-cap.php', commit: 'abc123', site: 'https://forestbiometry.online/', lang: 'tr', inputs: [fi, null, fe, pi, di] });
ok(rec.format === 'run-record/1' && rec.tool.id === 'boy-cap' && rec.tool.version === '1.1.0' && rec.tool.ids[0] === 'SM-01' && rec.created === payload.created && rec.inputs.length === 4, 'envelope: tool from the page, payload time kept, null inputs dropped');
ok(rec.settings.method === 'ml' && rec.results[0].b === null && rec.results[0].a === 1 / 3, 'payload keys kept at the top level (old readers unaffected), full precision');
const { integrity, ...body } = rec;
ok(integrity.value === node(Buffer.from(R.canonical(body), 'utf8')), 'seal = SHA-256 of the canonical record without integrity');
const file = JSON.parse(JSON.stringify(rec, null, 1));      // as downloadJSON writes and a reader parses it
const v = await R.verifyRecord(file);
ok(v.kind === 'record' && v.seal === true && v.problems.length === 0, 'downloaded file verifies: ' + v.problems);
ok(v.inputs.length === 4 && v.inputs[1].embedded && v.inputs[1].embeddedOk === true && v.inputs[2].embeddedOk === true && v.inputs[0].embedded === false && !('data' in v.inputs[1]), 'embedded inputs checked, data not repeated in the report');
const edited = JSON.parse(JSON.stringify(file)); edited.settings.method = 'ols';
const ve = await R.verifyRecord(edited);
ok(ve.seal === false && ve.problems.includes('seal-mismatch'), 'one changed setting breaks the seal');
const reordered = JSON.parse(R.canonical(file)); const vr = await R.verifyRecord(Object.fromEntries(Object.entries(reordered).reverse()));
ok(vr.seal === true, 'key order and white space do not matter');
const tamper = JSON.parse(JSON.stringify(file)); tamper.inputs[1].data.value = Buffer.from('x;y\n', 'utf8').toString('base64'); const vt = await R.verifyRecord(await R.seal(tamper));
ok(vt.seal === true && vt.inputs[1].embeddedOk === false && vt.problems.includes('embedded-mismatch'), 'embedded data that does not match its fingerprint is reported even when resealed');
ok((await R.verifyRecord({ tool: { id: 'bonitet', version: '1.0.0-beta.3' }, created: 'x', results: [] })).kind === 'legacy', 'JSON written before DI-07 recognised (legacy, no seal)');
ok((await R.verifyRecord({ schema: 'model-coef-library/1', sets: [] })).problems.includes('other-schema'), 'other data formats are not records');
ok((await R.verifyRecord({ schema: 'forest-dataset/1', tool: { id: 'veri-denetcisi', version: '1.1.0' }, trees: [] })).kind === 'other', 'an approved data package (it has a tool field) is not taken for an old record');
ok((await R.verifyRecord({ format: 'run-record/2' })).problems.includes('format-version'), 'unknown record version reported');
const nos = { ...file }; delete nos.integrity; ok((await R.verifyRecord(nos)).problems.includes('seal-missing'), 'missing seal reported');

// matching user files to inputs
const m1 = R.matchInputs(v.inputs, await R.fileFingerprints(csv));
ok(m1.join() === '0,1', 'the original CSV matches both of its descriptors');
const dsFile = Buffer.from('﻿' + JSON.stringify(ds, null, 1), 'utf8');
ok(R.matchInputs(v.inputs, await R.fileFingerprints(dsFile)).join() === '3', 'downloaded approved data set (any formatting, BOM) matches the dataset input');
ok(R.matchInputs(v.inputs, await R.fileFingerprints(Buffer.from('plot;tree;dbh\n1;1;23,6\n'))).length === 0, 'a file with one changed digit matches nothing');
const ef = R.embeddedFile(file.inputs[1]); ok(ef && Buffer.from(ef.bytes).equals(csv) && ef.name === 'a.csv', 'embedded file restored for download');

console.log(`DI-07 record: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
