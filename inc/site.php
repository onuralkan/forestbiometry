<?php
// Shared shell of forestbiometry.online: language, header, footer, tool list, author details.
// Not web-accessible (see inc/.htaccess). No database, no sessions, no server-side user data.
// Usage: site_top(['title' => ..., 'desc' => ..., 'kicker' => ..., 'lede' => ...]); ...; site_bottom('<script ...>');
declare(strict_types=1);

date_default_timezone_set('Europe/Istanbul');

/** Author and responsible person, shown on the About page and in the footer. Empty values are not shown. */
/** For citations: canonical address and the year the platform was first published. */
const SITE_BASE = 'https://forestbiometry.online/';
const SITE_YEAR = 2026;
require_once __DIR__ . '/catalog.php';
const SITE_DOI = '10.5281/zenodo.24135603';   // Zenodo concept DOI of the repository archive (all versions); '' = none

const SITE_AUTHOR = [
    'name'  => 'Onur Alkan',
    'email' => 'onuralkan@isparta.edu.tr',
    'orcid' => '0000-0001-5798-3421',
    'family' => 'Alkan', 'given' => 'Onur',      // for citations   // shown only when filled in
];

function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

/**
 * The site is English only (20 Nov 2026, user decision; Turkish is removed step by step, its strings stay unused in the
 * code for now). Old Turkish links (?lang=tr) are sent to the same page without the parameter, and the old language
 * cookie is cleared; ?lang=en is accepted and ignored.
 */
function lang(): string {
    if (isset($_GET['lang']) && $_GET['lang'] !== 'en' && !headers_sent() && PHP_SAPI !== 'cli') {
        $q = $_GET; unset($q['lang']);
        $path = strtok($_SERVER['REQUEST_URI'] ?? '/', '?');
        header('Location: ' . $path . ($q ? '?' . http_build_query($q) : ''), true, 301); exit;
    }
    if (isset($_COOKIE['lang']) && !headers_sent()) setcookie('lang', '', ['expires' => 1, 'path' => '/', 'samesite' => 'Lax']);
    return 'en';
}

function site_ctx(): array {
    static $c = null;
    if ($c) return $c;
    $c = ['L' => lang(),
          // brand (20 Nov 2026, user decision): "Forest Biometry" in both languages; the descriptive subtitle stays
          'site' => 'Forest Biometry', 'sub' => 'Forest Biometrics Tools'];
    return $c;
}

