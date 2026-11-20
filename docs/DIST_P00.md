# P00: Review of the current diameter distribution tool and change map

Date: 10 Nov 2026. Specification: `docs/DIST_SPEC.md`. No code was changed in this stage.
Version reviewed: `cap-dagilimi` 1.0.0 (`assets/lab/weibull/`, `cap-dagilimi.php`), tests `tests/weibull/` (368 unit, 28 browser).

## 1. Relevant files

| File | Content | In the new tool |
|---|---|---|
| `assets/lab/weibull/calc.js` (152 lines) | Weibull pdf/cdf/sf/quantile/moment, `fitML`, `fitMoments`, `ks`, `ad`, `aicBic`, `classTable`, `ecdf`, `analyse`, `solveMonotone` | Formulas move to the new engine; the file does not change until 2.0.0 |
| `assets/lab/weibull/ui.js` (375 lines) | 3 steps (data, settings, results); tabs: parameters, charts, classes, plots, download; curve explorer | Rewritten |
| `assets/lab/weibull/i18n.js` | TR/EN texts (`makeT`) | New `dist/i18n.js` |
| `assets/lab/core/importer.js`, `table.js`, `num.js` | File/paste, separator, encoding, XLSX; number reading, decimal evidence, `defaultDecimal` | Used as is |
| `assets/lab/core/i18n.js` | `lang`, `makeT`, `fmtNum` (language-independent, point), `esc` | As is |
| `assets/lab/core/unitnav.js` | Plot navigator (list, search, sorting, previous/next, keys) | As is |
| `assets/lab/core/chart.js` | `barChart`, `scatterChart`, `plotChart` (bar + line, continuous axis), `radarChart`, SVG download | Used; `scatterChart` looks sufficient for Q–Q/P–P (to be verified in P13) |
| `assets/lab/core/export.js`, `store.js` | CSV (`,` and `.`), XLSX, JSON; IndexedDB session | As is |
| `assets/lab/core/special.js` | `lnGamma`, `gammaFn` | Extended (see §4) |
| `assets/lab/core/stats.js` | `betaInc`, `gammaP`, `normCdf`, `normQuantile`, `tCdf`, `tQuantile`, seeded generator | Used; normal tail fixed (see §3) |
| `assets/lab/core/nls.js` | Levenberg–Marquardt, covariance, OLS | Extended in P16–P17 |
| `assets/lab/stand/calc.js` → `classIndex` | Diameter class index; the Weibull tool imports it from here | Moved to `core/` (the dependency between tools goes away) |

## 2. Current behaviour

- **Parameterisation:** a = location, b = scale, c = shape; F(d) = 1 − exp(−((d − a)/b)^c). Same as the specification.
- **Location:** never estimated; 0 or the a fixed by the user (a ≥ 0 and a < min d).
- **Methods:** maximum likelihood with fixed a (profile score equation, geometric bisection for c, 0.01–1000) and moments (mean + variance). Percentile estimator, free three-parameter fit and recovery from summaries are **absent**.
- **Unit of analysis:** if a plot column is selected, each plot separately, or all trees pooled (equal weight). One optional filter column (e.g. period). **Period is not a separate dimension**; the "plot/period navigation" in the specification is only plot navigation in this tool. The period dimension should be added in the new tool (see §5, P01).
- **Measurement threshold:** the user is asked; if "there is a threshold" is answered, fitting is blocked.
- **Classes:** half-open [lower, upper), equal width or a list of bounds; expected = n·[F(upper) − F(lower)]; lower and upper tails shown separately, no rescaling.
- **Goodness of fit:** KS D, Anderson–Darling A², ln L; AIC/BIC only for maximum likelihood fits (k = 2). No p-value and no critical value.
- **Diagnostics:** n < 2, constant data, a ≥ min, few distinct values, data that look grouped; shape solution at the interval boundary or not converged are separate states.
- **Charts and output:** histogram + density curves, empirical/theoretical CDF, class table, curve explorer; parameter and class CSV, Excel report (Info, Parameters, Classes).
- **Number format and translation:** `core/i18n.js` (`fmtNum`), tool texts `weibull/i18n.js`; default point on import.

## 3. Places that disagree with the specification or must change

| # | Current | Specification | To do |
|---|---|---|---|
| 1 | Moment method uses the sample variance with divisor **n − 1** | Default divisor n (decision 2) | P05: default n; n − 1 as an option; old results reproduced exactly with the option |
| 2 | No percentile estimator | Direct estimation with two percentiles | Added in P05 |
| 3 | Fitting is blocked when a threshold is declared | Conditional likelihood | P11 |
| 4 | Class expected values are raw counts (n·p) | Poudel's EI per hectare (N·p); separate name for the L1 error with raw counts | P12–P13 |
| 5 | Result object has no unit, bound policy, source id, objective value | Result contract | P01 |
| 6 | `normCdf` loses precision in the lower tail: Φ(−8) = 6.11·10⁻¹⁶ (correct value 6.22·10⁻¹⁶), Φ(−10) = 0 | Stable logcdf / log-survival | P01: erfc-based tail and `logNormCdf`; current users (height–diameter, sampling) unaffected |
| 7 | No period dimension | Plot + period unit; repeated measurements on the same level | P01 data contract |
| 8 | Pool: every tree has equal weight | Per-hectare-weighted pooling out of scope | Unchanged; stays explicit on screen |
| 9 | `classIndex` from another tool's `calc.js` | Independent engine | Moved to `core/` |

Comparison with the source (Poudel and Cao 2013, read): the tool's definition of KS is the correct two-sided form; in the printed Equation 7 of the paper the parenthesis of the second term is wrong. The footnote of Table 2 writes the names b and c the wrong way round; the names in the tool agree with the main equation. No discrepancy.

