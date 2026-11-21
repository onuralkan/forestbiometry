// Taper: the tool's own required field of a coefficient set (set.meta.bark: which diameter the profile gives),
// shared by the tool page and the coefficient library page (DI-02).
import { T } from './i18n.js';

export const EXTRA = [{ key: 'bark', type: 'choice', required: true, label: { en: T('x.bark') }, values: ['ob', 'ib'].map(v => ({ v, en: T('x.bark.' + v) })), note: { en: T('x.bark.note') } }];