/** Tool pages of the platform. 'cat' = home module of the catalogue (inc/catalog.php; the page may cover ids of other modules too), 'icon' = site_icon() name, 'short' = sidebar label. */
function site_tools(): array {
    return [
        ['n' => 1, 'cat' => 'DI', 'icon' => 'checker', 'short' => 'Data Checker', 'file' => 'veri-denetcisi.php', 'v' => '1.3.0', 'lab' => 'checker', 'title' => 'Forest Data Checker',
         'desc' => 'Import tree and plot tables, map the columns, find format errors and suspect measurements; record every fix with a reason and approve the data.'],
        ['n' => 2, 'cat' => 'SS', 'icon' => 'plot', 'short' => 'Plot & Stand Metrics', 'file' => 'ornek-alan.php', 'v' => '1.2.1', 'lab' => 'stand', 'title' => 'Plot & Stand Metrics',
         'desc' => 'From approved data, per plot and period: stems and basal area per hectare, mean diameters, diameter classes and species composition; between-plot summary and design-based forest estimate.'],
        ['n' => 3, 'cat' => 'SM', 'icon' => 'eval', 'short' => 'Model Evaluation', 'file' => 'model-degerlendirme.php', 'v' => '1.2.0-beta.3', 'lab' => 'eval', 'title' => 'Model Evaluation',
         'desc' => 'Bias, MAE, RMSE and prediction R² from observed and predicted values (optionally weighted); a confidence interval for the bias, bootstrap intervals and equivalence tests; observed–predicted and residual plots, performance tables by group.'],
        ['n' => 4, 'cat' => 'SS', 'icon' => 'dist', 'short' => 'Diameter Distribution', 'file' => 'cap-dagilimi.php', 'v' => '2.2.1', 'lab' => 'dist', 'title' => 'Diameter Distribution Lab',
         'desc' => 'Weibull, normal, lognormal, gamma, fixed-bound beta, Johnson SB, exponential and log-logistic: direct fitting by maximum likelihood, moments and percentiles, per plot and period; recovery from the mean and the variance or Dq; Poudel and Cao M2–M10 for the Weibull, Parresol for the Johnson SB; Excel and CSV output. Conditional maximum likelihood for measurement thresholds; class tables and fitting from class frequencies; model comparison, Q–Q and P–P plots; bootstrap p-values and intervals.'],
        ['n' => 5, 'cat' => 'SM', 'icon' => 'hd', 'short' => 'Height–Diameter', 'file' => 'boy-cap.php', 'v' => '1.1.1', 'lab' => 'hd', 'title' => 'Height–Diameter Modelling',
         'desc' => 'Fixed-effects version: fit the Näslund, Michailoff, Curtis, power, Chapman–Richards and Weibull equations by nonlinear least squares; comparison on the same trees, plot-based cross-validation, a separate prediction column for missing heights. For mixed-effects models use the Mixed-Effects Models tool.'],
        ['n' => 6, 'cat' => 'SI', 'icon' => 'sampling', 'short' => 'Sampling Planner', 'file' => 'ornekleme.php', 'v' => '1.1.0', 'lab' => 'sampling', 'title' => 'Inventory Sampling Planner',
         'desc' => 'Approximate number of plots to estimate a mean with a target relative error under simple random sampling: from pilot measurements or a CV you enter, with an optional finite population correction.'],
        ['n' => 7, 'cat' => 'SM', 'icon' => 'rank', 'short' => 'Relative Ranking', 'file' => 'nispi-siralama.php', 'v' => '1.2.0', 'lab' => 'rank', 'title' => 'Relative Ranking',
         'desc' => 'Relative ranks per criterion and overall from a goodness-of-fit table (R², FI, RMSE, MAE, Bias, AIC, BIC…); radar chart of the best and worst models.',
         'after' => 'model-degerlendirme.php'],   // listed under SM-06, right after Model Evaluation (19 Nov 2026, user decision)
        ['n' => 8, 'cat' => 'SV', 'icon' => 'secvol', 'short' => 'Section Volume', 'file' => 'seksiyon-hacmi.php', 'v' => '1.0.0-beta.2', 'lab' => 'secvol', 'title' => 'Stem Section Volume',
         'desc' => 'Single-tree stem volume from measured section diameters: Huber, Smalian, Newton and Hohenadl; stump and top piece apart, over- and under-bark volume, form factor, merchantable volume and per-hectare totals from plot sizes.'],
        ['n' => 9, 'cat' => 'SQ', 'icon' => 'siteindex', 'short' => 'Site Index', 'file' => 'bonitet.php', 'v' => '1.0.0-beta.4', 'lab' => 'siteindex', 'title' => 'Site Index',
         'desc' => 'Site index at a base age from top height and age: Chapman–Richards and Schumacher difference equations with your own coefficient set (source required), or with coefficients fitted to your own stem analyses and repeated measurements; age type, user-defined site classes, curve family, confidence intervals by bootstrap or the delta method; H0 from approved data.'],
        ['n' => 10, 'cat' => 'SS', 'icon' => 'structure', 'short' => 'Stand Structure', 'file' => 'mescere-yapisi.php', 'v' => '1.0.0-beta.5', 'lab' => 'structure', 'title' => 'Stand Structure & Competition',
         'desc' => 'Per plot and period: diameter structure, Gini and the Lorenz curve, Shannon and Simpson, SDI, Curtis RD, relative spacing and the crown competition factor (CCF); tree-level BAL; with coordinates, Clark–Evans, W, M, T, U and the Hegyi competition index, with edge correction.'],
        ['n' => 11, 'cat' => 'SV', 'icon' => 'taper', 'short' => 'Taper', 'file' => 'govde-profili.php', 'v' => '1.0.0-beta.3', 'lab' => 'taper', 'title' => 'Stem Taper',
         'desc' => 'Max and Burkhart (1976) and Kozak (2004) taper equations, with your own coefficient set or fitted to your stem measurements: diameter at any height, the height of a diameter, total and merchantable volume to a top diameter; outside- and inside-bark profiles.'],
        ['n' => 12, 'cat' => 'SQ', 'icon' => 'growth', 'short' => 'Growth Functions', 'file' => 'buyume-islevi.php', 'v' => '1.0.0-beta.1', 'lab' => 'growth', 'title' => 'Growth Function Fitter',
         'desc' => 'Fit Chapman–Richards, Schumacher, Gompertz, logistic, monomolecular and Weibull growth functions to your age–size data; compare the models by AIC and RMSE; current and mean annual increment, inflection point and culmination of the mean annual increment.'],
        ['n' => 13, 'cat' => 'DI', 'icon' => 'library', 'short' => 'Coefficient Library', 'file' => 'katsayi-kutuphanesi.php', 'v' => '1.0.0-beta.1', 'lab' => 'coeflib', 'title' => 'Coefficient Library',
         'desc' => 'The coefficient sets of every tool in one place: search and filter, details, editing, copying, deleting; finding sets with the same coefficients and sets with problems; backing up the whole library in one JSON file and restoring it with a preview.'],
        ['n' => 14, 'cat' => 'DI', 'icon' => 'verify', 'short' => 'Record Verifier', 'file' => 'kayit-dogrulayici.php', 'v' => '1.0.0-beta.1', 'lab' => 'record', 'title' => 'Record Verifier',
         'desc' => 'Open the run records (JSON) that the tools download: check with the seal that a record has not changed; see the tool, its version, the source-code commit and the settings; confirm with SHA-256 fingerprints that your original data files are byte for byte the inputs of the record.'],
        ['n' => 15, 'cat' => 'DI', 'icon' => 'database', 'short' => 'Data Manager', 'file' => 'veri-yoneticisi.php', 'v' => '1.0.0-beta.1', 'lab' => 'projects', 'title' => 'Inventory Data Manager',
         'desc' => 'Keep your approved data packages in the browser as projects: name, place, year and notes; plot × period overview; make one active and the tools that read approved data use it; import and export, copies, backup.'],
        ['n' => 16, 'cat' => 'DI', 'icon' => 'dashboard', 'short' => 'Data Visualization', 'file' => 'pano.php', 'v' => '1.0.0-beta.1', 'lab' => 'dashboard', 'title' => 'Data Visualization',
         'desc' => 'See a data package at a glance: summary, diameter distribution, species composition, N/ha and G/ha per plot, height–diameter and a tree map; period, stratum, species and plot filters; diameter densities and height curves from the tools\' run records on the same charts.'],
        ['n' => 17, 'cat' => 'DI', 'icon' => 'report', 'short' => 'Report Generator', 'file' => 'rapor.php', 'v' => '1.0.0-beta.1', 'lab' => 'report', 'title' => 'Report Generator',
         'desc' => 'Gather a data package and the tools\' run records in one report: title and notes, package summary, charts, the records\' settings and result tables, references and citations, a reproducibility appendix; print it, save it as PDF or as an HTML file.'],
        ['n' => 18, 'cat' => 'TM', 'icon' => 'measure', 'short' => 'Tree Measurement', 'file' => 'agac-olcumu.php', 'v' => '1.0.0-beta.4', 'lab' => 'tree', 'title' => 'Tree Measurement',
         'desc' => 'Tree height from clinometer or rangefinder readings (tangent, line-of-sight distance, shadow and two-pole methods); basal area from a diameter or girth, two diameters at right angles or an ellipse, the diameter of the tree of mean basal area in a tree list; bark thickness, under-bark diameter, the bark factor from sample trees and bark equations; crown width and projection area, crown length and ratio, crown surface and volume, crown cover; breast-height, absolute and normal form factors, form exponent and form quotient; tree age, past diameters from an increment core, mean stand age and growth percent.'],
        ['n' => 19, 'cat' => 'BC', 'icon' => 'biomass', 'short' => 'Biomass & Carbon', 'file' => 'biyokutle-karbon.php', 'v' => '1.0.0-beta.5', 'lab' => 'biomass', 'title' => 'Biomass and Carbon',
         'desc' => 'Component biomass, carbon and CO₂ from your tree table or approved data: allometric equations with your own coefficient sets (species mapping; missing heights and unmapped species with row numbers) or conversion from volume (IPCC 2006); Mg/ha per plot × period. The site ships no coefficients, densities or carbon fractions.'],
        ['n' => 20, 'cat' => 'SV', 'icon' => 'volume', 'short' => 'Volume Equations', 'file' => 'hacim-denklemleri.php', 'v' => '1.0.0-beta.2', 'lab' => 'volume', 'title' => 'Volume Equations',
         'desc' => 'Fitting standard and local volume equations to your trees of known volume (e.g. Stem Section Volume results): constant form factor, combined variable, logarithmic and local forms (Kershaw et al. 2016); weighted least squares, back-transformation correction, saving to the coefficient library and sending to Model Evaluation.'],
        ['n' => 21, 'cat' => 'SV', 'icon' => 'logscale', 'short' => 'Log Scaling', 'file' => 'tomruk-olcumu.php', 'v' => '1.0.0-beta.1', 'lab' => 'logscale', 'title' => 'Log Scaling',
         'desc' => 'Board feet by the Scribner, Doyle and International (⅛ and ¼ inch) log rules from the small-end diameter and length (Kershaw et al. 2016); m³ by Smalian, Huber and Newton from end and middle diameters; splitting logs longer than the scaling length. Measurements in cm and m.'],
        ['n' => 22, 'cat' => 'SM', 'icon' => 'nlreg', 'short' => 'Nonlinear Regression', 'file' => 'dogrusal-olmayan-regresyon.php', 'v' => '1.0.0-beta.2', 'lab' => 'nlsreg', 'title' => 'Nonlinear Regression',
         'desc' => 'Nonlinear models for your own data: ready-made forms (Chapman–Richards, Schumacher, Gompertz, logistic, monomolecular, Weibull, power) or a free formula; weighted least squares (ψ = X^θ, θ can be estimated), coefficient confidence intervals, mean and new-observation intervals, comparison by AIC; saving to the coefficient library and hand-off to Model Evaluation.'],
        ['n' => 23, 'cat' => 'SM', 'icon' => 'mixed', 'short' => 'Mixed-Effects Models', 'file' => 'karma-modeller.php', 'v' => '1.0.0-beta.1', 'lab' => 'mixed', 'title' => 'Mixed-Effects Models',
         'desc' => 'Linear and nonlinear mixed-effects models for grouped data (e.g. trees in plots): random effects per group, ML or REML, diagonal or general covariance, the varPower variance function, AIC/BIC and the likelihood-ratio test; calibration of a new plot from a few measurements; saving to the coefficient library.'],
        ['n' => 24, 'cat' => 'SM', 'icon' => 'eqsys', 'short' => 'Systems of Equations', 'file' => 'denklem-sistemleri.php', 'v' => '1.0.0-beta.2', 'lab' => 'eqsys', 'title' => 'Systems of Equations',
         'desc' => 'Fitting several related equations together: your own formulas (linear or nonlinear), compatible systems with coefficients shared between equations, OLS, SUR and iterated SUR, three residual covariance definitions; R² per equation, system R² (OLS and McElroy), log L; saving to the coefficient library.'],
    ];
}

