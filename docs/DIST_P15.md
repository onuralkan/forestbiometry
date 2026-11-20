# P15 report: first usable release (Diameter Distribution Lab 2.0.0)

11 Nov 2026. Specification `docs/DIST_SPEC.md` P15. Code `assets/lab/dist/`, page `cap-dagilimi.php`.

## 1. Completed scope (P00–P15)

| Area | What is there | Stage |
|---|---|---|
| Families | Weibull (a fixed), normal, two-parameter lognormal, gamma, fixed-bound beta, Johnson SB (ξ, λ fixed), exponential (a fixed), log-logistic (Fisk) | P05, P02, P03, P04, P08, P10 |
| Fitting from raw data | Maximum likelihood; moments (divisor n by default, n − 1 as an option); percentiles (Weibull Dubey pair, SB 50/95 and a user pair, log-logistic); log-moments (log-logistic) | same |
| Recovery from summaries | Normal, lognormal, gamma (mean + variance or Dq); Weibull M2–M10 (Poudel and Cao 2013); Johnson SB, ξ fixed (Parresol 2003) | P06, P07, P09 |
| Measurement threshold | Conditional maximum likelihood for eight families; goodness-of-fit measures with the conditional distribution | P11 |
| Diameter classes | Class tables; maximum likelihood from class frequencies (eight families), distinction between tree counts and per-hectare frequencies | P12 |
| Comparison | KS, AD, CvM, AIC, BIC, AICc, class errors, EI; groups by observation process; Q–Q, P–P | P13 |
| Uncertainty | Parametric bootstrap p-values; parametric / non-parametric percentile intervals; seed; Web Worker | P14 |
| Interface and output | Two workflows; plot × period navigator is the same unit across all tabs; TR/EN; accessible controls; phone view; method, units, support and observation policy and sources of every result; Excel (Info, Fits, Parameters, Plots, Classes, Comparison, Bootstrap, Sources), CSV, JSON, SVG (version, settings, parameters and seed inside the file); loading warning | P15 |

**Separating working and non-working results.** Only a result in the "ok" state shows parameters. The other states (at boundary, did not converge, multiple solutions, not computed, error) give no parameters; the reason is written in words and counted for each unit ("n results computed; m results could not be computed or are not supported"). Unsupported combinations are shown with an explanation instead of a number: methods without a threshold on thresholded data, raw-data methods on classed data, recovery in the bootstrap, per-hectare frequencies and the "measured, no trees" option.

**Verification.** Every calculation was tested against an independent reference (SciPy, mpmath, hand calculation): `tests/dist/test_p01.mjs` … `test_p15.mjs` and `test_export.mjs`, 9 233 checks in total. Browser test `tests/dist/e2e.mjs` 168/168 checks. The P15 sections of the browser test cover:
- all methods of the eight families on the sample data; failing results on small plots;
- the selected plot being kept across all tabs;
- empty and missing data; comma data are read only when comma is selected;
- equal diameters;
- version, settings, parameters and seed in the exported files;
- load error.

## 2. Deliberately not done
- **Curve explorer.** The parameter sliders of the old Weibull tool were not carried over. In P01 it had been left to P15, but it is not in the P15 text. If wanted, it will be added as separate work.
- **Location or bound estimation** (three-parameter Weibull, free beta L/U and SB ξ/λ): not included, by specification decision.
- **Basal-area-weighted fitting and per-hectare-weighted pooling:** out of scope (specification Section 0, decision 3).
- **Live browser test.** The hosting service's bot protection from time to time holds the headless browser on a "One moment, please..." page. The files on the server are checked by comparing them with the local ones. On the user side this situation is now shown with a "tool could not be loaded" warning. The permanent fix is a whitelist on the hosting side.

## 3. Remaining stages
- **P16–P17:** stand-level model development, i.e. prediction of distribution parameters from stand variables (2.1.0). The "Stand model" workflow is added with these.
- **P18–P23:** optional extensions. P23 is the basal-area diameter distribution and is descriptive only. For details see the relevant sections of the specification.
