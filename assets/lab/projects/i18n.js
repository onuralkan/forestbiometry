// Inventory Data Manager (DI-03): TR/EN texts.
import { makeT } from '../core/i18n.js';

export const T = makeT({
  en: {
    privacy: 'Data packages are kept in this browser only (IndexedDB); nothing is sent to the server. If the browser data are cleared, the packages go too: keep a backup.',
    'act.h': 'Active package', 'act.none': 'No active package. Data approved in the Data Checker are added here and made active; you can also make a package active from the list below.',
    'act.note': 'The tools that read approved data (Plot & Stand Metrics, Stand Structure, Height–Diameter, Site Index, Section Volume, Volume Equations, Biomass & Carbon, Model Evaluation) use the active package; Data Visualization and the Report Generator also open it first. Reload them if they are open.',
    'act.checker': 'Open the Data Checker',
    'list.h': 'Packages', 'list.none': 'No packages are kept in this browser.', 'list.line': p => `${p.n} package(s).`,
    backup: 'Download a backup (JSON)', imp: 'Import (JSON)', 'imp.sub': 'A data package (the Data Checker\'s JSON), one project or a backup of this page.',
    'r.h': 'Import preview', 'r.sum': p => `${p.add} new, ${p.same} already there (skipped), ${p.reject} invalid (not loaded).`, 'r.apply': 'Apply', 'r.cancel': 'Cancel',
    'r.done': p => `${p.n} package(s) added.`, 'r.bad': 'The file is not a data package (forest-dataset/1), a project (forest-project/1) or a backup (forest-project-library/1).', 'r.read': 'The file could not be read as JSON.',
    'r.add': 'new', 'r.same': p => `already there: ${p.o}`, 'r.reject': 'invalid',
    'c.name': 'Name', 'c.year': 'Year', 'c.loc': 'Place', 'c.plots': 'Plots', 'c.periods': 'Periods', 'c.records': 'Records', 'c.added': 'Added', 'c.origin': 'Origin', 'c.act': 'Actions',
    'o.checker': 'Data Checker', 'o.import': 'import', 'o.legacy': 'earlier approval', 'o.copy': 'copy',
    active: 'active', 'b.activate': 'Make active', 'b.more': 'Details', 'b.copy': 'Copy', 'b.dl': 'Data package (JSON)', 'b.del': 'Delete',
    delq: 'Delete this package from this browser? This cannot be undone.', delqa: 'This package is active: if it is deleted, the tools see no approved data. Delete it? This cannot be undone.',
    deleted: 'Package deleted.', activated: p => `Active package: ${p.n}.`, copied: 'Copy created.', saved: 'Details saved.', copy: 'copy',
    'm.h': 'Project details', 'm.name': 'Name', 'm.year': 'Inventory year', 'm.loc': 'Place', 'm.desc': 'Description', 'm.notes': 'Notes', 'm.save': 'Save details',
    'm.note': 'Tree and plot records are not changed here; measurement corrections are made in the Data Checker, with a reason, and approved again.',
    'p.name.missing': 'A name is required.', 'p.year.bad': 'The year must have four digits (1800–2200) or stay empty.', 'p.text.long': 'Text too long.',
    's.h': 'Summary', 's.plots': 'Plots', 's.empty': p => `${p.n} without trees`, 's.periods': 'Periods', 's.noper': 'no period', 's.records': 'Records',
    's.trees': 'Distinct trees (plot + tree + stem)', 's.species': 'Species', 's.blank': 'no species', 's.dbh': 'Diameter range (cm)', 's.h2': 'Height', 's.hval': p => `${p.m} measured, ${p.e} estimated`,
    's.age': 'Records with an age', 's.xy': 'Records with coordinates', 's.strata': 'Strata', 's.area': 'Plot size (m²)', 's.areaval': p => `${p.min}–${p.max}, total ${p.t}`,
    's.warn': 'Warnings', 's.warnval': p => `${p.n} (${p.o} open)`, 's.exc': 'Excluded rows', 's.chg': 'Change log', 's.created': 'Approved', 's.src': 'Source file', 's.sha': 'Fingerprint (SHA-256)', 's.probs': 'Package problems',
    'h.h': 'Plot × period (number of records)', 'h.plot': 'Plot', 'h.area': 'Area (m²)', 'h.stratum': 'Stratum',
    'to.tools': 'Tools',
  },
});