## 4. Numerical infrastructure

No external dependency is proposed: everything needed can be written as small, pure JS functions and tested against SciPy (project rule: data do not leave the browser, no build step).

| Needed | Status | Stage |
|---|---|---|
| ln Γ, incomplete gamma P(a, x), incomplete beta, normal CDF/quantile, t distribution, seeded generator | Present | — |
| Stable normal tail (erfc), log Φ | **Missing** | P01 |
| Digamma ψ, trigamma | **Missing** | P03 |
| Inverse incomplete gamma (gamma quantile), inverse incomplete beta (beta quantile) | **Missing** | P03, P04 |
| Root finding: Brent + interval scan and root merging | Only monotone bisection for a single root | P01 (Brent), P07 (scan) |
| Bounded multivariate minimisation (Nelder–Mead or BFGS with transformed parameters) | **Missing** | P04, P10 |
| Gauss–Hermite / Gauss–Legendre integration (Johnson SB moments) | **Missing** | P08 |
| Bivariate nonlinear equation solver (Parresol) | LM present (`core/nls.js`), adapted to the residual form | P09 |
| Cramér–von Mises | **Missing** | P13 |
| Web Worker (bootstrap, model training) | Never used in the project; an ES module worker needs no extra setting in `php -S` or cPanel | P14 |
| Multi-response NLS, SUR (residual covariance) | **Missing** | P16 |

## 5. Proposed file layout

```
assets/lab/core/special.js      + digamma, trigamma, erfc, inverse incomplete gamma/beta
assets/lab/core/roots.js        Brent, interval scan (new)
assets/lab/core/optim.js        bounded minimisation (new)
assets/lab/core/quad.js         Gauss–Hermite, Gauss–Legendre (new)
assets/lab/core/classes.js      classIndex, class building (moved from stand/calc.js; stand re-exports it)
assets/lab/dist/registry.js     distribution and method registry, result contract, structured errors
assets/lab/dist/families/*.js   each family: schema, support, pdf/logpdf, cdf/logcdf, sf/logsf, quantile, moments
assets/lab/dist/fit/*.js        direct estimation methods (by family)
assets/lab/dist/recover/*.js    recovery from summaries (Weibull M2–M10, Parresol)
assets/lab/dist/gof.js          KS, AD, CvM, ln L, AIC/BIC, class errors
assets/lab/dist/observe.js      measurement threshold, likelihood of classed data
assets/lab/dist/ui.js, i18n.js  interface
cap-dagilimi-2.php              development page not listed in the menu (noindex); replaces cap-dagilimi.php after P15
tests/dist/test_*.mjs, e2e.mjs  unit and browser tests
tests/ref/make_dist_*.py        SciPy references (first file: specification Section 8 table)
```

The calculation core (`registry`, `families`, `fit`, `recover`, `gof`, `observe`) does not touch the DOM; the same files run in Node tests and in the Web Worker.

## 6. Behaviours to keep

1. The names a, b, c and their meanings; the location not being estimated automatically.
2. Maximum likelihood with fixed a and the moment results (moments: exactly the same with the n − 1 option).
3. Separate reporting of solution states (at boundary, did not converge, data problem); a failed fit not being shown as a number.
4. No p-value (until the P14 bootstrap); AIC/BIC given only for fits whose likelihood is maximised.
5. Tails shown separately in the class table, no rescaling.
6. The plot navigator, the selection being kept across tabs, the curve explorer.
7. Import rules, default decimal point, TR/EN, the session stored in the browser, data not leaving the browser.
8. Tool version and settings in the CSV and Excel outputs.

## 7. Specification ↔ current state mapping

| Requested | Status |
|---|---|
| Weibull 2P / fixed a, MLE, MOM | Present (MOM divisor must change) |
| KS, AD, ln L, AIC/BIC rules, class table with tails, state distinction | Present |
| Default decimal point, shared navigator, TR/EN, CSV/Excel | Present |
| Weibull percentile estimation; measurement threshold; period dimension; result contract; normal tail | Must change / be added |
| Distribution registry; normal, lognormal, gamma, beta, Johnson SB, exponential, log-logistic | To be added |
| Recovery from summaries (M2–M10, Parresol); classed data; CvM; Q–Q/P–P; bootstrap | To be added |
| Stand models (PPM/PRM, NLS, SUR, CDFR) | To be added (P16–P17) |

## 8. Stage dependencies

```
P01 ─ P05 ─┬─ P02 ─ P03 ─ P04 ─ P08 ─ P10 ─┬─ P11 ─ P12 ─ P13 ─ P14 ─ P15 (2.0.0)
           └─ P06 ─ P07                    │
                    P09 (depends on P08) ──┘
P16 (P06, P07, P09, P15) ─ P17
```

P03 requires digamma and the inverse incomplete gamma, P04 the inverse incomplete beta and a minimiser, P08 integration; P11 depends on each family's cdf/sf, P14 on every method being re-runnable. The run order is as in the specification.

## 9. Implementation note

- New session key `session:cap-dagilimi-2`; 1.0.0 sessions are not carried over to the new tool (they hold only settings; the data are loaded again).
- The new page does not enter the `site_tools()` list; the citation menu and the version check (`tests/site/test_cite.mjs`) are updated in P15.
- At every stage: `tests/ref/make_dist_<stage>.py` → `tests/dist/test_<stage>.mjs` → added to the release workflow; the existing `tests/weibull/` must pass unchanged at every stage.
- Source status: Poudel and Cao (2013), Parresol (2003), Kangas and Maltamo (2000) read [B]; the others [B] if read in the relevant stage, otherwise [İ]/[D].
