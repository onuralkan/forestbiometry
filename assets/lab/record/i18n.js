// Record Verifier (DI-07): TR/EN texts.
import { makeT } from '../core/i18n.js';

export const T = makeT({
  en: {
    privacy: 'The record and the input files are read in this browser only; nothing is sent to the server. Fingerprints are computed with the browser\'s own SHA-256 function.',
    'in.h': 'Open a run record', 'in.sub': 'The file downloaded with a tool\'s "JSON" or "Run record (JSON)" button (run-record/1). JSON files downloaded before DI-07 open too, but carry no seal.',
    'in.file': 'Choose a record (.json)', 'in.bad': 'The file could not be read as JSON.', 'in.none': 'No record opened yet.',
    'sum.h': 'Record', 'k.tool': 'Tool', 'k.ids': 'Tool ids', 'k.ver': 'Version in the record', 'k.now': 'Version on the site', 'k.created': 'Created', 'k.lang': 'Interface language',
    'k.build': 'Source code (commit)', 'k.build.none': 'none (produced in a development setup)', 'k.site': 'Site', 'k.format': 'Format', 'k.file': 'File',
    'seal.ok': 'The seal holds: the record has not changed since it was downloaded.', 'seal.bad': 'The seal does not hold: the record was changed (or damaged) after download. Do not rely on its content.',
    'seal.none': 'The record has no seal.', 'seal.how': 'The seal is the SHA-256 digest of the RFC 8785 canonical JSON of the record without its integrity field. It is not a signature: it shows changes, accidental or deliberate, but does not prevent forgery.',
    'seal.exp': 'Digest in the record', 'seal.act': 'Computed digest',
    'legacy': 'This file is a tool output downloaded before DI-07 (before the shared record format): its tool, version and time are read, but it has no seal, build id or input fingerprints.',
    'other': p => `This file is not a run record${p.f ? ` (${p.f})` : ''}. Data formats (approved data package, coefficient library, stand model) open in their own tools.`,
    'fmtver': p => `This record format (${p.f}) is not known to this version.`,
    'ver.same': 'The record was produced with the tool\'s current version on the site: the same inputs and settings should give the same result.',
    'ver.changed': p => `The tool has changed since (record ${p.r}, site ${p.c}). Results may differ; the source code that produced the record is behind the commit link.`,
    'ver.unknown': 'The tool that produced the record was not found on this site.',
    'in2.h': 'Inputs', 'in2.none': 'The record has no input files (values were typed, or only settings were used).',
    'c.role': 'Role', 'c.kind': 'Kind', 'c.name': 'Name', 'c.size': 'Size', 'c.sha': 'SHA-256', 'c.read': 'Reading', 'c.emb': 'Data in the record', 'c.match': 'Your file',
    'kind.file': 'file', 'kind.paste': 'pasted', 'kind.dataset': 'data package', 'kind.table': 'table',
    'emb.no': 'no (fingerprint only)', 'emb.ok': 'yes, matches its fingerprint', 'emb.bad': 'yes, does NOT match its fingerprint', 'emb.dl': 'Download',
    'm.none': '–', 'm.ok': p => `matches: ${p.f}`,
    'chk.h': 'Check the files you have', 'chk.sub': 'Choose your original data files: each one\'s fingerprint is computed and compared with the inputs of the record. A data package (JSON) downloaded from the Data Checker matches whatever its formatting.',
    'chk.file': 'Choose files', 'chk.res': 'Files checked', 'chk.yes': p => `same as ${p.list} in the record`, 'chk.no': 'matches no input of the record (a single different byte breaks the match)',
    'cnt.h': 'Content of the record', 'cnt.sub': 'Sections besides the shared fields; the settings are open below.', 'cnt.key': 'Section', 'cnt.kind': 'Kind', 'cnt.size': 'Items', 'cnt.settings': 'Settings',
    'kk.object': 'object', 'kk.array': 'list', 'kk.value': 'value',
    'read.enc': 'encoding', 'read.delim': 'delimiter', 'read.header': 'header row', 'read.sheet': 'sheet', 'read.trees': 'trees', yes: 'yes', no: 'no',
    'p.seal-mismatch': 'seal does not hold', 'p.embedded-mismatch': 'embedded data does not match its fingerprint', 'p.seal-missing': 'no seal', 'p.tool-missing': 'tool details missing', 'p.inputs-missing': 'input list missing', 'p.not-canonical': 'could not be canonicalised',
    clear: 'Close the record',
    'role.data': 'data', 'role.trees': 'tree table', 'role.stems': 'stem measurements', 'role.dataset': 'approved data', 'role.pilot': 'pilot measurements', 'role.table': 'criteria table',
  },
});