/** Sidebar groups = the modules of the tool catalogue (inc/catalog.php), in display order. */
function site_cats(): array { return site_modules(); }

/**
 * Icons: Material Design Icons (Pictogrammers, @mdi/js 7.4.47, Apache-2.0; see NOTICE). Paths copied from the package;
 * name => [mdi name, path]. Filled glyphs on a 24 × 24 grid, coloured by currentColor.
 */
function site_icon(string $name, string $cls = 'ico'): string {
    static $P = [
        'checker' => 'M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3M7,7H17V5H19V19H5V5H7V7M7.5,13.5L9,12L11,14L15.5,9.5L17,11L11,17L7.5,13.5Z', // mdiClipboardCheckOutline
        'plot' => 'M6.35,20.25L7.56,18.66C8.42,19.23 9.39,19.64 10.43,19.85L10.16,21.83C8.77,21.57 7.5,21 6.35,20.25M16.43,18.66L17.64,20.26C16.5,21.03 15.23,21.57 13.84,21.83L13.57,19.85C14.61,19.64 15.57,19.23 16.43,18.66M19.84,13.59L21.83,13.86C21.57,15.25 21,16.54 20.24,17.66L18.65,16.45C19.22,15.6 19.63,14.63 19.84,13.59M2.17,13.84L4.15,13.57C4.36,14.61 4.77,15.58 5.34,16.44L3.75,17.65C3,16.5 2.43,15.23 2.17,13.84M18.66,7.56L20.25,6.35C21.03,7.5 21.58,8.78 21.83,10.18L19.85,10.45C19.64,9.4 19.23,8.42 18.66,7.56M13.57,4.15L13.84,2.17C15.23,2.43 16.5,3 17.65,3.75L16.44,5.34C15.58,4.77 14.61,4.36 13.57,4.15M7.56,5.34L6.35,3.75C7.5,3 8.77,2.43 10.16,2.17L10.43,4.15C9.39,4.36 8.42,4.77 7.56,5.34M4.15,10.43L2.17,10.16C2.43,8.77 3,7.5 3.75,6.35L5.34,7.56C4.77,8.42 4.36,9.39 4.15,10.43Z', // mdiSelectionEllipse
        'eval' => 'M2,2H4V20H22V22H2V2M9,10A3,3 0 0,1 12,13A3,3 0 0,1 9,16A3,3 0 0,1 6,13A3,3 0 0,1 9,10M13,2A3,3 0 0,1 16,5A3,3 0 0,1 13,8A3,3 0 0,1 10,5A3,3 0 0,1 13,2M18,12A3,3 0 0,1 21,15A3,3 0 0,1 18,18A3,3 0 0,1 15,15A3,3 0 0,1 18,12Z', // mdiChartScatterPlot
        'dist' => 'M9.96,11.31C10.82,8.1 11.5,6 13,6C14.5,6 15.18,8.1 16.04,11.31C17,14.92 18.1,19 22,19V17C19.8,17 19,14.54 17.97,10.8C17.08,7.46 16.15,4 13,4C9.85,4 8.92,7.46 8.03,10.8C7.03,14.54 6.2,17 4,17V2H2V22H22V20H4V19C7.9,19 9,14.92 9.96,11.31Z', // mdiChartBellCurve
        'hd' => 'M10.5,3C8,3 6,5 6,7.5C6,8.11 6.13,8.71 6.37,9.27C5.5,10.12 5,11.28 5,12.5C5,15 7,17 9.5,17C10,17 10.5,16.89 11,16.72V21H13V15.77C13.5,15.91 14,16 14.5,16A5.5,5.5 0 0,0 20,10.5A5.5,5.5 0 0,0 14.5,5C14.41,5 14.33,5 14.24,5C13.41,3.76 12,3 10.5,3M10.5,5C11.82,5 12.91,6.03 13,7.35C13.46,7.12 14,7 14.5,7A3.5,3.5 0 0,1 18,10.5A3.5,3.5 0 0,1 14.5,14C13.54,14 12.63,13.61 11.96,12.91C11.76,14.12 10.72,15 9.5,15A2.5,2.5 0 0,1 7,12.5C7,11.12 7.8,10.54 9,9.79C8.2,8.76 8,8.16 8,7.5A2.5,2.5 0 0,1 10.5,5Z', // mdiTreeOutline
        'sampling' => 'M12 16C13.1 16 14 16.9 14 18S13.1 20 12 20 10 19.1 10 18 10.9 16 12 16M12 10C13.1 10 14 10.9 14 12S13.1 14 12 14 10 13.1 10 12 10.9 10 12 10M12 4C13.1 4 14 4.9 14 6S13.1 8 12 8 10 7.1 10 6 10.9 4 12 4M6 16C7.1 16 8 16.9 8 18S7.1 20 6 20 4 19.1 4 18 4.9 16 6 16M6 10C7.1 10 8 10.9 8 12S7.1 14 6 14 4 13.1 4 12 4.9 10 6 10M6 4C7.1 4 8 4.9 8 6S7.1 8 6 8 4 7.1 4 6 4.9 4 6 4M18 16C19.1 16 20 16.9 20 18S19.1 20 18 20 16 19.1 16 18 16.9 16 18 16M18 10C19.1 10 20 10.9 20 12S19.1 14 18 14 16 13.1 16 12 16.9 10 18 10M18 4C19.1 4 20 4.9 20 6S19.1 8 18 8 16 7.1 16 6 16.9 4 18 4Z', // mdiDotsGrid
        'taper' => 'M21.62 16.68H21.62L12.85 2.5C12.66 2.16 12.33 2 12 2C11.67 2 11.34 2.16 11.15 2.47L2.38 16.65H2.4C2.15 17.04 2 17.5 2 18C2 19.5 3.3 22 12 22C15.74 22 22 21.5 22 18C22 17.61 21.91 17.15 21.62 16.68M12 4.9L18 14.58C16.53 14.23 14.6 14 12 14C10.25 14 7.96 14.12 6 14.6L12 4.9M12 20C7.58 20 4 19.11 4 18C4 16.9 7.58 16 12 16S20 16.9 20 18C20 19.11 16.42 20 12 20Z', // mdiCone
        'volume' => 'M12.42,5.29C11.32,5.19 10.35,6 10.25,7.11L10,10H12.82V12H9.82L9.38,17.07C9.18,19.27 7.24,20.9 5.04,20.7C3.79,20.59 2.66,19.9 2,18.83L3.5,17.33C3.83,18.38 4.96,18.97 6,18.63C6.78,18.39 7.33,17.7 7.4,16.89L7.82,12H4.82V10H8L8.27,6.93C8.46,4.73 10.39,3.1 12.6,3.28C13.86,3.39 15,4.09 15.66,5.17L14.16,6.67C13.91,5.9 13.23,5.36 12.42,5.29M22,13.65L20.59,12.24L17.76,15.07L14.93,12.24L13.5,13.65L16.35,16.5L13.5,19.31L14.93,20.72L17.76,17.89L20.59,20.72L22,19.31L19.17,16.5L22,13.65Z', // mdiFunctionVariant
        'nlreg' => 'M4 19V20H22V22H2V2H4V17C7 17 10 15 12.1 11.4C15.1 6.4 18.4 4 22 4V6C19.2 6 16.5 8.1 13.9 12.5C11.3 16.6 7.7 19 4 19Z', // mdiChartBellCurveCumulative
        'mixed' => 'M22,6.92L20.59,5.5L17.74,8.72C15.68,6.4 12.83,5 9.61,5C6.72,5 4.07,6.16 2,8L3.42,9.42C5.12,7.93 7.27,7 9.61,7C12.35,7 14.7,8.26 16.38,10.24L13.5,13.5L9.5,9.5L2,17L3.5,18.5L9.5,12.5L13.5,16.5L17.55,11.93C18.3,13.28 18.8,14.83 19,16.5H21C20.78,14.18 20.05,12.09 18.96,10.34L22,6.92Z', // mdiChartMultiline
        'eqsys' => 'M18,6H8.83L14.83,12L8.83,18H18V20H6V18L12,12L6,6V4H18V6Z', // mdiSigma
        'logscale' => 'M3,5V21H9V19.5H7V18H9V16.5H5V15H9V13.5H7V12H9V10.5H5V9H9V5H10.5V9H12V7H13.5V9H15V5H16.5V9H18V7H19.5V9H21V3H5A2,2 0 0,0 3,5M6,7A1,1 0 0,1 5,6A1,1 0 0,1 6,5A1,1 0 0,1 7,6A1,1 0 0,1 6,7Z', // mdiRulerSquare
        'secvol' => 'M12 2C9.89 2 3 2.29 3 6V18C3 21.71 9.89 22 12 22C14.11 22 21 21.71 21 18V6C21 2.29 14.11 2 12 2M12 10C13.38 10 16.8 9.87 19 8.75V15.25C16.8 14.13 13.38 14 12 14S7.2 14.13 5 15.25V8.75C7.2 9.87 10.62 10 12 10M12 4C15.87 4 19 4.89 19 6C19 7.11 15.87 8 12 8C8.13 8 5 7.11 5 6C5 4.89 8.13 4 12 4M12 20C8.13 20 5 19.11 5 18C5 16.9 8.13 16 12 16C15.87 16 19 16.9 19 18C19 19.11 15.87 20 12 20Z', // mdiCylinder
        'growth' => 'M3.5,18.5L9.5,12.5L13.5,16.5L22,6.92L20.59,5.5L13.5,13.5L9.5,9.5L2,17L3.5,18.5Z', // mdiChartLineVariant
        'library' => 'M9 3V18H12V3H9M12 5L16 18L19 17L15 4L12 5M5 5V18H8V5H5M3 19V21H21V19H3Z', // mdiBookshelf
        'measure' => 'M9,5A7,7 0 0,1 16,12H17V15H16V19H9A7,7 0 0,1 2,12A7,7 0 0,1 9,5M9,8A4,4 0 0,0 5,12A4,4 0 0,0 9,16A4,4 0 0,0 13,12A4,4 0 0,0 9,8M17,17H22V19L22,21H20V19H17V17Z', // mdiTapeMeasure
        'database' => 'M12,3C7.58,3 4,4.79 4,7C4,9.21 7.58,11 12,11C16.42,11 20,9.21 20,7C20,4.79 16.42,3 12,3M4,9V12C4,14.21 7.58,16 12,16C16.42,16 20,14.21 20,12V9C20,11.21 16.42,13 12,13C7.58,13 4,11.21 4,9M4,14V17C4,19.21 7.58,21 12,21C16.42,21 20,19.21 20,17V14C20,16.21 16.42,18 12,18C7.58,18 4,16.21 4,14Z', // mdiDatabase
        'dashboard' => 'M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z', // mdiViewDashboard
        'delete' => 'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z', // mdiDelete
        'report' => 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M15,18H9V16H15V18M15,14H9V12H15V14M13,9V3.5L18.5,9H13Z', // mdiFileDocument
        'biomass' => 'M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z', // mdiLeaf
        'verify' => 'M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z', // mdiShieldCheck
        'siteindex' => 'M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z', // mdiTrendingUp
        'rank' => 'M12,7.09L14.45,8.58L13.8,5.77L16,3.89L13.11,3.64L12,1L10.87,3.64L8,3.89L10.18,5.77L9.5,8.58L12,7.09M4,13.09L6.45,14.58L5.8,11.77L8,9.89L5.11,9.64L4,7L2.87,9.64L0,9.89L2.18,11.77L1.5,14.58L4,13.09M20,10.09L22.45,11.58L21.8,8.77L24,6.89L21.11,6.64L20,4L18.87,6.64L16,6.89L18.18,8.77L17.5,11.58L20,10.09M15,23H9V10H15V23M7,23H1V17H7V23M23,23H17V13H23V23Z', // mdiPodium
        'structure' => 'M7.2,11.2C8.97,11.2 10.4,12.63 10.4,14.4C10.4,16.17 8.97,17.6 7.2,17.6C5.43,17.6 4,16.17 4,14.4C4,12.63 5.43,11.2 7.2,11.2M14.8,16A2,2 0 0,1 16.8,18A2,2 0 0,1 14.8,20A2,2 0 0,1 12.8,18A2,2 0 0,1 14.8,16M15.2,4A4.8,4.8 0 0,1 20,8.8C20,11.45 17.85,13.6 15.2,13.6A4.8,4.8 0 0,1 10.4,8.8C10.4,6.15 12.55,4 15.2,4Z', // mdiChartBubble
        'dot' => 'M12,10A2,2 0 0,0 10,12C10,13.11 10.9,14 12,14C13.11,14 14,13.11 14,12A2,2 0 0,0 12,10Z', // mdiCircleSmall
        'chev' => 'M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z', // mdiChevronDown
        'cite' => 'M14,17H17L19,13V7H13V13H16M6,17H9L11,13V7H5V13H8L6,17Z', // mdiFormatQuoteClose
        'guide' => 'M19 1L14 6V17L19 12.5V1M21 5V18.5C19.9 18.15 18.7 18 17.5 18C15.8 18 13.35 18.65 12 19.5V6C10.55 4.9 8.45 4.5 6.5 4.5C4.55 4.5 2.45 4.9 1 6V20.65C1 20.9 1.25 21.15 1.5 21.15C1.6 21.15 1.65 21.1 1.75 21.1C3.1 20.45 5.05 20 6.5 20C8.45 20 10.55 20.4 12 21.5C13.35 20.65 15.8 20 17.5 20C19.15 20 20.85 20.3 22.25 21.05C22.35 21.1 22.4 21.1 22.5 21.1C22.75 21.1 23 20.85 23 20.6V6C22.4 5.55 21.75 5.25 21 5M10 18.41C8.75 18.09 7.5 18 6.5 18C5.44 18 4.18 18.19 3 18.5V7.13C3.91 6.73 5.14 6.5 6.5 6.5C7.86 6.5 9.09 6.73 10 7.13V18.41Z', // mdiBookOpenPageVariantOutline
        'about' => 'M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z', // mdiInformationOutline
        'home' => 'M16 12L9 2L2 12H3.86L0 18H7V22H11V18H18L14.14 12H16M20.14 12H22L15 2L12.61 5.41L17.92 13H15.97L19.19 18H24L20.14 12M13 19H17V22H13V19Z', // mdiForest
        'menu' => 'M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z', // mdiMenu
        'collapse' => 'M20 4H4A2 2 0 0 0 2 6V18A2 2 0 0 0 4 20H20A2 2 0 0 0 22 18V6A2 2 0 0 0 20 4M20 18H9V6H20Z', // mdiDockLeft
        'close' => 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z', // mdiClose
        'theme' => 'M7.5,2C5.71,3.15 4.5,5.18 4.5,7.5C4.5,9.82 5.71,11.85 7.53,13C4.46,13 2,10.54 2,7.5A5.5,5.5 0 0,1 7.5,2M19.07,3.5L20.5,4.93L4.93,20.5L3.5,19.07L19.07,3.5M12.89,5.93L11.41,5L9.97,6L10.39,4.3L9,3.24L10.75,3.12L11.33,1.47L12,3.1L13.73,3.13L12.38,4.26L12.89,5.93M9.59,9.54L8.43,8.81L7.31,9.59L7.65,8.27L6.56,7.44L7.92,7.35L8.37,6.06L8.88,7.33L10.24,7.36L9.19,8.23L9.59,9.54M19,13.5A5.5,5.5 0 0,1 13.5,19C12.28,19 11.15,18.6 10.24,17.93L17.93,10.24C18.6,11.15 19,12.28 19,13.5M14.6,20.08L17.37,18.93L17.13,22.28L14.6,20.08M18.93,17.38L20.08,14.61L22.28,17.15L18.93,17.38M20.08,12.42L18.94,9.64L22.28,9.88L20.08,12.42M9.63,18.93L12.4,20.08L9.87,22.27L9.63,18.93Z', // mdiThemeLightDark
    ];
    return '<svg class="' . $cls . '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' . ($P[$name] ?? '') . '"/></svg>';
}

