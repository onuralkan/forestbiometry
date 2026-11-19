// Report generator (DI-05): the report as HTML text, no DOM (the page shows it and prints it; the same text is saved
// as a standalone file). The report language is chosen apart from the interface language, so its words live here.
import { plotChart, barChart } from '../core/chart.js';
import { cite, plain } from '../core/citation.js';
import { num as num0 } from './calc.js';
// Numbers in the report follow its language: decimal comma in Turkish, point in English (19 Nov 2026, user decision).
let DEC = '.';
const num = x => { const t = num0(x); return DEC === ',' && typeof x === 'number' ? String(t).replace('.', ',') : t; };

const RT = {
  tr: {
    by: 'Hazırlayan', org: 'Kurum', date: 'Tarih', untitled: 'Envanter raporu', made: p => `Bu rapor ${p.site} (${p.url}) Rapor Üretici ${p.v} ile ${p.at} tarihinde üretildi. Hesaplar kullanıcının tarayıcısında yapıldı.`,
    'h.package': 'Veri paketi', 'h.charts': 'Grafikler', 'h.records': 'Çalışma kayıtları', 'h.sources': 'Kaynaklar', 'h.repro': 'Ek: Tekrarlanabilirlik',
    name: 'Ad', year: 'Envanter yılı', place: 'Yer', desc: 'Açıklama', plots: 'Örnek alan', empty: 'ağaçsız', periods: 'Dönemler', noper: 'dönemsiz', records: 'Kayıt', trees: 'Ayrı ağaç',
    species: 'Türler', nosp: 'tür yok', dbh: 'Çap aralığı (cm)', heights: 'Boy', hval: p => `${p.m} ölçülmüş, ${p.e} tahmini`, strata: 'Tabakalar', area: 'Örnek alan büyüklüğü (m²)',
    warn: 'Uyarılar (açık)', excl: 'Dışlanan satır', approved: 'Onay zamanı', src: 'Kaynak dosya', plotper: 'Örnek alan × dönem kayıt sayıları', plot: 'Örnek alan', areaC: 'Alan (m²)', stratum: 'Tabaka',
    filter: 'Süzgeç', all: 'hepsi', ecU: 'kaydı olmayan örnek alan × dönem ölçülmedi sayıldı', ecE: 'kaydı olmayan örnek alan × dönem boş (N = G = 0) sayıldı',
    hist: 'Çap dağılımı', histNote: p => `${p.n} kayıt, sınıf genişliği ${p.w} cm; çubuklar yoğunluk (sıklık / (n · genişlik)).`, curves: p => `Kayıtlardan yoğunluklar: ${p.list}.`, d: 'Göğüs çapı (cm)', dens: 'Yoğunluk',
    sp: 'Tür katılımı', share: 'Pay (%)', byN: 'ağaç sayısı', byG: 'göğüs yüzeyi', N: 'Hektarda ağaç sayısı', G: 'Hektarda göğüs yüzeyi', Nha: 'N (ağaç/ha)', Gha: 'G (m²/ha)',
    mean: p => `Ağırlıksız ortalama (${p.n} örnek alan × dönem): N = ${p.N} ağaç/ha, G = ${p.G} m²/ha. Tasarıma dayalı kestirim değildir.`, hd: 'Boy–çap', h: 'Boy (m)', hdNote: p => `${p.m} ölçülmüş boy.${p.list ? ` Kayıttan eğriler: ${p.list} (★ seçilen model).` : ''}`,
    noRec: 'Rapora çalışma kaydı eklenmedi.', tool: 'Araç', ver: 'Sürüm', created: 'Oluşturma', seal: 'Mühür', sealOk: 'geçerli', sealBad: 'TUTMUYOR (kayıt değiştirilmiş)', sealNone: 'yok',
    fromPkg: 'Veri', fromYes: 'bu rapordaki paketten', fromNo: 'BAŞKA bir paketten', fromUnk: 'dosyadan (pakete ait olup olmadığı bilinmiyor)', legacy: 'DI-07 öncesi kayıt (mühür ve parmak izi yok)',
    settings: 'Ayarlar', rowsOf: p => `${p.total} satırın ilk ${p.shown} tanesi gösteriliyor.`, coef: 'Kullanıcı katsayı kaynakları',
    platform: 'Platform', toolsCite: 'Kullanılan araçlar', lit: 'Kayıtlarda adı geçen kaynaklar', coefSrc: 'Kullanıcının girdiği katsayı setlerinin kaynakları', noLit: 'Kayıtlarda kaynak listesi yok; yöntem kaynakları için aracın kılavuz bölümüne ve METHODS.md\'ye bakın.',
    status: { B: '[B] okundu', D: '[D] doğrulanmadı', A: '[A] aktaran', P: '[P] paket belgesi', 'İ': '[İ] künye doğrulandı' },
    pkgFp: 'Veri paketinin parmak izi (SHA-256, kanonik JSON)', commit: 'Kaynak kodu (commit)', none: 'yok (geliştirme ortamı)', inputs: 'Girdiler', role: 'Rol', kind: 'Tür', size: 'Boyut', fp: 'SHA-256',
    reportCommit: 'Raporu üreten sitenin commit\'i', verify: 'Kayıtlar Kayıt Doğrulayıcı ile, girdi dosyaları parmak izleriyle denetlenebilir.',
  },
  en: {
    by: 'Prepared by', org: 'Institution', date: 'Date', untitled: 'Inventory report', made: p => `This report was produced on ${p.at} with the Report Generator ${p.v} of ${p.site} (${p.url}). The calculations ran in the user's browser.`,
    'h.package': 'Data package', 'h.charts': 'Charts', 'h.records': 'Run records', 'h.sources': 'References', 'h.repro': 'Appendix: Reproducibility',
    name: 'Name', year: 'Inventory year', place: 'Place', desc: 'Description', plots: 'Plots', empty: 'without trees', periods: 'Periods', noper: 'no period', records: 'Records', trees: 'Distinct trees',
    species: 'Species', nosp: 'no species', dbh: 'Diameter range (cm)', heights: 'Height', hval: p => `${p.m} measured, ${p.e} estimated`, strata: 'Strata', area: 'Plot size (m²)',
    warn: 'Warnings (open)', excl: 'Excluded rows', approved: 'Approved', src: 'Source file', plotper: 'Records per plot × period', plot: 'Plot', areaC: 'Area (m²)', stratum: 'Stratum',
    filter: 'Filter', all: 'all', ecU: 'plot × period without records counted as not measured', ecE: 'plot × period without records counted as empty (N = G = 0)',
    hist: 'Diameter distribution', histNote: p => `${p.n} records, class width ${p.w} cm; bars are densities (frequency / (n · width)).`, curves: p => `Densities from records: ${p.list}.`, d: 'Diameter at breast height (cm)', dens: 'Density',
    sp: 'Species composition', share: 'Share (%)', byN: 'number of trees', byG: 'basal area', N: 'Stems per hectare', G: 'Basal area per hectare', Nha: 'N (trees/ha)', Gha: 'G (m²/ha)',
    mean: p => `Unweighted mean (${p.n} plot × period): N = ${p.N} trees/ha, G = ${p.G} m²/ha. Not a design-based estimate.`, hd: 'Height–diameter', h: 'Height (m)', hdNote: p => `${p.m} measured height(s).${p.list ? ` Curves from records: ${p.list} (★ chosen model).` : ''}`,
    noRec: 'No run records were added to the report.', tool: 'Tool', ver: 'Version', created: 'Created', seal: 'Seal', sealOk: 'holds', sealBad: 'DOES NOT HOLD (record changed)', sealNone: 'none',
    fromPkg: 'Data', fromYes: 'the package in this report', fromNo: 'ANOTHER package', fromUnk: 'a file (whether it is this package cannot be told)', legacy: 'record written before DI-07 (no seal or fingerprints)',
    settings: 'Settings', rowsOf: p => `First ${p.shown} of ${p.total} rows shown.`, coef: 'Sources of user coefficients',
    platform: 'Platform', toolsCite: 'Tools used', lit: 'References named in the records', coefSrc: 'Sources of the coefficient sets entered by the user', noLit: 'The records carry no reference list; see the tool\'s guide section and METHODS.md for the method sources.',
    status: { B: '[B] read', D: '[D] not verified', A: '[A] cited via', P: '[P] package documentation', 'İ': '[İ] citation verified' },
    pkgFp: 'Fingerprint of the data package (SHA-256, canonical JSON)', commit: 'Source code (commit)', none: 'none (development setup)', inputs: 'Inputs', role: 'Role', kind: 'Kind', size: 'Size', fp: 'SHA-256',
    reportCommit: 'Commit of the site that produced the report', verify: 'The records can be checked with the Record Verifier, the input files with their fingerprints.',
  },
};
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** User text: escaped, blank lines → paragraphs, single line breaks kept. */
export const para = s => String(s || '').trim() ? String(s).trim().split(/\n\s*\n/).map(p => `<p>${e(p).replace(/\n/g, '<br>')}</p>`).join('') : '';
const tbl = (head, rows, cls = '') => `<table class="rt${cls ? ' ' + cls : ''}"><thead><tr>${head.map(h => `<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${e(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const dl = rows => `<dl class="rkv">${rows.map(([k, v]) => `<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join('')}</dl>`;
const COMMIT = c => typeof c === 'string' && /^[0-9a-f]{40}$/.test(c) ? c : null;

/**
 * model = { lang, meta: blankMeta(), sections: { package, charts, records, sources, repro: bool }, pkg: packagePart() | null,
 *   records: [recordSection()], cite: { author, year, base, site, doi }, tools: { file: { v, tr, en } }, generated: { at (ISO), commit, version } }
 * → HTML of the report body (<article>).
 */
export function renderReport(m) {
  const L = m.lang === 'en' ? 'en' : 'tr'; DEC = L === 'tr' ? ',' : '.';
  const t = RT[L], T = (k, p) => typeof t[k] === 'function' ? t[k](p) : t[k], S = m.sections, M = m.meta;
  const day = m.generated.at.slice(0, 10);
  let h = `<article class="report" lang="${L}"><header class="r-head"><h1>${e(M.title || T('untitled'))}</h1>`;
  h += dl([[T('by'), M.author], [T('org'), M.org], [T('date'), M.date]].filter(([, v]) => v));
  h += para(M.intro) + `</header>`;
  const note = k => M.notes && M.notes[k] ? `<div class="r-note">${para(M.notes[k])}</div>` : '';
  let n = 0; const H = k => `<h2>${++n}. ${e(T('h.' + k))}</h2>`;

  if (S.package && m.pkg) {
    const p = m.pkg, pr = p.project, s = p.summary, pers = s.periods.map(v => v == null ? '' : v);
    h += `<section class="r-sec" id="r-package">${H('package')}${note('package')}`;
    h += dl([[T('name'), pr.name], [T('year'), pr.year], [T('place'), pr.location], [T('desc'), pr.description]].filter(([, v]) => v != null && v !== ''));
    h += dl([[T('plots'), `${s.plots}${s.emptyPlots ? ` (${s.emptyPlots} ${T('empty')})` : ''}`], [T('periods'), s.periods.map(v => v ?? T('noper')).join(', ')], [T('records'), s.records], [T('trees'), s.trees],
      [T('species'), s.species.map(x => `${x.species || T('nosp')} ${x.n}`).join(', ')], [T('dbh'), s.dbh ? `${num(s.dbh.min)}–${num(s.dbh.max)}` : '–'], [T('heights'), T('hval', { m: s.heights.measured, e: s.heights.estimated })],
      [T('strata'), s.strata.join(', ') || '–'], [T('area'), s.area ? `${num(s.area.min)}–${num(s.area.max)}` : '–'], [T('warn'), `${s.warnings} (${s.open})`], [T('excl'), s.excluded],
      [T('approved'), pr.dataset.created || '–'], [T('src'), (pr.dataset.source && pr.dataset.source.trees && pr.dataset.source.trees.name) || '–']]);
    h += `<h3>${e(T('plotper'))}</h3>` + tbl([T('plot'), T('areaC'), T('stratum'), ...pers.map(v => v === '' ? T('noper') : v)], s.byPlot.map(b => [b.plot_id, num(b.area), b.stratum ?? '–', ...pers.map(v => b.n[v] ?? '–')]), 'num');
    h += `</section>`;
  }
  if (S.charts && m.pkg) {
    const p = m.pkg, f = p.filter, fl = [['period', f.period], ['stratum', f.stratum], ['species', f.species], ['plot', f.plot]].map(([k, v]) => `${k}: ${v === '*' ? T('all') : v === '' ? '–' : v}`).join(', ');
    h += `<section class="r-sec" id="r-charts">${H('charts')}${note('charts')}<p class="r-small">${e(T('filter'))}: ${e(fl)}; ${e(T(p.ec === 'empty' ? 'ecE' : 'ecU'))}.</p>`;
    if (p.hist.bins.length) {
      const b = p.hist.bins, lines = p.hist.curves.slice(0, 6).map((c, k) => ({ name: `${c.family} ${c.method}${c.truncated ? ' *' : ''}`, k, dash: c.estimator && c.estimator !== 'ml', pts: c.pts }));
      h += `<figure>${plotChart({ title: T('hist'), xmin: b[0].lo, xmax: b[b.length - 1].hi, bars: b.map(x => ({ lo: x.lo, hi: x.hi, v: x.dens })), lines, xLabel: T('d'), yLabel: T('dens'), fmt: num })}<figcaption>${e(T('hist'))}. ${e(T('histNote', { n: p.hist.n, w: num(p.hist.width) }))}${p.hist.curves.length ? ' ' + e(T('curves', { list: p.hist.curves.map(c => `${c.family} · ${c.method}`).join('; ') })) : ''}</figcaption></figure>`;
    }
    if (p.species.length) h += `<figure>${barChart({ title: T('sp'), categories: p.species.map(x => x.species || T('nosp')), series: [{ name: T('byN'), values: p.species.map(x => x.shareN * 100) }, { name: T('byG'), values: p.species.map(x => x.shareG * 100) }], yLabel: T('share'), fmt: v => num(+v.toFixed(1)) })}<figcaption>${e(T('sp'))}.</figcaption></figure>`;
    if (p.plots.rows.length) {
      const cat = p.plots.rows.map(r => f.period === '*' ? `${r.plot} · ${r.period ?? T('noper')}` : r.plot);
      h += `<figure>${barChart({ title: T('N'), categories: cat, series: [{ name: T('Nha'), values: p.plots.rows.map(r => r.Nha) }], yLabel: T('Nha'), fmt: v => num(+v.toFixed(1)) })}<figcaption>${e(T('N'))}. ${e(T('mean', { n: p.plots.mean.n, N: num(+p.plots.mean.Nha.toFixed(1)), G: num(+p.plots.mean.Gha.toFixed(2)) }))}</figcaption></figure>`;
      h += `<figure>${barChart({ title: T('G'), categories: cat, series: [{ name: T('Gha'), values: p.plots.rows.map(r => r.Gha) }], yLabel: T('Gha'), fmt: v => num(+v.toFixed(2)) })}<figcaption>${e(T('G'))}.</figcaption></figure>`;
    }
    if (p.hd.measured.length) {
      const xmax = Math.max(...p.hd.measured.map(q => q[0])) * 1.05, lines = p.hd.curves.slice(0, 6).map((c, k) => ({ name: c.name + (c.chosen ? ' ★' : ''), k, pts: c.pts, dash: !c.chosen }));
      h += `<figure>${plotChart({ title: T('hd'), xmin: 0, xmax, ymin: 0, points: p.hd.measured, lines, xLabel: T('d'), yLabel: T('h'), fmt: num })}<figcaption>${e(T('hd'))}. ${e(T('hdNote', { m: p.hd.measured.length, list: p.hd.curves.map(c => c.name + (c.chosen ? ' ★' : '')).join(', ') }))}</figcaption></figure>`;
    }
    h += `</section>`;
  }
  if (S.records) {
    h += `<section class="r-sec" id="r-records">${H('records')}${note('records')}`;
    if (!m.records.length) h += `<p>${e(T('noRec'))}</p>`;
    m.records.forEach((r, i) => {
      const tl = m.tools[r.tool && r.tool.page] || null, title = tl ? tl[L] : (r.tool && r.tool.id) || r.name;
      h += `<div class="r-rec"><h3>${n}.${i + 1} ${e(title)}</h3>`;
      h += dl([[T('tool'), `${r.tool ? r.tool.id : '–'} ${r.tool && r.tool.version ? r.tool.version : ''}`], [T('created'), r.created || '–'],
        [T('seal'), r.kind === 'legacy' ? T('legacy') : r.seal === true ? T('sealOk') : r.seal === false ? T('sealBad') : T('sealNone')],
        [T('fromPkg'), r.fromPackage === true ? T('fromYes') : r.fromPackage === false ? T('fromNo') : T('fromUnk')]]);
      if (r.settings.length) h += `<h4>${e(T('settings'))}</h4>` + dl(r.settings);
      for (const b of r.blocks) h += `<h4>${e(b.title)}</h4>` + dl(b.rows);
      for (const tb of r.tables) h += `<h4>${e(tb.title)}</h4>` + tbl(tb.cols, tb.rows, 'num') + (tb.total > tb.shown ? `<p class="r-small">${e(T('rowsOf', tb))}</p>` : '');
      if (r.coefSources.length) h += `<h4>${e(T('coef'))}</h4><ul>${r.coefSources.map(c => `<li>${e(c)}</li>`).join('')}</ul>`;
      h += `</div>`;
    });
    h += `</section>`;
  }
  if (S.sources) {
    h += `<section class="r-sec" id="r-sources">${H('sources')}${note('sources')}`;
    const base = { lang: L, author: m.cite.author, year: m.cite.year, base: m.cite.base, site: m.cite.site, accessed: day, doi: m.cite.doi || undefined };
    h += `<h3>${e(T('platform'))}</h3><p class="r-cite">${cite('apa', { ...base, tool: null })}</p>`;
    const used = [...new Set([...m.records.map(r => r.tool && r.tool.page).filter(p => m.tools[p]), 'rapor.php'])];
    h += `<h3>${e(T('toolsCite'))}</h3><ul class="r-cites">${used.map(p => `<li>${cite('apa', { ...base, tool: { file: p, ...m.tools[p], v: (m.records.find(r => r.tool && r.tool.page === p) || {}).tool?.version || m.tools[p].v } })}</li>`).join('')}</ul>`;
    const lit = new Map(); for (const r of m.records) for (const x of r.refs) lit.set(x.cite, x);
    h += `<h3>${e(T('lit'))}</h3>` + (lit.size ? `<ul class="r-cites">${[...lit.values()].map(x => `<li>${e(x.cite)}${x.status ? ` <span class="r-small">${e(t.status[x.status] || '[' + x.status + ']')}</span>` : ''}</li>`).join('')}</ul>` : `<p class="r-small">${e(T('noLit'))}</p>`);
    const cs = [...new Set(m.records.flatMap(r => r.coefSources))];
    if (cs.length) h += `<h3>${e(T('coefSrc'))}</h3><ul class="r-cites">${cs.map(c => `<li>${e(c)}</li>`).join('')}</ul>`;
    h += `</section>`;
  }
  if (S.repro) {
    h += `<section class="r-sec" id="r-repro">${H('repro')}${note('repro')}`;
    const gc = COMMIT(m.generated.commit);
    h += dl([[T('reportCommit'), gc || T('none')], ...(m.pkg ? [[T('pkgFp'), m.pkg.project.sha256 || '–']] : [])]);
    m.records.forEach((r, i) => {
      const c = COMMIT(r.build && r.build.commit);
      h += `<h3>${e(r.name)}</h3>` + dl([[T('tool'), `${r.tool ? r.tool.id : '–'} ${r.tool && r.tool.version || ''}`], [T('commit'), c || T('none')], [T('seal'), r.expected ? `${r.seal ? T('sealOk') : T('sealBad')}: ${r.expected}` : T('sealNone')]]);
      if (r.inputs.length) h += tbl([T('role'), T('kind'), T('name'), T('size'), T('fp')], r.inputs.map(x => [x.role, x.kind, x.name || '–', x.bytes ?? '–', x.sha256]), 'mono');
    });
    h += `<p class="r-small">${e(T('verify'))}</p></section>`;
  }
  h += `<footer class="r-foot"><p>${e(T('made', { site: plain(m.cite.site[L]), url: m.cite.base, v: m.generated.version, at: m.generated.at.replace('T', ' ').slice(0, 16) + ' UTC' }))}</p></footer></article>`;
  return h;
}

/** Print and file styles of the report (light colours, chart classes written out, as svgForDownload does). */
export const REPORT_CSS = `.report{font:11pt/1.45 -apple-system,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif;color:#1f2328;background:#fff;max-width:190mm;margin:0 auto;padding:12mm 0}
.report h1{font-size:20pt;margin:0 0 6pt}.report h2{font-size:14pt;margin:14pt 0 6pt;border-bottom:1px solid #d1d9e0;padding-bottom:3pt}.report h3{font-size:12pt;margin:10pt 0 4pt}.report h4{font-size:10.5pt;margin:8pt 0 3pt}
.report .rkv{display:grid;grid-template-columns:max-content 1fr;gap:2pt 12pt;margin:4pt 0}.report .rkv dt{color:#59636e}.report .rkv dd{margin:0;overflow-wrap:anywhere}
.report table.rt{border-collapse:collapse;width:100%;font-size:9pt;margin:4pt 0}.report table.rt th,.report table.rt td{border:1px solid #d1d9e0;padding:2pt 4pt;text-align:left;vertical-align:top}.report table.rt th{background:#f6f8fa}
.report table.num td{font-variant-numeric:tabular-nums}.report table.mono td{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:8pt;overflow-wrap:anywhere}
.report figure{margin:8pt 0;break-inside:avoid}.report figure svg{width:100%;height:auto;max-height:110mm}.report figcaption{font-size:9pt;color:#59636e}
.report .r-small{font-size:9pt;color:#59636e}.report .r-note{border-left:3px solid #0969da;padding:2pt 8pt;margin:4pt 0;background:#f6f8fa}.report .r-rec{break-inside:auto;margin-bottom:8pt}
.report .r-cites li,.report .r-cite{overflow-wrap:anywhere}.report .r-foot{margin-top:16pt;border-top:1px solid #d1d9e0;font-size:8.5pt;color:#59636e}
.report .chart text{font-family:inherit}.report .ch-grid{stroke:#d8dee4;stroke-width:1}.report .ch-axis{stroke:#1f2328;stroke-width:1}.report .ch-frame{fill:none;stroke:#d1d9e0}.report .ch-ref{stroke:#1f2328;stroke-width:1.2;stroke-dasharray:6 4}
.report .ch-tick{fill:#59636e;font-size:12px}.report .ch-lab{fill:#1f2328;font-size:12.5px;font-weight:600}.report .ch-bar{fill:#d1d9e0}.report .ch-line{fill:none;stroke-width:2}.report .ch-dash{stroke-dasharray:6 4}.report .ch-dot{stroke-dasharray:1.5 3.5}
.report .ch-pts{fill-opacity:.6}.report .ch-ptsg{fill:#59636e}
${['#0072b2', '#e69f00', '#009e73', '#cc79a7', '#56b4e9', '#d55e00'].map((c, i) => `.report .ch-s${i}{fill:${c}}.report .ch-l${i}{stroke:${c}}`).join('')}
.report h2,.report h3{break-after:avoid}@page{size:A4;margin:14mm 12mm}`;

/** A standalone HTML file of the report (opens offline, prints the same). */
export function standalone(body, title, lang) {
  return `<!doctype html>\n<html lang="${lang === 'en' ? 'en' : 'tr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title)}</title><style>body{margin:0;background:#fff}${REPORT_CSS}</style></head><body>${body}</body></html>\n`;
}
