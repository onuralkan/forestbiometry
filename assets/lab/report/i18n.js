// Report generator (DI-05): TR/EN interface texts (the report's own words are in render.js).
import { makeT } from '../core/i18n.js';

export const T = makeT({
  en: {
    privacy: 'The report is prepared in this browser; the package, records and notes are not sent to the server.',
    'm.h': 'Report details', 'm.title': 'Title', 'm.author': 'Prepared by', 'm.org': 'Institution', 'm.date': 'Date', 'm.intro': 'Introduction', 'm.lang': 'Report language', 'm.tr': 'Turkish', 'm.en': 'English',
    'p.h': 'Data package', 'p.pick': 'Package', 'p.none': '(no package)', 'p.sample': 'Sample package (simulated data)', 'p.empty': 'No packages in the Inventory Data Manager; a report can also be made from records alone.',
    'p.samplenote': 'The report uses the simulated sample package (for trying out only).',
    'f.period': 'Period', 'f.stratum': 'Stratum', 'f.species': 'Species', 'f.plot': 'Plot', 'f.all': 'all', 'f.noper': 'no period', 'f.nosp': 'no species',
    'f.width': 'Diameter class width (cm)', 'f.auto': 'automatic', 'f.ec': 'Plot × period without records', 'f.ec.unmeasured': 'not measured', 'f.ec.empty': 'empty (N = G = 0)',
    'r.h': 'Run records', 'r.file': 'Add records (.json)', 'r.pano': "Take the records from Data Visualization", 'r.none': 'No records added.', 'r.bad': p => `${p.f}: not a run record.`, 'r.read': p => `${p.f}: could not be read as JSON.`,
    'r.rm': 'Remove', 'r.up': 'Up', 'r.got': p => `${p.n} record(s) taken from Data Visualization.`,
    's.h': 'Sections and notes', 's.package': 'Data package', 's.charts': 'Charts', 's.records': 'Run records', 's.sources': 'References', 's.repro': 'Appendix: Reproducibility', 's.note': 'Note',
    print: 'Print / save as PDF', html: 'Download HTML', 'print.note': 'For a PDF, choose "Save as PDF" as the destination in the print dialog. Charts and tables are laid out for A4 pages.',
    preview: 'Preview',
  },
});