/**
 * The Forest Biometry mark (assets/brand/): two open corners of a sample plot and three trees that read as data points.
 * Inline, in currentColor, hidden from screen readers (the brand name is always written next to it or on the link).
 * $grid 24: the version for 20–28 px (top bar), 48: the full drawing for 32 px and up.
 */
function site_mark(string $cls = 'b-logo', int $grid = 24): string {
    $inner = $grid === 48
        ? '<path d="M5.5 17V9A3.5 3.5 0 0 1 9 5.5H19M42.5 31V39A3.5 3.5 0 0 1 39 42.5H29" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 25V38.5M24 14V37M34 20V35.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="14" cy="24.6" r="4.7" fill="currentColor"/><circle cx="24" cy="13.4" r="5.6" fill="currentColor"/><circle cx="34" cy="19.8" r="4.7" fill="currentColor"/>'
        : '<path d="M2.6 8.6V4.4A1.8 1.8 0 0 1 4.4 2.6H8.6M21.4 15.4V19.6A1.8 1.8 0 0 1 19.6 21.4H15.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.6 12V19.4M12 7V18.9M17.4 10.4V18.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="6.6" cy="12" r="2.5" fill="currentColor"/><circle cx="12" cy="6.9" r="2.9" fill="currentColor"/><circle cx="17.4" cy="10.4" r="2.5" fill="currentColor"/>';
    return '<svg class="' . $cls . '" viewBox="0 0 ' . $grid . ' ' . $grid . '" aria-hidden="true" focusable="false">' . $inner . '</svg>';
}

