# Forest Biometrics Tools

[![DOI](https://zenodo.org/badge/1446202569.svg)](https://doi.org/10.5281/zenodo.24135603)

**Forest Biometry** is a set of browser-based tools for forest inventory and biometrics data, published at
**<https://forestbiometry.online>**. Developer: **Onur Alkan** ([ORCID 0000-0001-5798-3421](https://orcid.org/0000-0001-5798-3421)).

- **Your data stay in your browser.** Files are read and every calculation runs on your own computer. Tables and
  files are never uploaded; tool sessions are kept only in the browser's local storage.
- **Sources are cited, not invented.** Every method follows a published source (forest mensuration textbooks, journal
  articles, the documentation of R packages); the full list is on the [References](https://forestbiometry.online/references.php)
  page. The site contains no species or regional coefficients: you enter your own, with their source.
- **Every scientific calculation is tested against an independent reference** (R packages, SciPy, NumPy, mpmath,
  scikit-learn, worked examples from the sources or hand-computed cases). The tests and the scripts that produce the
  reference values are in this repository.
- **Reproducible results.** Each tool has its own version, shown on its page and written into its exports and run
  records; the model tools can also give the R code that redoes their fit.

A user guide with one section per tool is at <https://forestbiometry.online/guide.php>.

## Tools

24 tools in eight groups. The version of each tool is the one in this repository.

### Data preparation and management

| Tool | Version | What it does |
|---|---|---|
| [Forest Data Checker](https://forestbiometry.online/data-checker.php) | 1.4.0 | Import tree and plot tables, map the columns, find format errors and suspect measurements; record every fix with a reason and approve the data. |
| [Coefficient Library](https://forestbiometry.online/coefficient-library.php) | 1.0.0-beta.1 | The coefficient sets of every tool in one place: search and filter, details, editing, copying, deleting; finding sets with the same coefficients and sets with problems; backing up the whole library in one JSON file and restoring it with a preview. |
| [Record Verifier](https://forestbiometry.online/record-verifier.php) | 1.0.0-beta.1 | Open the run records (JSON) that the tools download: check with the seal that a record has not changed; see the tool, its version, the source-code commit and the settings; confirm with SHA-256 fingerprints that your original data files are byte for byte the inputs of the record. |
| [Inventory Data Manager](https://forestbiometry.online/data-manager.php) | 1.0.0-beta.1 | Keep your approved data packages in the browser as projects: name, place, year and notes; plot × period overview; make one active and the tools that read approved data use it; import and export, copies, backup. |
| [Data Visualization](https://forestbiometry.online/data-visualization.php) | 1.0.0-beta.1 | See a data package at a glance: summary, diameter distribution, species composition, N/ha and G/ha per plot, height–diameter and a tree map; period, stratum, species and plot filters; diameter densities and height curves from the tools' run records on the same charts. |
| [Report Generator](https://forestbiometry.online/report-generator.php) | 1.0.0-beta.1 | Gather a data package and the tools' run records in one report: title and notes, package summary, charts, the records' settings and result tables, references and citations, a reproducibility appendix; print it, save it as PDF or as an HTML file. |

### Tree measurement

| Tool | Version | What it does |
|---|---|---|
| [Tree Measurement](https://forestbiometry.online/tree-measurement.php) | 1.0.0-beta.4 | Tree height from clinometer or rangefinder readings (tangent, line-of-sight distance, shadow and two-pole methods); basal area from a diameter or girth, two diameters at right angles or an ellipse, the diameter of the tree of mean basal area in a tree list; bark thickness, under-bark diameter, the bark factor from sample trees and bark equations; crown width and projection area, crown length and ratio, crown surface and volume, crown cover; breast-height, absolute and normal form factors, form exponent and form quotient; tree age, past diameters from an increment core, mean stand age and growth percent. |

### Stem volume and taper

| Tool | Version | What it does |
|---|---|---|
| [Stem Section Volume](https://forestbiometry.online/section-volume.php) | 1.0.0-beta.2 | Single-tree stem volume from measured section diameters: Huber, Smalian, Newton and Hohenadl; stump and top piece apart, over- and under-bark volume, form factor, merchantable volume and per-hectare totals from plot sizes. |
| [Stem Taper](https://forestbiometry.online/stem-taper.php) | 1.0.0-beta.3 | Max and Burkhart (1976) and Kozak (2004) taper equations, with your own coefficient set or fitted to your stem measurements: diameter at any height, the height of a diameter, total and merchantable volume to a top diameter; outside- and inside-bark profiles. |
| [Volume Equations](https://forestbiometry.online/volume-equations.php) | 1.0.0-beta.2 | Fitting standard and local volume equations to your trees of known volume (e.g. Stem Section Volume results): constant form factor, combined variable, logarithmic and local forms (Kershaw et al. 2016); weighted least squares, back-transformation correction, saving to the coefficient library and sending to Model Evaluation. |
| [Log Scaling](https://forestbiometry.online/log-scaling.php) | 1.0.0-beta.1 | Board feet by the Scribner, Doyle and International (⅛ and ¼ inch) log rules from the small-end diameter and length (Kershaw et al. 2016); m³ by Smalian, Huber and Newton from end and middle diameters; splitting logs longer than the scaling length. Measurements in cm and m. |

### Biomass and carbon

| Tool | Version | What it does |
|---|---|---|
| [Biomass and Carbon](https://forestbiometry.online/biomass-carbon.php) | 1.0.0-beta.6 | Component biomass, carbon and CO₂ from your tree table or approved data: allometric equations with your own coefficient sets (species mapping; missing heights and unmapped species with row numbers) or conversion from volume (IPCC 2006); Mg/ha per plot × period. The site ships no coefficients, densities or carbon fractions. |

### Stand structure and density

| Tool | Version | What it does |
|---|---|---|
| [Plot & Stand Metrics](https://forestbiometry.online/plot-stand-metrics.php) | 1.3.0 | From approved data, per plot and period: stems and basal area per hectare, mean diameters, diameter classes and species composition; between-plot summary and design-based forest estimate. |
| [Diameter Distribution Lab](https://forestbiometry.online/diameter-distribution.php) | 2.2.1 | Weibull, normal, lognormal, gamma, fixed-bound beta, Johnson SB, exponential and log-logistic: direct fitting by maximum likelihood, moments and percentiles, per plot and period; recovery from the mean and the variance or Dq; Poudel and Cao M2–M10 for the Weibull, Parresol for the Johnson SB; Excel and CSV output. Conditional maximum likelihood for measurement thresholds; class tables and fitting from class frequencies; model comparison, Q–Q and P–P plots; bootstrap p-values and intervals. |
| [Stand Structure & Competition](https://forestbiometry.online/stand-structure.php) | 1.0.0-beta.5 | Per plot and period: diameter structure, Gini and the Lorenz curve, Shannon and Simpson, SDI, Curtis RD, relative spacing and the crown competition factor (CCF); tree-level BAL; with coordinates, Clark–Evans, W, M, T, U and the Hegyi competition index, with edge correction. |

### Site quality and productivity

| Tool | Version | What it does |
|---|---|---|
| [Site Index](https://forestbiometry.online/site-index.php) | 1.0.0-beta.4 | Site index at a base age from top height and age: Chapman–Richards and Schumacher difference equations with your own coefficient set (source required), or with coefficients fitted to your own stem analyses and repeated measurements; age type, user-defined site classes, curve family, confidence intervals by bootstrap or the delta method; H0 from approved data. |
| [Growth Function Fitter](https://forestbiometry.online/growth-functions.php) | 1.0.0-beta.1 | Fit Chapman–Richards, Schumacher, Gompertz, logistic, monomolecular and Weibull growth functions to your age–size data; compare the models by AIC and RMSE; current and mean annual increment, inflection point and culmination of the mean annual increment. |

### Sampling and inventory

| Tool | Version | What it does |
|---|---|---|
| [Inventory Sampling Planner](https://forestbiometry.online/sampling-planner.php) | 1.1.0 | Approximate number of plots to estimate a mean with a target relative error under simple random sampling: from pilot measurements or a CV you enter, with an optional finite population correction. |

### Statistical modelling

| Tool | Version | What it does |
|---|---|---|
| [Model Evaluation](https://forestbiometry.online/model-evaluation.php) | 1.2.0-beta.3 | Bias, MAE, RMSE and prediction R² from observed and predicted values (optionally weighted); a confidence interval for the bias, bootstrap intervals and equivalence tests; observed–predicted and residual plots, performance tables by group. |
| [Height–Diameter Modelling](https://forestbiometry.online/height-diameter.php) | 1.1.1 | Fixed-effects version: fit the Näslund, Michailoff, Curtis, power, Chapman–Richards and Weibull equations by nonlinear least squares; comparison on the same trees, plot-based cross-validation, a separate prediction column for missing heights. For mixed-effects models use the Mixed-Effects Models tool. |
| [Relative Ranking](https://forestbiometry.online/relative-ranking.php) | 1.2.0 | Relative ranks per criterion and overall from a goodness-of-fit table (R², FI, RMSE, MAE, Bias, AIC, BIC…); radar chart of the best and worst models. |
| [Nonlinear Regression](https://forestbiometry.online/nonlinear-regression.php) | 1.0.0-beta.2 | Nonlinear models for your own data: ready-made forms (Chapman–Richards, Schumacher, Gompertz, logistic, monomolecular, Weibull, power) or a free formula; weighted least squares (ψ = X^θ, θ can be estimated), coefficient confidence intervals, mean and new-observation intervals, comparison by AIC; saving to the coefficient library and hand-off to Model Evaluation. |
| [Mixed-Effects Models](https://forestbiometry.online/mixed-models.php) | 1.0.0-beta.1 | Linear and nonlinear mixed-effects models for grouped data (e.g. trees in plots): random effects per group, ML or REML, diagonal or general covariance, the varPower variance function, AIC/BIC and the likelihood-ratio test; calibration of a new plot from a few measurements; saving to the coefficient library. |
| [Systems of Equations](https://forestbiometry.online/equation-systems.php) | 1.0.0-beta.2 | Fitting several related equations together: your own formulas (linear or nonlinear), compatible systems with coefficients shared between equations, OLS, SUR and iterated SUR, three residual covariance definitions; R² per equation, system R² (OLS and McElroy), log L; saving to the coefficient library. |

## Optional account

Everything above works without an account. An optional account (sign in with ORCID; accounts are approved by the
developer) adds an AI interpretation of a result (Anthropic's Claude) and lets you keep analysis results and
interpretations on the site. Only the summary of a result is sent, on request; raw data (tables, files, a run record's
input data) are never sent to or kept on the server. Details: [privacy notice](https://forestbiometry.online/privacy.php).

## How to cite

Use the **Cite** button on any page of the site. It gives APA, MLA, Chicago, Harvard, IEEE, Vancouver, BibTeX and RIS,
for the platform or for one tool and its version. Machine-readable metadata are in [`CITATION.cff`](CITATION.cff).

Releases of this repository are archived on Zenodo. The concept DOI
[10.5281/zenodo.24135603](https://doi.org/10.5281/zenodo.24135603) covers all versions; version DOIs:
v2026.11.2 [10.5281/zenodo.24339226](https://doi.org/10.5281/zenodo.24339226),
v2026.11.1 [10.5281/zenodo.24167712](https://doi.org/10.5281/zenodo.24167712),
v2026.11.0 [10.5281/zenodo.24135604](https://doi.org/10.5281/zenodo.24135604).
Please also cite the original sources of the methods you use; each tool lists them.

## Running it locally

PHP 7.4 or newer (8.x recommended). No database and no build step are needed to run the site.

```bash
php -S 127.0.0.1:8092
```

Then open <http://127.0.0.1:8092/>. On the PHP built-in server the pages load the module sources from `assets/lab/`;
with `FB_BUNDLE=1 php -S …` they load the bundled files the live server gets (`assets/build/`, made by
`node scripts/bundle.mjs`). The optional account service is off unless a private configuration exists outside the
web root (see `docs/PROJECT.md` §3); every tool works without it.

## Tests

Numerical tests run with Node.js (CI uses version 22) and need no installation, for example:

```bash
node tests/dist/test_p15.mjs
```

Browser tests need Playwright with Chromium and a running `php -S`:

```bash
scripts/e2e.sh http://127.0.0.1:8092
```

The full list, and the scripts that regenerate the reference values, are in [`tests/README.md`](tests/README.md).

## Repository layout

| Path | Contents |
|---|---|
| `*.php`, `inc/` | Pages and the shared site shell (navigation, guide, citation, accounts) |
| `assets/lab/<tool>/` | Each tool: calculations (`calc.js`) kept apart from the interface (`ui.js`) |
| `assets/lab/core/` | Shared browser code: import, number parsing, charts, export, statistics, fitting, run records |
| `assets/build/` | Bundled page scripts served by the live site (generated, checked in CI) |
| `api/`, `auth/` | Optional account service: ORCID sign-in, AI interpretation, saved results |
| `assets/vendor/sheetjs/` | SheetJS Community Edition (Excel import and export) |
| `tests/` | Numerical, browser and R-code tests; `tests/ref/` holds the independent reference values and their generators |
| `docs/` | Architecture and rules (`PROJECT.md`), methods and sources (`METHODS.md`), progress (`PROGRESS.md`), specifications |
| `legacy/` | Retired code kept as a regression reference (not published) |

## Deployment

Every push to `main` runs, in GitHub Actions, the numerical tests, all browser tests (with the bundled files and with
the module sources) and a check that the R code of the model tools gives the tools' numbers. Only if all pass are the
changed files uploaded through the cPanel API over HTTPS (`.github/workflows/deploy.yml`, `.github/deploy-cpanel.sh`).
The only credential is the repository secret `CPANEL_TOKEN`. The upload never deletes anything on the server and
refuses to write into a folder that is neither this site nor an empty document root.

Fallback: `sh scripts/build-zip.sh`, then upload the archive in cPanel.

## License

Source code: [Apache License 2.0](LICENSE). Documentation (`docs/`, this README): [CC BY 4.0](LICENSE-docs).
Copyright and third-party notices: [NOTICE](NOTICE) (SheetJS in `assets/vendor/sheetjs/` keeps its own Apache-2.0
license).
