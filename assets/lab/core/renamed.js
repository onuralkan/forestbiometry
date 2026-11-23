// Page file names before 23 Nov 2026 (Turkish) → the English names; the same map as inc/renamed.php (tests/site check
// that they agree). Used where the browser holds old page names: run records written before (Record Verifier) and the
// "Recently used" list on the home page. Tool ids (TOOL.id) are not renamed.
export const RENAMED = {
  'veri-denetcisi.php': 'data-checker.php',
  'ornek-alan.php': 'plot-stand-metrics.php',
  'model-degerlendirme.php': 'model-evaluation.php',
  'cap-dagilimi.php': 'diameter-distribution.php',
  'boy-cap.php': 'height-diameter.php',
  'ornekleme.php': 'sampling-planner.php',
  'nispi-siralama.php': 'relative-ranking.php',
  'seksiyon-hacmi.php': 'section-volume.php',
  'bonitet.php': 'site-index.php',
  'mescere-yapisi.php': 'stand-structure.php',
  'govde-profili.php': 'stem-taper.php',
  'buyume-islevi.php': 'growth-functions.php',
  'katsayi-kutuphanesi.php': 'coefficient-library.php',
  'kayit-dogrulayici.php': 'record-verifier.php',
  'veri-yoneticisi.php': 'data-manager.php',
  'pano.php': 'data-visualization.php',
  'rapor.php': 'report-generator.php',
  'agac-olcumu.php': 'tree-measurement.php',
  'biyokutle-karbon.php': 'biomass-carbon.php',
  'hacim-denklemleri.php': 'volume-equations.php',
  'tomruk-olcumu.php': 'log-scaling.php',
  'dogrusal-olmayan-regresyon.php': 'nonlinear-regression.php',
  'karma-modeller.php': 'mixed-models.php',
  'denklem-sistemleri.php': 'equation-systems.php',
  'araclar.php': 'tools.php',
  'hakkinda.php': 'about.php',
  'kaynakca.php': 'references.php',
  'kilavuz.php': 'guide.php',
  'gizlilik.php': 'privacy.php',
  'hesap.php': 'account.php',
  'yonetim.php': 'administration.php',
};
/** The current page for a page name that may be old. */
export const currentPage = f => RENAMED[f] || f;