/** The tool whose page is being shown (null on the home and About pages). */
function site_current_tool(): ?array {
    $here = basename($_SERVER['SCRIPT_NAME'] ?? '');
    foreach (site_tools() as $t) if ($t['file'] === $here) return $t;
    return null;
}

function site_top(array $o = []): void {
    $c = site_ctx();
    $pageTitle = ($o['title'] ?? '') !== '' && $o['title'] !== $c['site'] ? $o['title'] . ' | ' . $c['site'] : $c['site'] . ' | ' . $c['sub'];
    $here = basename($_SERVER['SCRIPT_NAME'] ?? ''); $cur = site_current_tool();
    $tools = site_tools();
    // 'side' => false: the home page and the tools index (20 Nov 2026): no sidebar beside the content; the tool menu is a
    // drawer behind the menu button at every width. Tool pages keep the sidebar.
    $side = $o['side'] ?? true;
    ?><!doctype html>
<html lang="<?= $c['L'] ?>"<?= $side ? '' : ' class="no-side"' ?>>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($pageTitle) ?></title>
<meta name="description" content="<?= h($o['desc'] ?? '') ?>">
<?php if (!empty($o['robots'])): ?><meta name="robots" content="<?= h($o['robots']) ?>">
<?php else: $pg = ($here === 'index.php' ? '' : $here) . (!empty($o['query']) ? '?' . $o['query'] : ''); /* 'query': page-defining parameters (e.g. the guide's k=…) */ ?><link rel="canonical" href="<?= h(SITE_BASE . $pg) ?>">
<?php endif; ?><meta name="author" content="<?= h(SITE_AUTHOR['name']) ?>">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d1117" media="(prefers-color-scheme: dark)">
<link rel="stylesheet" href="assets/lab/lab.css?v=<?= site_ver('assets/lab/lab.css') ?>">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" href="assets/brand/favicon.svg?v=<?= site_ver('assets/brand/favicon.svg') ?>" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/brand/apple-touch-icon.png?v=<?= site_ver('assets/brand/apple-touch-icon.png') ?>">
<script>try { var t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; if (localStorage.getItem('side') === 'narrow') document.documentElement.classList.add('side-narrow'); } catch (e) {}</script>
</head>
<body class="bench"<?= $cur ? ' data-tool="' . h(basename($cur['file'], '.php')) . '"' : '' ?>>
<a class="skip" href="#main"><?= 'Skip to content' ?></a>
<header class="b-top">
  <button type="button" class="b-iconbtn b-menu" id="navopen" aria-controls="side" aria-expanded="false" aria-label="<?= 'Open the tools menu' ?>"><?= site_icon('menu') ?></button>
  <a class="b-brand" href="./" aria-label="<?= h($c['site']) ?>, <?= 'home page' ?>"><?= site_mark() ?><span class="b-brand-name"><?= h($c['site']) ?></span></a>
  <nav class="b-nav" aria-label="<?= 'Site' ?>">
    <a href="araclar.php"<?= $here === 'araclar.php' || $cur ? ' aria-current="' . ($cur ? 'true' : 'page') . '"' : '' ?>><?= 'Tools' ?></a>
    <a href="kilavuz.php"<?= $here === 'kilavuz.php' ? ' aria-current="page"' : '' ?>><?= 'Guide' ?></a>
    <a href="kaynakca.php"<?= $here === 'kaynakca.php' ? ' aria-current="page"' : '' ?>><?= 'References' ?></a>
    <a href="hakkinda.php"<?= $here === 'hakkinda.php' ? ' aria-current="page"' : '' ?>><?= 'About' ?></a>
  </nav>
  <span class="b-tools">
    <button type="button" class="b-citebtn" id="citebtn" data-cite-open aria-haspopup="dialog"><?= site_icon('cite') ?><span><?= 'Cite' ?></span></button>
    <button type="button" id="theme" class="b-iconbtn" aria-label="<?= 'Dark / light theme' ?>"><?= site_icon('theme') ?></button>
  </span>
</header>
<div class="b-shell">
<aside class="b-side" id="side" aria-label="<?= 'Tools' ?>">
  <div class="b-side-head">
    <span class="b-side-title"><?= 'Tools' ?></span>
    <button type="button" class="b-iconbtn b-narrow" id="sidenarrow" aria-pressed="false" aria-label="<?= 'Narrow / widen the sidebar' ?>"><?= site_icon('collapse') ?></button>
    <button type="button" class="b-iconbtn b-close" id="navclose" aria-label="<?= 'Close the menu' ?>"><?= site_icon('close') ?></button>
  </div>
  <nav class="b-side-nav" aria-label="<?= 'Tools by module' ?>">
    <?php $catalog = site_catalog(); foreach (site_modules() as $mod): $it = site_module_items($mod['id'], $tools, $catalog);
      $open = $it['home'] || ($cur && ($cur['cat'] === $mod['id'] || in_array($cur['file'], array_column($it['also'], 'page'), true))); ?>
    <div class="b-group<?= $open ? '' : ' collapsed' ?>" data-mod="<?= $mod['id'] ?>">
      <button type="button" class="b-cat" id="cat-<?= $mod['id'] ?>" aria-expanded="<?= $open ? 'true' : 'false' ?>" aria-controls="grp-<?= $mod['id'] ?>"><span><?= h($mod['title']) ?></span><?= site_icon('chev', 'chev') ?></button>
      <ul id="grp-<?= $mod['id'] ?>" aria-labelledby="cat-<?= $mod['id'] ?>">
        <?php foreach ($it['home'] as $t): ?>
        <li class="b-live"><a href="<?= h($t['file']) ?>" title="<?= h($t['title']) ?>"<?= $cur && $cur['file'] === $t['file'] ? ' aria-current="page"' : '' ?>><?= site_icon($t['icon']) ?><span><?= h($t['short']) ?></span></a></li>
        <?php endforeach; foreach ($it['also'] as $ce): ?>
        <li class="b-also"><a href="<?= h($ce['page']) ?>" title="<?= h($ce['id'] . ' · ' . $ce['name']) ?>"><?= site_icon('dot') ?><span><?= h($ce['name']) ?></span></a></li>
        <?php endforeach; foreach ($it['planned'] as $ce): ?>
        <li class="b-pl"><span class="b-planned" title="<?= h($ce['id'] . ' · ' . ($ce['status'] === 'dev' ? 'in development' : 'planned')) ?>" aria-disabled="true"><?= site_icon('dot') ?><span><?= h($ce['name']) ?><?= $ce['status'] === 'dev' ? ' <em class="b-dev">' . 'soon' . '</em>' : '' ?></span></span></li>
        <?php endforeach; ?>
      </ul>
    </div>
    <?php endforeach; ?>
  </nav>
  <div class="b-side-foot">
    <a href="kilavuz.php" title="<?= 'User guide' ?>"<?= $here === 'kilavuz.php' ? ' aria-current="page"' : '' ?>><?= site_icon('guide') ?><span><?= 'Guide' ?></span></a>
    <a href="hakkinda.php" title="<?= 'About' ?>"<?= $here === 'hakkinda.php' ? ' aria-current="page"' : '' ?>><?= site_icon('about') ?><span><?= 'About' ?></span></a>
    <a href="kaynakca.php" title="<?= 'References' ?>"<?= $here === 'kaynakca.php' ? ' aria-current="page"' : '' ?>><?= site_icon('cite') ?><span><?= 'References' ?></span></a>
    <p><?= 'Calculations run in your browser; your data stay with you.' ?></p>
  </div>
</aside>
<div class="b-scrim" id="scrim" hidden></div>
<main id="main" class="b-main">
<?php if (!empty($o['kicker']) || !empty($o['title'])): ?>
  <header class="b-head<?= $cur ? ' has-ico' : '' ?>">
    <?php if ($cur): ?><span class="b-headico" aria-hidden="true"><?= site_icon($cur['icon']) ?></span><?php endif; ?>
    <div>
    <?php if (!empty($o['kicker'])): ?><p class="b-kicker"><?php if ($cur): $ids = array_column(array_filter(site_catalog(), function ($c) use ($cur) { return $c['page'] === $cur['file']; }), 'id'); $mt = array_column(site_modules(), 'title', 'id'); if ($ids): ?><span class="b-ids" title="<?= 'Tool ids (docs/PLATFORM_PLAN.md)' ?>"><?= h(implode(' · ', $ids)) ?></span> · <?php endif; ?><?= h($mt[$cur['cat']] ?? '') ?> · <?php endif; ?><?= h($o['kicker']) ?><?php if ($cur): ?> · <span class="b-ver"><?= 'version' ?> <?= h($cur['v']) ?></span> · <a class="b-guide" href="kilavuz.php?k=<?= h(basename($cur['file'], '.php')) ?>"><?= 'Guide' ?></a><?php endif; ?></p><?php endif; ?>
    <h1><?= h($o['title'] ?? $c['site']) ?></h1>
    <?php if (!empty($o['lede'])): ?><p class="b-lede"><?= h($o['lede']) ?></p><?php endif; ?>
    </div>
  </header>
<?php endif;
}

