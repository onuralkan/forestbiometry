// Site index: the tool's own required fields of a coefficient set (stored in set.meta), shared by the tool page and
// the coefficient library page (DI-02). K8: the age type is chosen explicitly and never converted.
import * as S from './calc.js';
import { T } from './i18n.js';

export const EXTRA = [
  { key: 'ageType', type: 'choice', required: true, label: { tr: T('x.ageType'), en: T('x.ageType') }, values: S.AGE_TYPES.map(v => ({ v, tr: T('x.ageType.' + v), en: T('x.ageType.' + v) })), note: { tr: T('x.ageType.note'), en: T('x.ageType.note') } },
  { key: 'topDef', type: 'choice', required: true, label: { tr: T('x.topDef'), en: T('x.topDef') }, values: ['h0dbh', 'h0height', 'other'].map(v => ({ v, tr: T('x.topDef.' + v), en: T('x.topDef.' + v) })) },
  { key: 'topNote', type: 'text', label: { tr: T('x.topNote'), en: T('x.topNote') } },
  { key: 'cov', type: 'text', label: { tr: T('x.cov'), en: T('x.cov') }, note: { tr: T('x.cov.note'), en: T('x.cov.note') } }];
