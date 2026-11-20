# Platform plan: modules and tool catalogue

The "Forest Biometry Online — Platform Revision Plan" document uploaded by the user on 12 Nov 2026, edited to fit the
project's binding rules (CLAUDE.md, docs/PROJECT.md, TOOLS_SPEC K1–K9). The site's sidebar and the tools index are
drawn from this catalogue (`inc/catalog.php`); this document and that file are updated together. On 17 Nov 2026
27 planned tools were removed from the plan (P8).

## 1. Vision and principles

An open-source tool platform for foresters, researchers and students that measures, estimates, models and reports,
from a single tree to a whole inventory, with transparent, sourced and reproducible methods.

- **Calculation tools only:** every tool takes input and gives calculated, modelled or visualized output.
- **Shared data:** the tools read and write the same data contracts (`forest-dataset/1`, `stem-sections/1`,
  `model-coef/1`; PROJECT.md §4b, TOOLS_SPEC §1).
- **Transparent method:** the formula of every equation, its source ([B]/[İ]/[P]/[A]/[D] in METHODS.md), its units and its range of validity are written out.
- **Reproducibility:** every result is exported with its inputs, settings, method versions and sources; a versioned
  archive with a Zenodo DOI.
- **Openness:** source code Apache-2.0, documents CC BY 4.0.

## 2. Binding decisions (12 Nov 2026, user)

| No | Decision |
|---|---|
| P1 | **No server:** a REST API, server-side calculation (Python/R), a database (PostgreSQL/PostGIS) and user accounts are out of scope. Calculations are done in the browser (JS; heavy work in a Web Worker), data does not leave the browser. A "project" is kept in the browser (IndexedDB) and exported and imported as a file. The calculation engines have no DOM and also run in Node; this is the documented path that replaces an API. |
| P2 | **No built-in coefficients (K1 is kept):** the "species- and region-selectable equation database" is the user's own sourced coefficient library (`model-coef/1`, source field mandatory). A ready-made set is added, as a separate stage, only once its source has been read and marked [B]. IPCC and similar default values are not embedded. |
| P3 | **Stable tool ids `MODULE-NN`:** pages, tests, documents and issues are referred to by this id. One page may cover several ids. Stages are tied to the tool id: `<ID>/a<n>` (e.g. `SS-07/a1`). The old stage codes in TOOLS_SPEC and DIST_SPEC (SV01, SI01, SS01, P01…) stay as they are in the historical records; their mapping is in Section 5. |
| P4 | **Out of scope:** ML-02, ML-03, SQ-04, GY-08, DS-03 and DI-06 (API). SV-05 low priority. |
| P5 | **Units:** the platform is metric; where needed, units are converted on input, calculation and output stay metric. Exception (17 Nov 2026, user decision): Log Scaling (SV-05) gives the result of the board-foot rules in board feet (clearly labelled; m³ alongside). |
| P6 | **Page addresses do not change** (citations with DOIs and guide links). New tools are added with a Turkish page name and an English code folder (K2). The long English paths in the plan are document ids only. |
| P7 | **Outputs:** Excel, CSV, JSON (with method information) and SVG charts. A PDF report is considered separately in stage DI-05 (without a build step and a server). DI-05/a1 (16 Nov 2026): the report is printable HTML; the PDF is obtained from the browser's print dialog ("Save as PDF"), no PDF library was added. |
| P8 | **Removed (17 Nov 2026, user decision):** 27 planned tools were removed from the plan and the site: BC-05; SI-02, SI-04…SI-09; GY-01…GY-07; SM-07; ML-01, ML-04…ML-08; DS-01, DS-02, DS-04…DS-06. Together with the six out-of-scope tools in P4, 33 ids are out of scope. The ids are permanent (P3): they stay in the catalogue as `out` for history, are not shown on the site (sidebar, tools index, home page counters) and are not proposed again under another name. The GY, ML and DS modules, left without a tool, are not listed; the site shows 8 modules. Planned tools still open: SV-03, SV-04, SV-05, SM-02…SM-05. **Addendum (17 Nov 2026, user decision):** SM-05 (mortality and survival models) was also removed from the plan and the site; 34 out-of-scope ids. All the other tools in the plan are live; no planned tool remains. |

The plan's "Open decisions" were closed by these decisions: technology the existing PHP 7.4+ and browser JS (no build
step); calculation in the browser; no database and no user accounts; licence Apache-2.0 and CC BY 4.0; no initial
species/region coverage (P2).