/**
 * Git commit of the deployed site (DI-07 run records): deploy-commit.txt, written by the GitHub upload after every
 * deployment (.github/deploy-cpanel.sh; not served, .htaccess). null in development (no such file).
 */
function site_commit(): ?string {
    static $c = false;
    if ($c === false) { $f = __DIR__ . '/../deploy-commit.txt'; $t = is_file($f) ? trim((string) file_get_contents($f)) : ''; $c = preg_match('/^[0-9a-f]{40}$/', $t) ? $t : null; }
    return $c;
}
/** Version tag of a site file: its modification time (it changes whenever the deployment uploads that file). */
/**
 * true: pages load one bundled file each from assets/build/ (scripts/bundle.mjs), as on the server. The PHP built-in
 * server (development, browser tests) uses the module sources unless FB_BUNDLE=1, so an edit is seen without a build.
 */
function site_bundles(): bool {
    static $on = null;
    if ($on === null) $on = is_file(__DIR__ . '/../assets/build/core/cite-ui.js') && (PHP_SAPI !== 'cli-server' || getenv('FB_BUNDLE') === '1');
    return $on;
}
function site_ver(string $rel): string {
    $f = __DIR__ . '/../' . $rel;
    return is_file($f) ? (string) filemtime($f) : '0';
}
/** 'a/b/../c.js' → 'a/c.js'; null if it leaves the site root. */
function site_norm(string $p): ?string {
    $out = [];
    foreach (explode('/', $p) as $seg) {
        if ($seg === '' || $seg === '.') continue;
        if ($seg === '..') { if (!$out) return null; array_pop($out); } else $out[] = $seg;
    }
    return implode('/', $out);
}
/**
 * ES modules reachable from the entry files through relative imports (static `from '…'`, `import '…'` and literal
 * `import('…')`), as paths relative to the site root, in discovery order. Workers (new URL(…, import.meta.url)) are
 * not followed: they load without a version tag and are revalidated each time.
 */
