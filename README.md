# Forest Biometrics Tools · Ormancılık Biyometrisi Araçları

[![DOI](https://zenodo.org/badge/1446202569.svg)](https://doi.org/10.5281/zenodo.24135603)

Browser-based tools for forest inventory and biometrics data, published at **<https://forestbiometry.online>**.
Author and responsible person: **Onur Alkan** ([ORCID 0000-0001-5798-3421](https://orcid.org/0000-0001-5798-3421)).

*Orman envanteri ve biyometri verisi için tarayıcıda çalışan araçlar. Arayüz Türkçe ve İngilizcedir; proje belgeleri
(`docs/`) Türkçedir.*

- **Your data stay in your browser.** Files are read and computed on your own computer; nothing is uploaded, and the
  server keeps no user data. There is no database. / *Veriler tarayıcıdan çıkmaz; sunucuda kullanıcı verisi yoktur.*
- **Every scientific calculation is tested against an independent reference** (SciPy, NumPy, mpmath, scikit-learn or
  hand-computed cases). The tests and the scripts that generate the reference values are in this repository.
- **Sources are cited, not invented.** Formulas, sources and their reading status are documented in
  [`docs/METHODS.md`](docs/METHODS.md).

## Tools / Araçlar

| # | Tool | Araç | Version | What it does |
|---|---|---|---|---|
| 1 | [Forest Data Checker](https://forestbiometry.online/veri-denetcisi.php?lang=en) | Ormancılık Verisi Denetçisi | 1.0.0 | Import tree and plot tables, map the columns, find format errors and suspect measurements; record every fix with a reason and approve the data. |
| 2 | [Plot & Stand Metrics](https://forestbiometry.online/ornek-alan.php?lang=en) | Örnek Alan ve Meşcere Hesaplayıcısı | 1.1.0 | Stems and basal area per hectare, mean diameters, diameter classes and species composition per plot and period; between-plot summary and design-based estimates. |
| 3 | [Model Evaluation](https://forestbiometry.online/model-degerlendirme.php?lang=en) | Model Başarısı Değerlendiricisi | 1.0.0 | Bias, MAE, RMSE and prediction R² from observed and predicted values; observed–predicted and residual plots, tables by group. |
| 4 | [Diameter Distribution Lab](https://forestbiometry.online/cap-dagilimi.php?lang=en) | Çap Dağılımı Laboratuvarı | 2.1.0 | Weibull, normal, lognormal, gamma, fixed-bound beta, Johnson SB, exponential and log-logistic. Fitting by maximum likelihood, moments and percentiles. Measurement thresholds and grouped data. Parameter recovery from summaries: Poudel and Cao (2013) M2–M10, Parresol (2003). Model comparison and bootstrap uncertainty. Stand models (PPM, PRM; NLS, SUR, CDFR, modified CDFR) trained on your plots. |
| 5 | [Height–Diameter Modelling](https://forestbiometry.online/boy-cap.php?lang=en) | Boy–Çap Modelleme | 1.0.0 | Fixed-effects fits of Näslund, Michailoff, Curtis, power, Chapman–Richards and Weibull equations by nonlinear least squares; cross-validation and prediction. |
| 6 | [Inventory Sampling Planner](https://forestbiometry.online/ornekleme.php?lang=en) | Envanter Örnekleme Planlayıcısı | 1.0.0 | Approximate number of plots to estimate a mean with a target relative error under simple random sampling. |
| 7 | [Relative Ranking](https://forestbiometry.online/nispi-siralama.php?lang=en) | Nispi Sıralama | 1.0.0 | Relative ranks per criterion and overall from a table of goodness-of-fit statistics; radar chart of the best and worst models. |

A bilingual **user guide** is at <https://forestbiometry.online/kilavuz.php> (one section per tool; every tool's header links to its section).

Each tool has its own version. It is shown on the tool page and in its exports, and it is part of the citation the
site produces.

## How to cite / Atıf

Use the **Cite** button on any page of the site. It gives APA, MLA, Chicago, Harvard, IEEE, Vancouver, BibTeX and RIS,
for the platform or for one tool and its version. Machine-readable metadata are in [`CITATION.cff`](CITATION.cff).
Releases of this repository are archived on Zenodo. The concept DOI
[10.5281/zenodo.24135603](https://doi.org/10.5281/zenodo.24135603) covers all versions; the first release v2026.11.0 has
the version DOI [10.5281/zenodo.24135604](https://doi.org/10.5281/zenodo.24135604). The site's citations carry the concept DOI. Please also cite the original sources of the methods
you use; each tool lists them.

## Running it locally / Yerelde çalıştırma

Plain PHP 7.4 or newer (8.x recommended). No database and no build step.

```bash
php -S 127.0.0.1:8092
```

Then open <http://127.0.0.1:8092/>.

## Tests / Testler

Numerical tests run with Node.js (CI uses version 22) and need no installation:

```bash
node tests/dist/test_p15.mjs
```

Browser tests need Playwright with Chromium and a running `php -S`. The full list, and the Python scripts that
regenerate the reference values, are in [`tests/README.md`](tests/README.md). GitHub Actions runs the numerical tests
on every push to `main`.

## Repository layout

| Path | Contents |
|---|---|
| `*.php`, `inc/` | Pages and the shared site shell (language, navigation, citation) |
| `assets/lab/<tool>/` | Each tool: calculations (`calc.js` or `dist/` engine) separate from the interface (`ui.js`) |
| `assets/lab/core/` | Shared browser code: import, number parsing, charts, export, statistics, root finding |
| `assets/vendor/sheetjs/` | SheetJS Community Edition (Excel import/export) |
| `tests/` | Unit and browser tests; `tests/ref/` holds the independent reference values and their generators |
| `docs/` | Architecture and rules (`PROJECT.md`), methods and sources (`METHODS.md`), progress (`PROGRESS.md`), specifications |
| `legacy/` | Retired code kept as a regression reference (not published) |

## Deployment

Every push to `main` runs the numerical tests in GitHub Actions. If they pass, the workflow uploads the changed files
through the cPanel API over HTTPS (`.github/workflows/deploy.yml`, `.github/deploy-cpanel.sh`). The only credential is
the repository secret `CPANEL_TOKEN`. The upload:

- never deletes anything on the server;
- refuses to write into a folder that is neither this site nor an empty document root.

Fallback: `sh scripts/build-zip.sh`, then upload the archive in cPanel.

## License / Lisans

Source code: [Apache License 2.0](LICENSE). Documentation (`docs/`, this README): [CC BY 4.0](LICENSE-docs).
Copyright and third-party notices: [NOTICE](NOTICE) (SheetJS in `assets/vendor/sheetjs/` keeps its own Apache-2.0
license).