## 3. Status key

**live** a page covers it · **in development** being developed, no page yet · **planned** · **out of scope** not shown
on the site. The source column shows the sources that must be read before implementation and their status; where it
says "PDF from the user", the source is requested before moving to the stage.

## 4. Tool catalogue

### DI — Data preparation and management

| ID | Tool | Status | Page | Note and source |
|---|---|---|---|---|
| DI-01 | Data import and validation | live | `veri-denetcisi.php` | Forestry Data Validator |
| DI-02 | Coefficient and equation library | live | `katsayi-kutuphanesi.php` | Library core `core/coef.js`, `core/coef-ui.js`. DI-02/a1 (16 Nov 2026, user decision: central management): the sets of all tools on a single page (`assets/lab/coeflib/`), filtering/search, details, editing with the same editor, copy, delete, sets with identical coefficients and problematic sets, backup to a single file and restore with preview; 1.0.0-beta.1, released (16 Nov 2026, user decision). No built-in set (P2) |
| DI-03 | Project and inventory data manager | live | `veri-yoneticisi.php` | In the browser (P1); the plot–tree–measurement hierarchy with `forest-dataset/1`. DI-03/a1 (16 Nov 2026, user decision: multiple data packages + an active package; only the metadata is edited): Inventory Data Manager 1.0.0-beta.1 (`forest-project/1`, PROJECT §4b): project information, plot × period summary, active package (`dataset:approved`, tools unchanged), import/export and backup with preview, copy, delete; Data Validator 1.2.0 adds approvals to the list; released (16 Nov 2026, user decision). Next: merging periods (the groundwork for SI-09), reopening a package in the Validator. |
| DI-04 | Visualization dashboard | live | `pano.php` | DI-04/a1 (16 Nov 2026, user decision: package + run records; ready-made panels + filters): Visualization Dashboard 1.0.0-beta.1: summary, diameter distribution, species composition, N/ha and G/ha per plot, height–diameter, tree map; period, stratum, species, plot filters; densities from Diameter Distribution records, curves from Height–Diameter records (METHODS §21). Released (16 Nov 2026, user decision). Next: the records of the other tools (site index, stand structure), a free chart builder. |
| DI-05 | Report generator | live | `rapor.php` | P7. DI-05/a1 (16 Nov 2026, user decisions: printable HTML; package + run records; selectable sections + title and notes): Report Generator 1.0.0-beta.1: report information, report language TR/EN, data package summary and plot × period table, dashboard charts (filtered, with record curves), settings and result tables of the run records, sources (platform and tool citations, sources in the records, user coefficient sources), reproducibility appendix; print/PDF from the browser and standalone HTML. Released (16 Nov 2026, user decision). |
| DI-06 | API and scripting interface | out of scope | – | P1; instead, engines that run in Node and the planned "also give the R code" button. |
| DI-07 | Reproducibility layer | live | `kayit-dogrulayici.php` | DI-07/a1 (16 Nov 2026, user decision: shared record + verifier; input by default as a fingerprint only, embedding the data optional): the JSON download of all tools is `run-record/1` (PROJECT §4c, METHODS §20): tool, version, catalogue ids, released commit, settings, input SHA-256s, RFC 8785 + SHA-256 seal; a record download for the five tools that had no JSON (height–diameter SM-01, model evaluation and relative ranking SM-06, sampling SI-01, plot SI-03). Record Verifier 1.0.0-beta.1; released (16 Nov 2026, user decision). Next: reopening a record in its tool, repeating and comparing the calculation; Zenodo DOI. |

### TM — Tree measurement

Decisions (17 Nov 2026, user): (1) work on the TM tools starts after a mensuration textbook (Kershaw et al. 2016, van Laar and Akça 2007 or a Turkish mensuration textbook) has been added to Drive; the definition formulas are also read from it and marked [B], the definition exception is not used. (2) TM-01, TM-02, TM-04 and TM-06 on a single "Tree Measurement" page; TM-03 (bark, needs a coefficient set) and TM-05 (ring and increment-core data) separate pages (later, by user decision, both became tabs of Tree Measurement). (3) The TM module is run by the `claude/nifty-hamilton-oi0q51` session; other sessions do not touch TM.