function site_module_graph(array $entries): array {
    $root = __DIR__ . '/..'; $seen = []; $order = []; $stack = array_reverse($entries);
    while ($stack) {
        $rel = array_pop($stack);
        if (isset($seen[$rel]) || !is_file($root . '/' . $rel)) continue;
        $seen[$rel] = true; $order[] = $rel;
        preg_match_all('~(?:\bfrom\s*|\bimport\s*\(?\s*)[\'"](\.{1,2}/[^\'"]+\.m?js)[\'"]~', (string) file_get_contents($root . '/' . $rel), $m);
        foreach (array_reverse($m[1]) as $spec) { $q = site_norm(dirname($rel) . '/' . $spec); if ($q !== null && !isset($seen[$q])) $stack[] = $q; }
    }
    return $order;
}
/**
 * Module loading for a page: an import map that adds a version tag (file time) to every module of the page, and
 * modulepreload links so that the browser fetches the whole graph in parallel instead of import by import. Versioned
 * files can be cached for long (.htaccess); a changed file gets a new tag, an unchanged one stays in the cache.
 */
function site_modules_html(array $entries): string {
    $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/') . '/';
    $map = []; $pre = '';
    foreach (site_module_graph($entries) as $rel) {
        $v = $rel . '?v=' . site_ver($rel);
        $map[$base . $rel] = $base . $v;
        $pre .= '<link rel="modulepreload" href="' . h($v) . '">' . "\n";
    }
    return '<script type="importmap">' . json_encode(['imports' => $map], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . "</script>\n" . $pre;
}

function site_bottom(string $script = ''): void {
    $c = site_ctx();
    ?>
</main>
</div>
<footer class="b-foot">
  <span><?= h($c['site']) ?> · forestbiometry.online · © <?= date('Y') ?> · <?= 'Author and responsible person' ?>: <a href="hakkinda.php"><?= h(SITE_AUTHOR['name']) ?></a></span>
  <span><a href="araclar.php"><?= 'Tools index' ?></a> · <a href="kilavuz.php"><?= 'Guide' ?></a> · <a href="hakkinda.php"><?= 'About' ?></a> · <a href="kaynakca.php"><?= 'References' ?></a></span>
</footer>
<script>
(function () {
  var root = document.documentElement, $ = function (id) { return document.getElementById(id); };
  $('theme').addEventListener('click', function () {
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });
  // desktop: narrow (icons only) or wide sidebar, remembered in this browser
  var nb = $('sidenarrow'); nb.setAttribute('aria-pressed', root.classList.contains('side-narrow'));
  if (!root.classList.contains('no-side')) nb.addEventListener('click', function () {
    var on = root.classList.toggle('side-narrow'); nb.setAttribute('aria-pressed', on);
    try { localStorage.setItem('side', on ? 'narrow' : 'wide'); } catch (e) {}
  });
  // modules of the sidebar: open / closed, remembered in this browser
  var mods = {}; try { mods = JSON.parse(localStorage.getItem('sideMods') || '{}'); } catch (e) {}
  Array.prototype.forEach.call(document.querySelectorAll('.b-group[data-mod]'), function (g) {
    var b = g.querySelector('.b-cat'), id = g.getAttribute('data-mod'), set = function (open) { g.classList.toggle('collapsed', !open); b.setAttribute('aria-expanded', open ? 'true' : 'false'); };
    if (id in mods && !g.querySelector('[aria-current]')) set(!!mods[id]);
    b.addEventListener('click', function () { var open = g.classList.contains('collapsed'); set(open); mods[id] = open ? 1 : 0; try { localStorage.setItem('sideMods', JSON.stringify(mods)); } catch (e) {} });
  });
  // small screens: the sidebar is a drawer
  var side = $('side'), scrim = $('scrim'), openBtn = $('navopen');
  function open() { root.classList.add('side-open'); scrim.hidden = false; openBtn.setAttribute('aria-expanded', 'true'); var a = side.querySelector('[aria-current], a'); if (a) a.focus(); }
  function close(back) { root.classList.remove('side-open'); scrim.hidden = true; openBtn.setAttribute('aria-expanded', 'false'); if (back) openBtn.focus(); }
  openBtn.addEventListener('click', open);
  $('navclose').addEventListener('click', function () { close(true); });
  scrim.addEventListener('click', function () { close(true); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('side-open')) close(true); });
})();
</script>
<?php
    $cur = site_current_tool(); $ct = null;
    if ($cur) foreach (site_tools() as $t) if ($t['file'] === $cur['file']) $ct = ['file' => $t['file'], 'v' => $t['v'], 'en' => $t['title']];
    $cd = ['author' => ['family' => SITE_AUTHOR['family'], 'given' => SITE_AUTHOR['given']], 'year' => SITE_YEAR, 'base' => SITE_BASE,
           'site' => ['en' => 'Forest Biometrics Tools'], 'tool' => $ct, 'doi' => SITE_DOI,
           'ids' => $cur ? array_values(array_column(array_filter(site_catalog(), function ($e) use ($cur) { return $e['page'] === $cur['file']; }), 'id')) : [], 'commit' => site_commit()];
?>
<dialog id="citedlg" class="dlg citedlg" aria-label="<?= 'How to cite' ?>"></dialog>
<script type="application/json" id="cite-data"><?= json_encode($cd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?></script>
<?php if ($cur): ?><script>/* tools used in this browser, newest first, for "Recently used" on the home page; only the page name is kept */
try { (function (f) { var r = JSON.parse(localStorage.getItem('recentTools') || '[]').filter(function (x) { return x !== f; }); r.unshift(f); localStorage.setItem('recentTools', JSON.stringify(r.slice(0, 6))); })(<?= json_encode($cur['file']) ?>); } catch (e) {}</script>
<?php endif; ?>
<?php
    // entry modules: the shell's citation dialog and the page's own script(s). With bundles (site_bundles()) the page's
    // tool script and the citation dialog come as one file from assets/build/; otherwise as ES module trees whose files
    // get the file time as version (import map + modulepreload).
    $entries = []; $main = ''; $hasScript = $script !== '';
    if (site_bundles()) {
        $script = preg_replace_callback('~<script type="module" src="assets/lab/([^"?]+\.js)(?:\?v=[^"]*)?"></script>~', function ($m) use (&$main) {
            $b = 'assets/build/' . $m[1];
            if ($main === '' && is_file(__DIR__ . '/../' . $b)) { $main = $b; return ''; }
            return $m[0];
        }, $script);
        if ($main === '') $main = 'assets/build/core/cite-ui.js';
    } else $entries[] = 'assets/lab/core/cite-ui.js';
    $script = preg_replace_callback('~src="(assets/lab/[^"?]+\.js)(?:\?v=[^"]*)?"~', function ($m) use (&$entries) { $entries[] = $m[1]; return 'src="' . $m[1] . '?v=' . site_ver($m[1]) . '"'; }, $script);
    // inline modules of the page: their relative imports (resolved from the page folder) belong to the graph too
    if (preg_match_all('~<script type="module">(.*?)</script>~s', $script, $im)) foreach ($im[1] as $body) {
        preg_match_all('~(?:\bfrom\s*|\bimport\s*\(?\s*)[\'"](\.{1,2}/[^\'"]+\.m?js)[\'"]~', $body, $m);
        foreach ($m[1] as $spec) { $q = site_norm($spec); if ($q !== null) $entries[] = $q; }
    }
    if ($entries) echo site_modules_html($entries);
    $first = $main !== '' ? $main : 'assets/lab/core/cite-ui.js';
?>
<script type="module" src="<?= h($first) ?>?v=<?= site_ver($first) ?>"></script>
<?= $script ?>
<?php if ($hasScript): ?>
<script>
// Boot watchdog: a tool draws its steps (#steps) or planner (#app) from its modules. If a module request hangs or
// fails, or the browser store stalls, the page would stay blank under the top bar; after 10 s (or at once on a
// failed module) say so and offer a reload. Removed again as soon as the tool draws.
(function () {
  var box = document.getElementById('steps') || document.getElementById('app'); if (!box) return;
  var note = null;
  function warn() {
    if (note || box.children.length) return;
    note = document.createElement('div'); note.id = 'bootwarn'; note.className = 'note warn'; note.setAttribute('role', 'alert');
    note.innerHTML = <?= json_encode('<b>The tool did not load, or is loading very slowly.</b> The browser did not receive its program files (a connection problem or the server\'s security check). Your data stay in this browser. Reload the page; if it persists, close other open tabs of this site and try again. ', JSON_UNESCAPED_UNICODE) ?>;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = <?= json_encode('Reload', JSON_UNESCAPED_UNICODE) ?>;
    b.addEventListener('click', function () { location.reload(); }); note.appendChild(b);
    box.parentNode.insertBefore(note, box);
  }
  var t = setTimeout(warn, 10000);
  document.addEventListener('error', function (e) { var s = e.target; if (s && s.tagName === 'SCRIPT' && s.type === 'module') warn(); }, true);
  if (window.MutationObserver) new MutationObserver(function (m, o) { if (box.children.length) { clearTimeout(t); if (note) { note.remove(); note = null; } o.disconnect(); } }).observe(box, { childList: true });
})();
</script>
<?php endif; ?>
</body>
</html>
<?php
}
