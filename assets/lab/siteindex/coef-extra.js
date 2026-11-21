// Site index: the tool's own required fields of a coefficient set (stored in set.meta), shared by the tool page and
// the coefficient library page (DI-02). K8: the age type is chosen explicitly and never converted.
import * as S from './calc.js';
import { T } from './i18n.js';

export const EXTRA = [
  { key: 'ageType', type: 'choice', required: true, label: { en: T('x.ageType') }, values: S.AGE_TYPES.map(v => ({ v, en: T('x.ageType.' + v) })), note: { en: T('x.ageType.note') } },
  { key: 'topDef', type: 'choice', required: true, label: { en: T('x.topDef') }, values: ['h0dbh', 'h0height', 'other'].map(v => ({ v, en: T('x.topDef.' + v) })) },
  { key: 'topNote', type: 'text', label: { en: T('x.topNote') } },
  { key: 'cov', type: 'text', label: { en: T('x.cov') }, note: { en: T('x.cov.note') } }];
