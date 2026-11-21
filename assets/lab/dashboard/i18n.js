// Data visualization (DI-04): TR/EN texts.
import { makeT } from '../core/i18n.js';

export const T = makeT({
  en: {
    privacy: 'Data and records are read in this browser only; nothing is sent to the server.',
    'src.h': 'Data package', 'src.pick': 'Package shown', 'src.active': 'active', 'src.sample': 'Show the sample package (simulated data)',
    'src.none': 'No approved data package in this browser. Approve data in the Data Checker or import a package into the Inventory Data Manager.',
    'src.samplenote': 'Shown: the sample data package of Plot & Stand Metrics (simulated, for trying out only).', 'src.checker': 'Data Checker', 'src.manager': 'Inventory Data Manager',
    'f.h': 'Filters', 'f.period': 'Period', 'f.stratum': 'Stratum', 'f.species': 'Species', 'f.plot': 'Plot', 'f.all': 'all', 'f.noper': 'no period', 'f.nosp': 'no species',
    'f.width': 'Diameter class width (cm)', 'f.auto': 'automatic', 'f.ec': 'Plot × period without records', 'f.ec.unmeasured': 'not measured (left out)', 'f.ec.empty': 'empty (N = G = 0)',
    'f.est': 'Show estimated heights too',
    'r.h': 'Run records', 'r.sub': 'JSON records downloaded from the tools (run-record/1). Densities of Diameter Distribution records are drawn over the histogram, curves of Height–Diameter records over the scatter; records of other tools are listed.',
    'r.file': 'Add records (.json)', 'r.none': 'No records added.', 'r.bad': p => `${p.f}: not a run record.`, 'r.read': p => `${p.f}: could not be read as JSON.`,
    'r.c.file': 'File', 'r.c.tool': 'Tool', 'r.c.when': 'Time', 'r.c.seal': 'Seal', 'r.c.src': 'Data', 'r.c.show': 'Draw', 'r.rm': 'Remove',
    'seal.ok': 'holds', 'seal.bad': 'DOES NOT HOLD', 'seal.none': 'none',
    'src.yes': 'this package', 'src.no': 'ANOTHER package', 'src.unk': 'a file (match unknown)',
    'k.dist': 'diameter distribution', 'k.hd': 'height–diameter', 'k.other': 'not drawn',
    'p.tiles': 'Summary', 't.plots': 'Plot × period', 't.records': 'Records', 't.species': 'Species', 't.Nha': 'Mean N (trees/ha)', 't.Gha': 'Mean G (m²/ha)',
    't.sub': p => `over ${p.n} plot × period, unweighted`,
    'ch.hist': 'Diameter distribution', 'ch.d': 'Diameter at breast height (cm)', 'ch.dens': 'Density', 'ch.hist.note': p => `${p.n} records, class width ${p.w} cm; bars are densities (frequency / (n · width)).`,
    'ch.curves': p => `Densities drawn from records: ${p.list}.`, 'ch.nocurve': 'No record result to draw for this filter (the plot and period of a Diameter Distribution record must match the filter; with "all", the pooled result is drawn).',
    'ch.trunc': 'thresholded (conditional density)',
    'ch.sp': 'Species composition', 'ch.share': 'Share (%)', 'ch.byN': 'number of trees', 'ch.byG': 'basal area',
    'ch.N': 'Stems per hectare', 'ch.G': 'Basal area per hectare', 'ch.plot': 'Plot', 'ch.Nha': 'N (trees/ha)', 'ch.Gha': 'G (m²/ha)',
    'ch.hd': 'Height–diameter', 'ch.h': 'Height (m)', 'ch.hd.note': p => `${p.m} measured height(s)${p.e ? `, ${p.e} estimated height(s) ${p.show ? 'included' : 'not shown'}` : ''}.`, 'ch.hd.curves': p => `Curves from records: ${p.list} (★ chosen model).`,
    'ch.map': 'Tree map', 'ch.x': 'x (m)', 'ch.y': 'y (m)', 'ch.map.need': 'Choose a single plot for the map; its trees need x, y coordinates.', 'ch.map.none': 'No trees with coordinates in this plot.',
    'nav.h': 'Go to a chart', 'nav.up': '↑ Filters',
    'ch.empty': 'No records for this filter.', svg: 'SVG', csv: 'CSV', 'ch.n': 'records',
    'x.class': 'Class lower (cm)', 'x.classhi': 'Class upper (cm)', 'x.count': 'Count', 'x.dens': 'Density',
  },
});
