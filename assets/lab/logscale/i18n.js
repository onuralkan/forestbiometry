// Log scaling (SV-05): TR/EN interface texts.
import { makeT } from '../core/i18n.js';

export const T = makeT({
  en: {
    privacy: 'Your data stay in this browser; nothing is sent to the server.',
    'step.1': 'Logs', 'step.2': 'Rules', 'step.3': 'Results', next: 'Next', back: 'Back', reset: 'Reset session', calc: 'Compute', none: '—',
    restored: p => `Previous session restored (${p.when}).`,
    'mode.h': 'Input', 'mode.single': 'One log', 'mode.table': 'Log table',
    'in.ds': 'Small-end diameter inside bark (cm)', 'in.db': 'Large-end diameter (cm, optional)', 'in.dm': 'Middle diameter (cm, optional)', 'in.L': 'Length (m)',
    'tb.h': 'Log table', 'tb.sub': 'One log per row: small-end diameter (cm, inside bark), length (m); large-end and middle diameters optional (for the cubic volume and splitting long logs).',
    'map.id': 'Log (optional)', 'map.ds': 'Small-end diameter (cm)', 'map.db': 'Large-end diameter (cm)', 'map.dm': 'Middle diameter (cm)', 'map.L': 'Length (m)',
    'dec.h': 'Decimal separator', 'dec.dot': 'point (12.5)', 'dec.comma': 'comma (12,5)', 'map.use': 'Use this table', 'sample': 'Load the simulated table', 'sample.note': 'Simulated data for trying out (random numbers).',
    'src.info': p => `${p.n} logs.`, 'need.data': 'Enter logs first.', 'p.single': 'Small-end diameter and length must be positive; the large end cannot be below the small end.',
    'r.h': 'Board-foot rules', 'r.sub': 'Kershaw et al. (2016) §7.3: board feet of 1-inch lumber from the small-end diameter (in.) and the length (ft).',
    'r.scribner': 'Scribner (7.3)', 'r.doyle': 'Doyle (7.5)', 'r.intl8': 'International ⅛ inch (7.7–7.10; 8, 12, 16, 20 ft only)', 'r.intl4': 'International ¼ inch (Grosenbaugh 1952; any length)',
    'o.h': 'Scaling conventions', 'o.roundD': 'Diameter rounded to the nearest inch', 'o.len': 'Scaling length', 'o.len.whole': 'whole feet (down)', 'o.len.even': 'even feet (down)', 'o.len.none': 'not rounded',
    'o.max': 'Maximum scaling length (ft, optional)', 'o.round5': 'Round the International rules to 5 board feet (as Clark\'s tables)',
    'o.note': '§7.4.1: diameter inside bark at the small end, to the nearest inch; trim allowance is not part of the scaling length. A log longer than the maximum scaling length is scaled as two or more logs, the longer one at the butt when it does not divide evenly; the diameter at the point of separation is taken as linear between the small and large ends (a tool rule; the large end is needed). The book\'s values (16 ft in the east, 40 ft in the west) are not defaults.',
    'p.rules': 'Choose at least one rule', 'p.max': 'The maximum scaling length must be a positive number',
    'res.h': 'Logs', 'res.id': 'Log', 'res.ds': 'Small end (cm)', 'res.L': 'Length (m)', 'res.Lft': 'Scaling length (ft)', 'res.Din': 'Scaling diameter (in.)', 'res.seg': 'Segment', 'res.bf': p => `${p.r} (board feet)`,
    'res.sm': 'Smalian (m³)', 'res.hu': 'Huber (m³)', 'res.ne': 'Newton (m³)', 'res.tot': 'Total', 'res.partial': 'Some logs could not be scaled by this rule; a partial total is not shown.', 'res.mbf': p => `Total: ${p.list}.`, 'res.note': 'The board foot is not a metric unit; it is given with its definition in US and Canadian trade (1 board foot = 1 in × 12 in × 1 ft of lumber). The cubic volume comes from the measured metric values, unrounded.',
    'e.input': 'invalid measurement', 'e.db': 'large end below the small end', 'e.short': 'scaling length zero', 'e.split.db': 'splitting needs the large-end diameter', 'e.max': 'invalid maximum length',
    'e.intl8.length': 'no equation for this length (8/12/16/20 ft)', 'e.doyle.small': 'diameter 4 inches or less', 'e.nonpositive': 'the rule gives no positive volume',
    'x.h': 'Download', 'x.xlsx': 'Excel report', 'x.csv': 'Logs (CSV)', 'x.json': 'JSON', 'x.fail': 'The Excel library could not be loaded.', 'x.info': 'Info', 'x.logs': 'Logs', 'x.segs': 'Segments', 'x.k': 'Field', 'x.v': 'Value', 'x.tool': 'Tool', 'x.date': 'Date', 'x.src': 'Source', 'x.rule': 'Rule',
  },
});
