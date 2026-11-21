// Coefficient and equation library (DI-02): TR/EN texts.
import { makeT } from '../core/i18n.js';

export const T = makeT({
  en: {
    privacy: 'Your coefficient sets are stored only in this browser (IndexedDB); nothing is sent to the server. Clearing the browser data deletes them: keep a backup.',
    'sum.h': 'Library', 'sum.none': 'No coefficient set is stored in this browser. Sets are entered or fitted on the tool pages or in the editor below; the site ships none.',
    'sum.line': p => `${p.n} set(s): ${p.list}.`, 'sum.dups': p => `${p.n} group(s) carry the same coefficients (possibly saved with another source or scope).`, 'sum.probs': p => `${p.n} set(s) have problems.`,
    backup: 'Download a backup (JSON)', restore: 'Restore from a backup', excel: 'List (Excel)', csv: 'List (CSV)',
    'r.h': 'Restore preview', 'r.sum': p => `${p.add} new, ${p.replace} changed (overwritten), ${p.same} identical (skipped), ${p.reject} invalid (not loaded).`,
    'r.apply': 'Apply', 'r.cancel': 'Cancel', 'r.done': p => `${p.n} set(s) loaded.`, 'r.bad': 'The file is not a coefficient library (model-coef-library/1) or a coefficient set.',
    'r.col.act': 'Action', 'r.col.set': 'Set', 'r.col.note': 'Note', 'r.add': 'new', 'r.replace': 'overwritten', 'r.same': 'identical', 'r.reject': 'invalid',
    'r.dup': p => `the same coefficients are already in the library (${p.id})`, 'p.id.repeated': 'the same id twice in the file', 'p.tool.unknown': p => `no "${p.tool}" tool on this site`,
    'f.h': 'Sets', 'f.tool': 'Tool', 'f.all': 'all', 'f.q': 'Search (form, species, region, source…)', 'f.origin': 'Origin', 'f.origin.user-entered': 'entered', 'f.origin.fitted': 'fitted', 'f.prob': 'only sets with problems',
    'f.count': p => `Showing ${p.n} of ${p.total} set(s).`,
    'c.tool': 'Tool', 'c.form': 'Form', 'c.scope': 'Scope', 'c.src': 'Source', 'c.origin': 'Origin', 'c.mod': 'Changed', 'c.state': 'State',
    'st.ok': 'valid', 'st.dup': 'a set with the same coefficients exists', 'st.prob': 'has problems',
    more: 'Details', edit: 'Edit', copy: 'Copy', del: 'Delete', delq: 'Delete this set? This cannot be undone (unless you have a backup).', open: 'Open in the tool',
    copied: 'Copy created: edit its source or scope.', deleted: 'Set deleted.',
    'd.id': 'Id', 'd.params': 'Coefficients (as stored)', 'd.units': 'Units', 'd.valid': 'Validity range', 'd.transform': 'Transformation', 'd.meta': "Tool's fields", 'd.source': 'Source', 'd.fit': 'Fit summary', 'd.copyOf': 'Copied from', 'd.dates': 'Created / changed', 'd.probs': 'Problems',
    'e.h': 'Set editor', 'e.tool': 'Tool', 'e.note': "The editor is the same as on the tool's own page (same checks, mandatory source and the tool's own fields).",
  },
});