| ID | Tool | Status | Note and source |
|---|---|---|---|
| TM-01 | Height calculator (clinometer, tangent, sine, slope correction) | live | Page `agac-olcumu.php` (released 17 Nov 2026, user decision). TM-01/a1 (17 Nov 2026): height core `assets/lab/tree/height.js`; Hamilton 1975 and Graves 1906 [B] (METHODS §23). Page "Tree Measurement" together with TM-02, TM-04, TM-06 |
| TM-02 | Diameter and basal area (circumference ↔ diameter, irregular stem) | live | Page `agac-olcumu.php` (released 17 Nov 2026, user decision). TM-02/a1 (17 Nov 2026): `assets/lab/tree/diameter.js`; Hamilton 1975 and Graves 1906 [B] (METHODS §23) |
| TM-03 | Bark thickness and under-bark diameter | live | TM-03/a1 (17 Nov 2026): `assets/lab/tree/bark.js`; Hamilton 1975, Graves 1906, van Laar and Akça 2007 4.1.6 [B] (METHODS §23). "Bark" tab on the Tree Measurement page (user decision: a tab instead of a separate page; 1.0.0-beta.3); coefficients from the user (K1), tool `bark` in the coefficient library |
| TM-04 | Crown metrics | live | TM-04/a1 (17 Nov 2026): `assets/lab/tree/crown.js`; van Laar and Akça 2007 4.1.7, Kershaw et al. 2016 §5.5 and §8.6.1, Hamilton 1975 §8 [B] (METHODS §23). "Crown" tab on the Tree Measurement page (1.0.0-beta.4) |
| TM-05 | Tree age and diameter increment (ring and increment-core data) | live | TM-05/a1 (17 Nov 2026): `assets/lab/tree/age.js`; Graves 1906 chapters XV–XVI and van Laar and Akça 2007 4.1.1 [B] (METHODS §23). "Age and increment" tab on the Tree Measurement page (user decision; 1.0.0-beta.2), released (17 Nov 2026, user decision) |
| TM-06 | Form factor and form quotient | live | Page `agac-olcumu.php` (released 17 Nov 2026, user decision). Section Volume already gives the form factor and the Hohenadl form quotients (Heger 1965 [B]). TM-06/a1 (17 Nov 2026): `assets/lab/tree/form.js`; Graves 1906 [B] chapter XIII (METHODS §23; an arithmetic error was found in the book's form exponent example) |

### SV — Stem volume and taper

| ID | Tool | Status | Page | Note and source |
|---|---|---|---|---|
| SV-01 | Section volume (Huber, Smalian, Newton, Hohenadl) | live | `seksiyon-hacmi.php` | Huber/Smalian/Newton definition exception [D]; Hohenadl Heger (1965) [B] |
| SV-02 | Taper equations (Max and Burkhart, Kozak, variable-exponent) | live | `govde-profili.php` | TOOLS_SPEC TP01–TP02. SV-02/a1 (16 Nov 2026): Max and Burkhart (1976) Model 4 core [B] (`assets/lab/taper/calc.js`). SV-02/a2 (16 Nov 2026): Kozak (2004) Model 02 [B]. SV-02/a3 (16 Nov 2026): fitting from stem measurements (TP02). Page (TP04) 16 Nov 2026, 1.0.0-beta.1; usable volume up to a top diameter is also on the page (the basis of SV-03) |
| SV-03 | Merchantable volume (taper integral, top-diameter and log-length limits) | live | `govde-profili.php` | TP01–TP03. Top-diameter limit with the SV-02 page; SV-03/a1 (17 Nov 2026, 1.0.0-beta.3): log-length limit, Kershaw et al. 2016 §6.4.1, §7.4.1, §7.4.3 [B] |
| SV-04 | Volume equations | live | `hacim-denklemleri.php` | TOOLS_SPEC SV04; SV-04/a1 (17 Nov 2026, 1.0.0-beta.1): Kershaw et al. 2016 §6.2 [B] (6.22, 6.23, 6.24–6.25, local, 6.29); weighting Parresol 1999 [B]; coefficients from the user's data |
| SV-05 | Log scaling rules (Doyle, Scribner, International ¼″, cubic) | live | `tomruk-olcumu.php` | SV-05/a1 (17 Nov 2026, 1.0.0-beta.1): Kershaw et al. 2016 §7.3, §7.4.1, Table 6.1 [B]; board feet labelled (P5 exception, user decision) and m³ |
| SV-06 | Product bucking (assortment) optimization | live | `govde-profili.php` | TP03. SV-06/a1 (16 Nov 2026): priority order and dynamic programming core (`assets/lab/taper/bucking.js`); Grondin (1998) and Bennemann et al. (2025) [B]; Pnevmaticos and Mann (1972) cited [D]. Page: bucking section in Taper (`govde-profili.php`, 1.0.0-beta.2; 16 Nov 2026); released (16 Nov 2026, user decision) |

### BC — Biomass and carbon

| ID | Tool | Status | Note and source |
|---|---|---|---|
| BC-01 | Allometric biomass | live | TOOLS_SPEC BC01–BC02. BC-01/a1 = BC01 (16 Nov 2026): core `assets/lab/biomass/calc.js`; forms definition exception [D] (user decision); Baskerville correction on the ln scale [A] (Chave et al. 2014, Baia et al. 2025); for log₁₀, Sprugel 1983 awaited; Snowdon and a user factor as values. Page `biyokutle-karbon.php` with BC02 (17 Nov 2026, 1.0.0-beta.1) |
| BC-02 | Biomass components (stem, branches, foliage, roots; additive systems) | live | BC-02/a1 (17 Nov 2026, 1.0.0-beta.4, live): linear additive system, restricted (weighted) SUR, Parresol 1999 [B]; BC-02/a2 (17 Nov 2026, 1.0.0-beta.5): nonlinear additive system, power forms, NSUR weighted or on the ln scale, confidence and prediction intervals, Parresol 2001 [B]. The biomass part of SM-04 |
| BC-03 | Biomass expansion factor (BEF) | live | TOOLS_SPEC BC03; factors from the user. Volume conversion core in BC01: IPCC 2006 Volume 4 Chapter 2 Equation 2.8b [B]. BC-03/a1 = BC03 (17 Nov 2026, 1.0.0-beta.2): volumes from Section Volume via a `forest-derived/1` record (the package does not change), the two approaches in separate rows |
| BC-04 | Carbon stock and CO₂ equivalent | live | K9: CO₂ = C × 44/12 (IPCC 2006 §2.2.3 [B]), carbon fraction from the user. Core in BC01 |
| BC-05 | IPCC carbon accounting (tiers 1–3) | removed (P8) | IPCC 2006 Volume 4: PDF from the user; default values are not embedded (P2) |
| BC-06 | Carbon uncertainty (Monte Carlo) | live | TOOLS_SPEC BC04. BC-06/a1 = BC04 (17 Nov 2026, 1.0.0-beta.3): coefficient covariance and residual standard error from the source; scheme Réjou-Méchain et al. 2017 [B], log-normal residual Chave et al. 2004 [B]; released (17 Nov 2026, user decision) |

### SS — Stand structure and density

| ID | Tool | Status | Page | Note and source |
|---|---|---|---|---|
| SS-01 | Stand summary (N/ha, G/ha, Dq, top height) | live | `ornek-alan.php` | Plot and Stand |
| SS-02 | Stand density indices (Reineke SDI, relative density, CCF, Curtis RD) | live | `mescere-yapisi.php` | SDI and RD ready (Reineke 1933, Curtis 1982 [B]); relative spacing definition exception; for CCF, Krajicek et al. (1961): the original article could not be found; Kershaw et al. 2016 §8.9.4 and van Laar and Akça 2007 (pp. 156–157) read [B], CCF added on 17 Nov 2026 (`structure/ccf.js`, Stand Structure 1.0.0-beta.3; coefficients from the user, tool `ccf` in the coefficient library; METHODS §16) |
| SS-03 | Diameter distribution (Weibull, gamma, Johnson SB…; parameter recovery) | live | `cap-dagilimi.php` | Diameter Distribution Lab 2.2.0 |
| SS-04 | Diversity indices (Shannon, Simpson, species richness) | live | `mescere-yapisi.php` | Statistical definition |
| SS-05 | Structural diversity indices (Gini, mingling, differentiation) | live | `mescere-yapisi.php` | Gini definition; M, T, U Pommerening (2002): uploaded, awaiting verification |
| SS-06 | Spatial pattern analysis (Ripley K/L, pair correlation, Clark–Evans) | live | `mescere-yapisi.php` | Clark–Evans and Donnelly ready (uploaded, awaiting verification); source for Ripley K/L and the pair correlation function: PDF from the user |
| SS-07 | Competition indices (Hegyi; distance-dependent and distance-independent) | live | `mescere-yapisi.php` | SS-07/a1 calculation ready (`structure/competition.js`); Hegyi (1974) temporary exception, PDF from the user |

### SQ — Site quality and productivity

| ID | Tool | Status | Page | Note and source |
|---|---|---|---|---|
| SQ-01 | Site index | live | `bonitet.php` | Hernández-Cuevas et al. (2018) [B]; curve library from the user (P2) |
| SQ-02 | Site index curve building (ADA/GADA fitting) | live (ADA) | `bonitet.php` | For GADA, Cieszewski and Bailey (2000): PDF from the user |
| SQ-03 | Growth function fitting (Chapman–Richards, Schumacher, Gompertz, logistic, monomolecular, Weibull) | live | `buyume-islevi.php` | CR and Schumacher [B] (Hernández-Cuevas et al. 2018); the others [A] (Fekedulegn et al. 1999 + `growthmodels`); Korf awaiting a source |
| SQ-04 | Productivity from environmental data | out of scope | – | P4 |

### SI — Sampling and inventory

| ID | Tool | Status | Page | Note and source |
|---|---|---|---|---|
| SI-01 | Sample size | live | `ornekleme.php` | Inventory Sampling Planner |
| SI-02 | Sampling design generator (random, systematic, stratified, cluster) | removed (P8) | – | |
| SI-03 | Fixed-area plot estimation | live | `ornek-alan.php` | expansion factors, per-hectare values |
| SI-04 | Angle count (Bitterlich) | removed (P8) | – | |
| SI-05 | Edge-effect correction (mirage, walkthrough) | removed (P8) | – | |
| SI-06 | Line-intersect sampling (coarse woody debris) | removed (P8) | – | |
| SI-07 | Two-phase and double sampling | removed (P8) | – | |
| SI-08 | Design-based inference (Horvitz–Thompson, stratified, GREG) | removed (P8) | – | The design-based forest estimation of the Plot tool covers part of this |
| SI-09 | Repeated inventory analysis (growth, mortality, ingrowth) | removed (P8) | – | |

### GY — Growth and yield

| ID | Tool | Status | Note |
|---|---|---|---|
| GY-01 | Whole-stand yield table generator | removed (P8) | Yield tables are not embedded (K1); generated from the user's model |
| GY-02 | Diameter-class and matrix model | removed (P8) | |
| GY-03 | Individual-tree growth simulation | removed (P8) | |
| GY-04 | Mortality and ingrowth models | removed (P8) | |
| GY-05 | Thinning scenarios | removed (P8) | |
| GY-06 | Stand density management diagram | removed (P8) | |
| GY-07 | Self-thinning line | removed (P8) | |
| GY-08 | Climate-sensitive growth projection | out of scope | P4 |

### SM — Statistical modelling

| ID | Tool | Status | Page | Note |
|---|---|---|---|---|
| SM-01 | Height–diameter models | live | `boy-cap.php` | fixed-effects version |
| SM-02 | Nonlinear regression (NLS, weighted) | live | `dogrusal-olmayan-regresyon.php` | SM-02/a1 (17 Nov 2026, 1.0.0-beta.1): ready-made forms and free formula (user decision; `core/expr.js`), weighted NLS, intervals, comparison by AIC, saving to the library; Parresol 2001 [B] |
| SM-03 | Mixed-effects models | live | `karma-modeller.php` | SM-03/a1 (17 Nov 2026, 1.0.0-beta.1): linear and nonlinear mixed models (Pinheiro and Bates 2000, Lindstrom and Bates 1990 [B]), ML/REML, diagonal/general covariance, varPower, AIC/BIC/LRT, calibration for a new group [A], saving to the library; verified against nlme 3.1-168 [P] |
| SM-04 | Simultaneous and compatible systems (SUR, additive biomass) | live | `denklem-sistemleri.php` | SM-04/a1 (17 Nov 2026, 1.0.0-beta.1): linear and nonlinear SUR with the user's formulas, iterated SUR, compatible systems with shared coefficients (Henningsen and Hamann 2007, Parresol 2001 [B]); verified against systemfit 1.1-30 [P]; 2SLS/3SLS out of scope |
| SM-05 | Mortality and survival models | out of scope | – | P8 addendum (17 Nov 2026, user decision) |
| SM-06 | Model evaluation | live | `model-degerlendirme.php`, `nispi-siralama.php` | Relative Ranking was placed under SM-06 in the catalogue on 19 Nov 2026 (user decision; a separate page, right next to Model Performance in the index), for ranking models |
| SM-07 | Uncertainty quantification (bootstrap, Monte Carlo, Bayesian) | removed (P8) | – | bootstrap exists in diameter distribution and site index |

### ML — Machine learning and spatial prediction

| ID | Tool | Status | Note |
|---|---|---|---|
| ML-01 | Machine-learning regression and classification | removed (P8) | in the browser |
| ML-02 | Deep-learning crown delineation | out of scope | P4: large models, GPU, data does not leave the browser |
| ML-03 | Point-cloud segmentation | out of scope | P4 |
| ML-04 | k-NN imputation | removed (P8) | |
| ML-05 | Spatial interpolation (kriging, Gaussian processes) | removed (P8) | |
| ML-06 | Spatial cross-validation | removed (P8) | |
| ML-07 | Small-area estimation | removed (P8) | |
| ML-08 | Model-assisted inference | removed (P8) | |

### DS — Decision support and applications

| ID | Tool | Status | Note |
|---|---|---|---|
| DS-01 | Timber valuation | removed (P8) | prices from the user |
| DS-02 | Harvest scheduling optimization | removed (P8) | linear programming in the browser |
| DS-03 | Carbon project MRV | out of scope | P4: more regulation than biometrics |
| DS-04 | Deadwood and habitat structure | removed (P8) | |
| DS-05 | Damage assessment | removed (P8) | |
| DS-06 | Urban tree inventory | removed (P8) | |

## 5. Mapping of old stage codes to ids

| Old code (specification) | Tool id |
|---|---|
| DIST_SPEC P00–P23 | SS-03 |
| TOOLS_SPEC SV01–SV03 (SV04) | SV-01 (SV-04) |
| TOOLS_SPEC SI01–SI04 | SQ-01, SQ-02 (old "SI" = site index; SI in the plan = sampling) |
| TOOLS_SPEC SS01 | SS-02, SS-04, SS-05 (`assets/lab/structure/calc.js`) |
| TOOLS_SPEC SS02 | SS-05, SS-06 (`assets/lab/structure/spatial.js`) |
| TOOLS_SPEC SS03 | SS-07 |
| TOOLS_SPEC SS04 | SS-02, SS-04…SS-07 page (`mescere-yapisi.php`) |
| TOOLS_SPEC BC01–BC03 (BC04) | BC-01…BC-04 (BC-06) |
| TOOLS_SPEC TP01–TP04 (TP05) | SV-02, SV-03, SV-06 |

From now on, stages are named `<ID>/a<n>`.

## 6. Roadmap

The plan's four phases were updated according to the live tools. The order is set by the prompts the user sends; a
stage does not move on to the next until its acceptance criteria are met.

By the user decision of 17 Nov 2026 (P8) the roadmap was narrowed. Tools that are not live and were not removed from the plan:

1. **Stem volume:** SV-03, SV-04 and SV-05 done (17 Nov 2026); no planned tool remains in the SV module.
2. **Statistical modelling:** SM-02, SM-03 and SM-04 done (17 Nov 2026); SM-05 removed from the plan (17 Nov 2026, user decision). No planned tool remains.
3. **Biomass:** BC-02/a2 done (17 Nov 2026); no planned tool remains in the BC module.

Dependencies: DI feeds input to all modules; the coefficient library (DI-02) to SV, BC, SQ; the fitting tools in SM
to SQ-03 and height–diameter.

## 7. Per-tool specification

For every new tool a specification is written before coding: either a section in the TOOLS_SPEC format or `docs/tools/<ID>.md`
(purpose; inputs and their units; methods and equations; outputs; sources and their reading status; verification:
reference cases with known results and tolerances; interface; dependencies). There is no API section (P1).

## 8. Common requirements

The plan's common requirements are already met by the rules of PROJECT.md and TOOLS_SPEC §1.1: units are carried
with every value (P5); single-record and batch (CSV/Excel) use; a warning outside the range of validity; every
scientific calculation is tested against an independent reference; every method shows its source; Excel/CSV/JSON
export (P7); responsive layout, complete TR/EN; a guide section for every tool.
