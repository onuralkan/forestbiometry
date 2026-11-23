# New tools: technical specification and staged development prompts

Prepared on: 12 Nov 2026
Status: **approved** (12 Nov 2026, user); corrections 1–3 in §5 of the T00 report applied (12 Nov 2026, user approval). The K1–K9 decisions in Section 0 are binding; CLAUDE.md links to them.
Scope: five new tools in the order requested by the user (12 Nov 2026):

1. Section volume calculator / Stem Section Volume
2. Site index calculator / Site Index
3. Stand structure and competition / Stand Structure & Competition
4. Biomass and carbon calculator / Biomass & Carbon
5. Taper and product volume / Taper & Assortment

This document has the same format as `docs/DIST_SPEC.md`: first the common rules and a technical specification per tool, then the prompts to be given one by one, for each stage, to the AI that will do the coding. The reference numbers in Section 8 were computed with SciPy/NumPy while this document was written. This does not mean that the code on the site has been tested. **None** of the sources in Section 9 **was read for this document**: the references were written from knowledge, their status is **[D]** (to be verified). Before a source's equation is implemented, it must be read and marked **[B]** in METHODS.md.

## 0. Decisions (K1–K9, user approval 12 Nov 2026; binding)

| No | Decision | Decision text | Rationale |
|---|---|---|---|
| K1 | Built-in coefficients | **No tool has built-in species/region coefficients.** Site index curves, biomass equations, carbon fraction, wood density, bark model and taper coefficients are entered by the user or fitted from the user's own data. A coefficient set is kept in a "coefficient registry" with a mandatory source field (T01). | PROJECT.md §5 rule 4; zero risk of fabricated coefficients. If a built-in set is requested, it is added as a **separate stage** after its source has been read and marked [B]. |
| K2 | Page and folder names | `section-volume.php` → `assets/lab/secvol/`; `site-index.php` → `assets/lab/siteindex/`; `stand-structure.php` → `assets/lab/structure/`; `biomass-carbon.php` → `assets/lab/biomass/`; `stem-taper.php` → `assets/lab/taper/` | Same as the existing naming (Turkish page name, English code folder). |
| K3 | Sidebar categories | New category **"Tree and stem"**: section volume, taper, biomass and carbon. New category for site index and stand structure: **"Stand and site"**. | The existing four categories do not fit these tools. |
| K4 | Version | Each tool starts at `1.0.0-beta.1`. The beta number increases with every release in which the set of computed methods changes (diameter distribution rule). The first full version becomes `1.0.0` with the acceptance of the tool's last stage. | The citation version must show what the tool does. |
| K5 | Order | T00 → T01 → SV01 → SV02 → SV03 → SI01 → SI02 → SI03 → SI04 → SS01 → SS02 → SS03 → SS04 → BC01 → BC02 → BC03 → TP01 → TP02 → TP03 → TP04. Optional: SV04, BC04, TP05. | The user's tool order is kept. The shared infrastructure (T01) comes first, because four tools share the coefficient registry and two tools share the stem measurement contract. |
| K6 | Stem measurement data | Section volume and taper use the same data contract (`stem-sections/1`, Section 1.2). The taper tool does not rewrite the section tool's computation; it imports it. | The same data is not entered twice (interface principle 4). |
| K7 | Top section | For the piece from the last measurement point to the tip, the geometric solid is a **user choice**: cone, paraboloid or neiloid. The tool default is **cone**; this is a tool rule, not a requirement taken from a source, and it is written in the result. | In practice the cone is the most frequently used option, but it is not the only correct one. |
| K8 | Age in site index | The age type (total age / breast-height age) is **chosen explicitly** for each dataset. Curve coefficients are used with the age type they were produced with; the tool does not convert age types into each other. | If they are mixed, site index shifts systematically. |
| K9 | Carbon and CO₂ | The carbon fraction (CF) is entered by the user (per component). CO₂ equivalent = C × 44/12 (molar mass ratio; a constant, not a coefficient). | Consistent with K1. 44/12 is a chemical constant. |

## How should it be used?

1. Give this document to the AI that will do the coding as a project reference. `CLAUDE.md`, `docs/PROJECT.md` and `docs/METHODS.md` always apply.
2. In the first message send the "Common development instruction" in Section 7 and T00.
3. In each later message send only the next prompt ("Let's move on to SV01" is enough). Do not move on to the next stage until the acceptance criteria of a stage are met.
4. Each tool is first published when its first "acceptance" criteria are met and its guide section is written (PROJECT.md §6: a tool without a guide is not published). Publishing is a separate user decision.
5. If an unforeseen scientific decision is needed in a tool, the stage is stopped and the user is asked; do not proceed by guessing.

## 1. Common framework

### 1.1. For all tools

- The computation (`calc.js` or engine files) is separate from the interface (`ui.js`) and the texts (`i18n.js`); computation files do not touch the DOM and run in Node tests.
- Input: the shared import panel (`core/importer.js`), the Data Validator's confirmed data (`forest-dataset/1`, PROJECT.md §4b) or manual entry. The plot × period unit and its navigator (`core/unitnav.js`) are common behaviour for multi-unit data.
- Output: a single general table on screen, details in an expandable section. Excel/CSV/JSON export (`core/export.js`). The Excel "Info" sheet contains the tool, version, date, language, settings and **the sources of the coefficient sets used**.
- Result record: the principles of `dist-result/1` from the diameter distribution tool are generalised. For each computed value the status (`ok`, `invalid`, `boundary`, `noconverge`, `error`), problems and warnings as codes, units, the settings used and the id of the coefficient set are written to the record. A value that could not be computed is not shown as a number (empty or "–" and the reason).
- Units: diameter cm, height and length m, area m² (conversion to ha shown explicitly on screen), volume m³, mass kg (tree) and Mg/ha (stand), carbon Mg C/ha, CO₂ Mg CO₂/ha. Conversions are written on screen.
- The over-bark/under-bark distinction is carried with a field on every diameter and volume value (`bark: 'ob' | 'ib'`). The two are never silently mixed anywhere.
- Extrapolation: if the validity range of the coefficient set (e.g. the diameter and height range over which the equation was fitted) has been entered, trees outside it are computed but flagged **with a warning**, and their number is reported.
- Guide: for each tool an `inc/guide/tr/<tool>.php` and an `inc/guide/en/<tool>.php` file (one file per section since 17 Nov 2026; formulas are not repeated) and at least one task card in `inc/guide/cards.php`; covered by `tests/site/test_guide.mjs`.
- Citation: `v` in the `site_tools()` row and the tool's `TOOL.version` are the same (`tests/site/test_cite.mjs`).
- Test: for each scientific computation `tests/ref/make_<tool>_<stage>.py` (SciPy/NumPy; not a copy of the JS formula but an independent path: numerical integration, general optimisation, brute-force search…) and `tests/<tool>/test_<stage>.mjs`; for the interface `tests/<tool>/e2e.mjs`. New tests are added to `.github/workflows/deploy.yml`.

### 1.2. Stem measurement data: `stem-sections/1`

A second table type for section volume and taper. Each row is one measurement point of one tree.

| Field | Type | Unit | Note |
|---|---|---|---|
| `row` | integer | – | Source row number |
| `plot_id`, `tree_id`, `period` | text | – | Same id rules as the tree table (kept as text) |
| `h` | number | m | Height of the measurement point above the ground (from the **ground**, not from the felling surface; felling height is a separate field) |
| `d` | number | cm | Diameter. If there are two cross measurements, `d1`, `d2` are mapped; the combining rule is a setting (arithmetic mean or the mean of the areas: d = √((d1² + d2²)/2)) and is written in the result |
| `bark` | text | – | `ob` (over bark) or `ib` (under bark); can also be given at table level |
| `bark_t` | number | mm | Optional **double** bark thickness; if given, d_ib = d_ob − bark_t/10 |
| `kind` | text | – | Optional: `section` (section middle or end), `stump`, `dbh`, `top` |

At tree level (from the tree table or from the tree columns of the same table): `dbh` (cm), `height` (m, total height), `stump_h` (m, felling height), optional `top_d` and `top_h` (usable top). The tree table and the section table are joined by `plot_id` + `tree_id` (+ `period`); unmatched rows are counted and reported with their row numbers.

Checks (before computation, with the severity levels of the Validator): duplicate `h` on the same tree; `h` < 0 or `h` > total height; felling height greater than height; diameter **increasing** with height (increases outside the butt swell are a warning; the butt swell zone is defined as a setting, default h < 1.3 m); large difference between the diameter measured at 1.30 m and `dbh` (threshold is a setting); tree with a single measurement point (not computed).

### 1.3. Coefficient registry: `model-coef/1`

The site index, biomass, taper (and bark model) coefficient sets are kept in a shared registry.

```
{ schema: 'model-coef/1', id, tool: 'siteindex'|'biomass'|'taper'|'bark'|…, form: '<registered form id>',
  params: { <name>: number }, inputs: { <variable>: { unit, bark? } }, output: { name, unit, bark? },
  valid: { <variable>: [min, max] } | null, species, region, component?,
  transform: { kind: 'none'|'log'|'log10', correction: 'none'|'baskerville'|'snowdon'|'user', value? } | null,
  source: { citation (required), doi?, page?, table?, note? }, origin: 'user-entered'|'fitted',
  fit?: { data: 'description', n, method, rmse, created } , created, modified }
```

- **Form registry:** each tool registers the equation forms it supports (e.g. `B = a·D^b`) with an id, parameter names and an explicit formula; the user enters coefficients only for a registered form. Free formula entry (an expression parser) is not part of this package.
- **The source field is mandatory.** A statement such as "My own data, unpublished" is valid, but it cannot be left empty. The result table and the export carry the note "produced with user coefficients: <source>".
- Storage: IndexedDB (`forestbiometry` store); can be downloaded as JSON and restored. It does not go to the server.
- Fitted sets (`origin: 'fitted'`) carry the fit summary (`fit`) and can be written to the same registry.

## 2. Section volume (Stem Section Volume)

Purpose: single-tree stem volume (over bark and/or under bark) from measured section diameters, section breakdown, form factor; expansion to the hectare if plot data are available.

### 2.1. Equations

g(d) = (π/4)·(d/100)² (m², d cm). Section length L (m).

| Method | Measurement | Volume |
|---|---|---|
| Huber | d_m at the middle of the section | V = g_m·L |
| Smalian | d₁, d₂ at the two ends | V = (g₁ + g₂)/2·L |
| Newton | two ends and middle | V = L/6·(g₁ + 4g_m + g₂) |
| Hohenadl (5 sections) | 0.1H, 0.3H, 0.5H, 0.7H, 0.9H | V = (H/5)·Σ g_i (five Huber sections of equal length) |

- **Stump:** the volume between the ground and the felling height is a separate row, and whether it is included in the total stem volume is a setting (default: not included; stem from the felling height to the tip). The stump is computed as a cylinder with the diameter at the felling surface.
- **Top section (K7):** from the last measurement point to the tip; cone V = g·L/3, paraboloid V = g·L/2, neiloid V = g·L/4. If the tip height is not known, the top section is not computed and the volume is labelled "up to the last measurement point".
- **Unequal sections** are supported; each section has its own L. For Huber the measurement point must be the middle of the section; the tool states explicitly how it derives the section boundaries from the measurement points (two separate data layouts: "end measurements" and "middle measurements"; the user chooses, the tool does not guess).
- **Merchantable volume:** if the user gives a top diameter (e.g. 7 cm), the height of the point where this diameter is crossed is found by **linear interpolation** (in diameter) between two measurements; merchantable volume is up to that point. The interpolation rule is written in the result.
- **Form factor:** f₁.₃ = V / (g₁.₃·H) (not the true form factor but the breast-height form factor; the definition is written in the result). Whether V includes the stump is stated on the same row.
- **Bark:** over-bark and under-bark volume are separate columns; bark volume = difference, bark percentage = difference / over-bark volume.

### 2.2. Known behaviour (testable properties)

If the cross-sectional area changes with height as g(h) = g₀(1 − h/L)^r: r = 1 paraboloid, r = 2 cone, r = 3 neiloid. Huber, Smalian and Newton are **exact** for the paraboloid; Newton is exact for every solid whose cross-sectional area is a polynomial of at most third degree in height (including the cone and the neiloid); for the cone and the neiloid Huber underestimates and Smalian overestimates, and both approach the exact value as the number of sections increases. The numbers are in Section 8.1.

### 2.3. Prompts

### SV01 — Section volume core

~~~text
Write the section volume computation core according to TOOLS_SPEC Sections 1.2 and 2.1 (assets/lab/secvol/calc.js, DOM-free).

Implement the Huber, Smalian, Newton and Hohenadl (five sections) methods with separate ids. Support unequal section lengths. "End measurements" and "middle measurements" are two separate data layouts; the user chooses, the tool does not guess. Newton needs end and middle measurements in each section; if they are missing, that section is not computed and the reason is written.

The stump (cylinder, with the felling surface diameter) and the top section (cone, paraboloid, neiloid; default cone, labelled as a tool rule) are separate rows. If there is no tip height, the top section is not computed and the volume is labelled "up to the last measurement point".

For each tree produce the section breakdown (lower/upper height, measurement(s), length, volume, method), total volume, form factor f1.3 (with its definition) and status/problem records. Compute over-bark and under-bark volume separately; if double bark thickness is given, d_ib = d_ob − bark_t/10. The combining rule for two cross diameters is a setting and is written in the result.

Apply the data checks in Section 1.2 (duplicate h, measurement above height, diameter increasing with height, difference between the 1.30 m diameter and dbh, single measurement point).

Acceptance: the paraboloid, cone and neiloid values in Section 8.1 must pass with one and four sections at 1e−12 relative tolerance; Newton must be exact for the cone and the neiloid. Independent reference: tests/ref/make_secvol_sv01.py, the integral of the cross-sectional area function with scipy.integrate.quad and a separately written summation on random sections of unequal length. For missing/contradictory data a status and reason must be returned instead of a number.
~~~

### SV02 — Interface, tree and plot level

~~~text
Add the page (section-volume.php) and interface of the section volume tool. Steps: data (stem measurement table and optional tree table; import panel; column mapping; choice of data layout), settings (method, top section solid, whether the stump is included, diameter combining rule, merchantable top diameter), results.

Result screen: a single table per tree (tree, method, over-bark and under-bark volume, form factor, status); the section breakdown of the selected tree and the taper drawing (height–diameter, measurement points and section boundaries) in the details expandable section. If more than one method is selected, the methods are shown side by side for the same tree and the difference between them as a percentage. If a merchantable top diameter is given, merchantable volume and the height of that diameter (linear interpolation, rule written).

If the tree table has a plot field, tree volumes are summed to the hectare with the expansion factor (m³/ha); trees without section measurements are not silently included in this sum: their number and the "not measured" status are reported (completion with a volume model is not part of this stage).

Excel/CSV/JSON export, guide section (TR/EN), site_tools row (K2, K3, K4), icon; the "Tree and stem" category is added to site_cats() together with this tool. The example data are a simulation and are labelled as such (with a generator script under tests/ref).

Acceptance: in the e2e test, with example data produced from known solids, the volumes on screen are the same as the engine's; the top section and stump options change the values correctly; missing data are reported with row numbers; no horizontal scrolling at phone width; TR/EN give the same numbers.
~~~

### SV03 — Quality checks and method comparison

~~~text
Add a data quality and method difference report to the section volume tool.

For each tree report the consistency of the profile: diameters increasing with height (outside the butt swell zone setting), the distribution of section lengths, the share of the top section in total volume (warning above an adjustable threshold: it means the result is sensitive to the choice of top section solid), the difference between the 1.30 m diameter and dbh.

If more than one method was computed, give a summary of the difference between methods (per tree and in total, as a percentage). Do not declare any method "correct"; explain the known behaviour in Section 2.2 in the details expandable section.

Acceptance: for known solids the method differences are the same as in Section 8.1; warning thresholds change with the setting and are written in the result.
~~~

### SV04 — Optional: volume equation fitting

~~~text
(Optional.) From trees whose section volumes have been computed, fit the registered volume equation forms chosen by the user (e.g. V = b0 + b1·D²H; ln V = b0 + b1 ln D + b2 ln H). In the logarithmic form the back-transformation correction is an explicit option. The fitted set can be written to the coefficient registry (model-coef/1, origin 'fitted'). Provide a path to transfer to the Model Performance tool for model performance evaluation; do your own performance measure computations with the same definitions as that tool.

Acceptance: coefficients and standard errors are the same as the SciPy/statsmodels reference; in the logarithmic form the correction factor equals the value computed by hand.
~~~

## 3. Site index (Site Index)

Purpose: site index (top height at the chosen base age), site class and site index curve from top height and age; with the user's coefficients or with a dynamic equation fitted from the user's own stem analysis / remeasurement data.

### 3.1. Concepts

- **Top height:** on the platform the dominant height H0 (mean height of the 100 largest trees per hectare; Plot and Stand tool, METHODS §6). The site index tool computes H0 **with the same definition** as that tool or uses the top height given by the user; the definition is written in the result. If the curve coefficients were produced with a different top height definition, the tool cannot correct this; it is shown to the user as a note.
- **Age type (K8)** and **base age** A₀ (e.g. 50 or 100) are settings and are written in every result.
- **Dynamic (difference) equations:** H₂ = f(A₂, A₁, H₁). Desired properties: consistency H₁ = f(A₁, A₁, H₁), base-age invariance and path invariance f(A₃, A₂, f(A₂, A₁, H₁)) = f(A₃, A₁, H₁). Site index SI = f(A₀, A, H).
- The curve form can be **anamorphic** (the curves are multiples of each other) or **polymorphic**; this is a property of the form and is written in the interface.

### 3.2. Forms (initial scope)

Each form is written into METHODS.md with its parameters, which parameter is site-specific (free parameter) and the derivation of the difference equation; the derivation is verified with the identity tests below.

| Id | Base model | Difference equation (free parameter) | Type |
|---|---|---|---|
| `cr.ada.b0` | Chapman–Richards H = b₀(1 − e^(−b₁A))^b₂ | H₂ = H₁·[(1 − e^(−b₁A₂))/(1 − e^(−b₁A₁))]^b₂ (b₀ site-specific) | anamorphic |
| `cr.ada.b2` | same | H₂ = b₀·(H₁/b₀)^(ln(1 − e^(−b₁A₂))/ln(1 − e^(−b₁A₁))) (b₂ site-specific) | polymorphic |
| `schu.ada` | Schumacher ln H = b₀ + b₁/A | ln H₂ = ln H₁ + b₁(1/A₂ − 1/A₁) (b₀ site-specific) | anamorphic |
| `gada.*` | Cieszewski–Bailey GADA family | added form by form **after being read from the source** | polymorphic |

Before the GADA forms are implemented, Cieszewski and Bailey (2000) must be read; no equation was written in this document (risk of fabrication).

### 3.3. Fitting (from the user's own data)

- Data: stem analysis (the age–height series of a tree) or the top height–age series of remeasured plots. A series id (tree or plot) is mandatory.
- In difference equation fitting the **pairing scheme** affects the result: consecutive pairs, first measurement with the later ones, all pairs. The choice is a setting and is written in the result. Observations from the same series are not independent; therefore standard errors are labelled "assuming independent observations" or given by series-level bootstrap (SI04).
- Alternative: the "dummy variable" approach that estimates the site-specific parameter separately for each series; this is a separate method id and is not added until verified with a source.
- Solver: `core/nls.js` (Levenberg–Marquardt). Failure states are reported separately; a failed fit cannot be written to the coefficient registry.

### 3.4. Site classes

Classes are **user-defined**: number of classes and SI ranges at the base age (equal intervals or manual boundaries), class names (I, II, … or free). Class boundaries from yield tables are used only if the user enters them; the tool does not embed any yield table (K1).

### 3.5. Prompts

### SI01 — Dynamic equation core

~~~text
Write the site index computation core according to TOOLS_SPEC Sections 3.1–3.2 (assets/lab/siteindex/calc.js, DOM-free). Form registry: cr.ada.b0, cr.ada.b2, schu.ada. For each form H2 = f(A2, A1, H1), SI = f(A0, A, H), curve generation (H on an A grid for a given SI) and parameter validity checks.

Report undefined cases separately (e.g. 1 − e^(−b1·A) ≤ 0, H ≤ 0, A ≤ 0, a polymorphic form with H1 ≥ b0). The age type and base age must be part of the settings of every result.

Acceptance: for every form, consistency, base-age invariance and path invariance must hold in 1000 random cases at 1e−12 relative tolerance. Independent reference: tests/ref/make_siteindex_si01.py, a separate path that solves the base model for SI with scipy.optimize.brentq and computes the curve from there (without using the difference equation itself). The values in Section 8.2 must pass.
~~~

### SI02 — Site index computation with the coefficient registry, and interface

~~~text
Add the page of the site index tool (site-index.php). The user selects a set from the T01 coefficient registry or enters a new set (form, coefficients, age type, base age, top height definition, validity range, source mandatory).

Input: manual for a single tree/plot (age, top height) or a table (plot, period, age, top height). If top height is to be computed from the tree table, the H0 definition of the Plot and Stand tool is used exactly (the code is shared, not rewritten) and the definition is written in the result.

Output: SI, site class (Section 3.4; class definition from the user), curve family chart (class boundaries and observations), warnings outside the validity range. Excel/CSV/JSON, guide, site_tools row; the "Stand and site" category is added to site_cats() together with this tool.

Acceptance: in e2e the SI on screen is the same as the engine's; age type and base age are visible in the result; a set with an empty source field cannot be saved; when class boundaries change the classes change and SI does not.
~~~

### SI03 — Fitting from the user's own data

~~~text
Add difference equation fitting from stem analysis and remeasurement data according to Section 3.3. The pairing scheme (consecutive, first-with-later, all pairs) is a setting. Fitting is done with core/nls.js; starting values and the stopping criterion are written in the result. Standard errors are labelled "assuming independent observations".

Output: coefficients, RMSE and bias (same definitions as the Model Performance tool), residuals–age chart, the fitted curves drawn over the observed series. A successful set can be written to the coefficient registry (origin 'fitted', with the data summary and pairing scheme).

Acceptance: coefficients are the same as the scipy.optimize.least_squares reference at 1e−6 relative tolerance (same pairing scheme, same start); in simulated data (produced with known coefficients, noisy) the coefficients come back within a reasonable range; when the pairing scheme changes, the number of pairs is correct.
~~~

### SI04 — Uncertainty

~~~text
Add series-level bootstrap for the fitted site index model (series are resampled, not individual observations). The percentile interval of the coefficients and of SI for a given (A, H), the rate of failed replicates and the seed are written in the result. For sets entered with user coefficients, uncertainty is computed only if the source gives the covariance matrix (delta method); otherwise "no uncertainty information" is written.

Acceptance: reproducible with a fixed seed; the same results as an independent Python bootstrap implementation when the same seed and the same resampling order are used; the delta method is verified with a numerical derivative.
~~~

## 4. Stand structure and competition (Stand Structure & Competition)

Purpose: diameter/height structure per plot × period, density measures, spatial structure (if coordinates are available) and tree-level competition indices.

### 4.1. Measures

**Distance-independent (no coordinates needed):**

| Measure | Definition | Note |
|---|---|---|
| Diameter CV, skewness, kurtosis | at tree level, n divisor (definition written) | |
| Gini coefficient | over basal area (g per tree); formula and sorting direction in METHODS | Gini over diameter is a separate option with a separate label |
| Shannon diversity | H' = −Σ p ln p over diameter class proportions | class width and start are settings; written in the result |
| Species mixture | species proportions, Shannon and Simpson | if there is a species column |
| BAL | sum of the basal area per hectare of trees thicker than the tree (m²/ha) | equal diameters: whether included or not is a setting and is written |
| Relative size | d_i / Dq or g_i / mean g | |
| SDI (Reineke) | SDI = N·(Dq/25)^β, default β = 1.605, user can change | metric reference diameter 25 cm; the source of β is written |
| Relative spacing (Hart–Becking) | S% = 100·a/H0; for square planting a = √(10000/N), for triangular planting a = √(2·10000/(N√3)) | the choice of planting pattern is written |
| Curtis relative density | RD = G/√Dq | units are written |

**Spatial (requires x, y and the plot boundary):** Clark–Evans R (without edge correction and with the Donnelly correction), uniform angle index W, mingling M, diameter differentiation T, dominance U (k = 4 nearest neighbours by default, k is a setting), Hegyi competition index CI_i = Σ_j (d_j/d_i)/dist_ij (neighbours within radius R or the k nearest; the choice is written).

**Edge effect:** the options are "no correction", "buffer" (trees within a given distance of the boundary act only as neighbours, no index is computed for them) and, for rectangular plots, "toroidal translation". The choice is written in every result; without correction, edge trees are flagged separately.

The plot geometry (circle: centre and radius; rectangle: corners) is given by the user. Coordinates outside the plot are reported with their row numbers.

### 4.2. Prompts

### SS01 — Distance-independent structure and density

~~~text
Write the distance-independent measures in TOOLS_SPEC Section 4.1 (assets/lab/structure/calc.js, DOM-free). The plot × period unit and the expansion factor have the same definitions as in the Plot and Stand tool; the code is shared, not rewritten. The definition, units and options of each measure (class width, equal diameters rule, Reineke exponent, planting pattern) are written to the result record.

Acceptance: the values in Section 8.3 must pass. Independent reference tests/ref/make_structure_ss01.py: for Gini the equality of a separate formula (mean absolute difference / 2·mean) and the sorted formula; for Shannon scipy.stats.entropy; for BAL a brute-force double loop; weighted computations (with expansion factor).
~~~

### SS02 — Spatial structure

~~~text
Add the spatial measures in Section 4.1: Clark–Evans (uncorrected and Donnelly), W, M, T, U and the edge effect options. Plot geometry from the user; coordinates outside the plot are reported as problems. Neighbour search with a k-d tree or a grid; with n ≥ 10 000 trees the browser must not freeze (Web Worker if needed).

Acceptance: known values on a regular grid (Section 8.3: R = 2 on a square grid, R = 2.1491 on a hexagonal grid; W = 0 with four neighbours on a square grid); in a Poisson simulation, the expected behaviour of the uncorrected R (deviation above 1 because of the edge effect) and that the Donnelly correction reduces it are shown; independent reference a separately written Python implementation with scipy.spatial.cKDTree.
~~~

### SS03 — Competition indices

~~~text
Add tree-level competition indices: distance-independent (BAL, relative size) and distance-dependent (Hegyi; radius or k nearest neighbours). The edge effect options are the same as in SS02. The output is written to Excel as columns appended to the tree table (source rows unchanged, with the "export appended to the tree data" layout of the Plot tool).

Acceptance: Hegyi is the same as a brute-force double loop; with the buffer option, trees in the buffer get no index but are counted as neighbours; two trees at the same position (dist = 0) are reported as a problem, no infinite index is produced.
~~~

### SS04 — Interface and charts

~~~text
Add the page of the stand structure tool (stand-structure.php): data (tree table or confirmed data; coordinates optional), settings (measure groups, plot geometry, edge effect, k and radius), results (general table per unit; in the details a diameter class histogram, Lorenz curve and, if coordinates are available, a stem map coloured by competition index). Navigator (core/unitnav.js), Excel/CSV/JSON, guide, site_tools row.

Acceptance: in e2e the values are the same as the engine's; for data without coordinates the spatial measures are shown with the "no coordinates" status, not empty or zero; phone and dark theme check.
~~~

## 5. Biomass and carbon (Biomass & Carbon)

Purpose: component biomass (stem, branches, foliage/needles, roots…), carbon and CO₂ equivalent at single-tree and stand level; with the user's coefficients.

### 5.1. Approaches

**A. Allometric equations (tree level).** Registered forms (initial scope):

| Id | Form |
|---|---|
| `pow.d` | B = a·D^b |
| `pow.dh` | B = a·D^b·H^c |
| `pow.d2h` | B = a·(D²H)^b |
| `lin.d2h` | B = a + b·D²H |
| `log.d` | ln B = a + b·ln D |
| `log.dh` | ln B = a + b·ln D + c·ln H |

In the logarithmic forms the back-transformation correction is an explicit choice: none; Baskerville CF = exp(SEE²/2) (SEE from the source, on the natural logarithm scale); Snowdon ratio (from the source); user-defined factor. Equations given with log10 are kept with a separate `transform.kind`; they are not silently converted to ln. Each component is a separate coefficient set; if the "total" is also a separate equation, its difference from the sum of the components is shown as a warning (additivity is not guaranteed).

**B. Conversion from volume (stand or tree).** B = V × ρ × BEF × (1 + R): V stem volume (m³; from the Section volume tool or entered manually; the Plot and Stand tool has no volume computation, T00 §5), ρ basic wood density (Mg dry matter / m³ fresh volume), BEF biomass expansion factor (stem → above-ground), R root/shoot ratio. All are user input (K1). Whether the volume is over bark or under bark and which of the two the coefficients are defined with must match; if they do not match, nothing is computed.

**Carbon:** C = B × CF (CF per component from the user), CO₂ = C × 44/12. At stand level Mg/ha with the expansion factor.

### 5.2. Prompts

### BC01 — Biomass core and coefficient forms

~~~text
Write the biomass and carbon computation core according to TOOLS_SPEC Section 5.1 (assets/lab/biomass/calc.js). Allometric forms with registered ids; in the logarithmic forms the correction options and the log10/ln distinction are explicit. The conversion-from-volume approach is a separate method. Carbon and CO2 conversions. Result per component, total, additivity difference.

Trees outside the validity range are computed and get a warning; their number is reported. Missing height (in forms that need H) is a "not computed" status; height prediction is done in the Height–Diameter tool and predicted heights are flagged separately with height_source; the result states how many trees were computed with predicted height.

Acceptance: hand-verifiable values for each form (Section 8.4); the Baskerville factor with exp(s²/2); the log10 form is the same as an independent Python reference computed by converting it to the ln form; units (kg tree, Mg/ha stand) are tested.
~~~

### BC02 — Interface

~~~text
Add the page of the biomass and carbon tool (biomass-carbon.php). Data: tree table or confirmed data; species mapping (data species code → coefficient set; unmapped species are reported, not silently computed with another species' equation). Settings: approach, components, coefficient sets (from the T01 registry), carbon fractions. Result: component biomass, carbon, CO2 (Mg/ha) per plot × period; export appended to the tree table; which coefficient set each number comes from.

Acceptance: in e2e the values are the same as the engine's; unmapped species and missing height cases with row numbers; the source field on the Excel "Info" sheet.
~~~

### BC03 — Link with the section volume tool

~~~text
For the conversion-from-volume approach, add reading the tree volumes of the Section volume tool as input via browser storage (the Plot and Stand tool has no volume computation; T00 §5) (written to the 'derived' part of forest-dataset/1 with a new version number; the schema change is recorded in PROJECT.md §4b). Over-bark/under-bark matching is mandatory.

Acceptance: for the same trees the two paths (allometric and from volume) are on separate rows; in the transfer between tools the values are bit-identical; the old schema version can be read.
~~~

### BC04 — Optional: uncertainty

~~~text
(Optional.) If the coefficient covariance and residual variance are given in the source, uncertainty at tree and plot level by Monte Carlo. If they are not given, no computation is done and "no uncertainty information" is written. The seed, number of replicates and assumptions (normal error, independence) are written in the result.
~~~

## 6. Taper and product volume (Taper & Assortment)

Purpose: with a taper equation, the diameter at any height, the height of any diameter, piece volumes and a user-defined product (assortment) breakdown.

### 6.1. Taper equations

Initial scope, forms to be added after their source has been read:

| Id | Form | Note |
|---|---|---|
| `mb76` | Max and Burkhart (1976) segmented polynomial: y = d²/D², x = h/H; y = b₁(x − 1) + b₂(x² − 1) + b₃(a₁ − x)²·I₁ + b₄(a₂ − x)²·I₂, I_i = 1 (x ≤ a_i) | volume integral in closed form; **reference and form to be verified from the source [D]** |
| `kozak04` | Kozak (2004) variable-exponent model | the form was not written in this document; to be taken verbatim from the source |

- d(h) is defined over bark or under bark (`output.bark` of the coefficient set). The bark model is a separate coefficient set (`tool: 'bark'`).
- Volume: V(h₁, h₂) = (π/40000)·∫ d(h)² dh. The closed form if there is one, otherwise adaptive Gauss–Legendre; the two are compared in the test.
- Height of a given diameter: root of the equation d(h) = d* (Brent; if d(h) is not decreasing with height there may be several roots, all are reported).
- Consistency checks (depending on the form): d(H) = 0, d(1.3) ≈ D (not exact in some forms; the difference is reported).

### 6.2. Product breakdown (assortment)

- Product definition (user): name, minimum small-end diameter (over bark/under bark), length (fixed, or minimum–maximum and step), trim allowance (trim, cm), priority and optional unit value (currency from the user; the tool does not suggest prices).
- Stump height and merchantable top diameter are settings.
- Algorithms: (1) **priority order (greedy):** starting from the butt, the next highest-priority product as long as it fits; (2) **maximum value (dynamic programming):** on a grid of stem length steps (default 0.1 m, setting), the bucking that maximises the sum of product values. The two are separate methods; the chosen method and step are written in the result.
- Output: pieces per tree (lower/upper height, small-end diameter, length, volume, product), total volume and count per product, residual (unusable) volume.

### 6.3. Prompts

### TP01 — Taper core

~~~text
Write the taper core according to TOOLS_SPEC Section 6.1 (assets/lab/taper/calc.js). First read the Max and Burkhart (1976) source; compare the form and the parameter names with the source and mark it [B] in METHODS.md. If the source cannot be read, do not add the form; inform the user. d(h), h(d), V(h1, h2), application of the bark model, consistency checks.

Acceptance: the closed-form volume and the numerical integral agree within 1e−10 relative; the h(d) root gives back d(h) within 1e−10; independent reference tests/ref/make_taper_tp01.py (scipy.integrate.quad, brentq; Python with the equation written separately). Kozak (2004) is added only after its source has been read, in a separate sub-stage with the same acceptance criteria.
~~~

### TP02 — Taper equation fitting

~~~text
Add taper equation fitting from stem measurement data (stem-sections/1, same import as the Section volume tool) (core/nls.js). Measurements of the same tree are not independent: standard errors are labelled "assuming independence"; mixed-effects fitting is not part of this package. Output: coefficients, RMSE and bias (by height class), residual plots, a per-tree comparison of the taper integral volume with the Newton/Smalian volumes of the Section volume tool. A successful set can be written to the coefficient registry.

Acceptance: coefficients are the same as scipy.optimize.least_squares within 1e−6 relative; in simulated data produced with known coefficients the coefficients come back.
~~~

### TP03 — Product breakdown

~~~text
Add the product breakdown according to Section 6.2: priority order and dynamic programming methods, trim allowance, stump, merchantable top diameter. Product definitions can be saved and loaded as JSON.

Acceptance: on small examples (≤ 8 m stem, 0.5 m step) dynamic programming finds the same maximum value as a brute-force search that tries all bucking combinations (independent Python reference); the sum of the piece volumes + residual volume = total stem volume (1e−10); the small-end diameter of each piece is not smaller than the product's minimum diameter.
~~~

### TP04 — Interface

~~~text
Add the page of the taper tool (stem-taper.php): choice of a coefficient set or fitting; single tree (D, H) or tree table input; taper chart (over bark and under bark), piece drawing (products coloured and patterned; not relying on colour alone), product summary table, Excel/CSV/JSON, guide, site_tools row.

Acceptance: in e2e the values are the same as the engine's; when the product definition changes, the breakdown changes; phone and dark theme check.
~~~

### TP05 — Optional: stand-level product table

~~~text
(Optional.) Break down all trees of the plot tree table and produce a product table expanded to the hectare (product × diameter class). Trees without measured height are used with the predictions of the Height–Diameter tool only if the user chooses so, and are flagged separately.
~~~

## 7. Common development instruction

Send together with T00 in the first message:

~~~text
We will add the five new tools in TOOLS_SPEC.md to the platform in stages. CLAUDE.md, PROJECT.md (especially §5 common rules and §6 interface principles) and METHODS.md are binding. First review the existing code; reuse the existing core (import, navigator, charts, export, nls, roots, quad, stats), do not rewrite it.

In each message implement only the scope of the prompt given. Do not fabricate species/region coefficients, yield tables, carbon fractions, wood densities or sources; coefficients are entered by the user (TOOLS_SPEC K1). Before implementing a source's equation, read the source and mark it [B] in METHODS.md; if you cannot read it, stop and report.

Computation is separate from the interface. Verify each scientific computation with an independent reference (Python generator under tests/ref + test under tests); do not settle for tests that only repeat your own function. Do not show a value that could not be computed as a number. Over bark/under bark, age type, units and the chosen rules must be written in every result.

At the end of each stage: changed behaviour, tests run, known limitations; METHODS.md and PROGRESS.md are updated, separate commit. Publishing (merging into main) is a separate user decision; all tests are run before pushing.
~~~

### T00 — Review (no code changes)

~~~text
Review the existing code for the five tools in TOOLS_SPEC and write the report docs/TOOLS_T00.md: core modules to be reused and their gaps; computations in the Plot and Stand tool that must be shared (expansion factor, H0, D0, unit × period grouping) and the smallest change needed to make them shareable; the effect of the forest-dataset/1 contract and the new stem-sections/1 and model-coef/1 contracts on the existing code; effects on the site_cats/site_tools/guide/citation tests; a list of any conflicts with the Section 0 decisions. Do not change code.
~~~

### T01 — Shared infrastructure: coefficient registry and stem measurement contract

~~~text
Implement TOOLS_SPEC Sections 1.2 and 1.3: the model-coef/1 registry (core/coef.js: validation, storage in IndexedDB, JSON import/export, mandatory source field, form registry interface) and the shared coefficient set editor component (core/coef-ui.js; shows the formula of the form and takes the parameters, units, validity range, transformation/correction and source). The stem-sections/1 reader and its checks (core/stems.js). Listing by key prefix in core/store.js; bark thickness (mm) and age in core/num.js UNITS; move the multiple-root scanner (scanRoots) of the distribution engine to core/roots.js without changing its behaviour. The Plot tool functions to be shared (validateDataset, buildUnits, unitMetrics, dominantWeights/dominant, class functions, tableToDataset) are not moved: the new tools import them directly from ../stand/calc.js; the input/output contract of these functions is written into METHODS §6 (T00 §2). Make the fixed tool count in tests/site/test_guide.mjs and test_cite.mjs read from the site_tools() rows. Sidebar categories are not added at this stage; each category is added with its first tool (SV02, SI02) (T00 §5).

Acceptance: the model-coef/1 validator rejects invalid sets (no source, unknown form, missing parameter, no unit); the JSON round trip is bit-identical; the stem-sections checks produce a problem with a row number for every case in Section 1.2; the coefficient editor passes a browser test on an unpublished test page; the distribution, Plot and site tests pass unchanged.
~~~

## 8. Independent numerical references

These values were computed on 12 Nov 2026 with Python (SciPy 1.18.1, NumPy 2.5.3). They do not belong to the code on the site; they are the references against which the code to be developed will be compared.

### 8.1. Section volume: known solids

Butt diameter 30 cm, height L = 20 m; g(h) = g₀(1 − h/L)^r. Volumes in m³.

| Solid | Exact | Huber (1 section) | Smalian (1) | Newton (1) | Huber (4 × 5 m) | Smalian (4 × 5 m) |
|---|---:|---:|---:|---:|---:|---:|
| Paraboloid (r = 1) | 0.706858347058 | 0.706858347058 | 0.706858347058 | 0.706858347058 | 0.706858347058 | 0.706858347058 |
| Cone (r = 2) | 0.471238898038 | 0.353429173529 | 0.706858347058 | 0.471238898038 | 0.463875790257 | 0.485965113602 |
| Neiloid (r = 3) | 0.353429173529 | 0.176714586764 | 0.706858347058 | 0.353429173529 | 0.342384511856 | 0.375518496874 |

Hohenadl (five sections) on the cone: 0.466526509058 m³.

### 8.2. Site index: identities

Property tests instead of numerical values (each form, 1000 random cases): f(A₁, A₁, H₁) = H₁; f(A₃, A₂, f(A₂, A₁, H₁)) = f(A₃, A₁, H₁); between SI₅₀ and SI₁₀₀, f(100, 50, SI₅₀) = SI₁₀₀. The reference script produces the same values from the base model (without using the difference equation).

### 8.3. Stand structure

| Case | Value |
|---|---:|
| SDI, N = 800 trees/ha, Dq = 20 cm, β = 1.605 | 559.177149815208 |
| Hart–Becking S%, N = 800, H0 = 20 m, square planting | 17.677669529664 |
| Hart–Becking S%, same, triangular planting | 18.995892141290 |
| Clark–Evans R, infinite square grid | 2 |
| Clark–Evans R, infinite hexagonal grid | 2.149139863647 |
| W, square grid, k = 4, standard angle 72° | 0 |

The grid values are for the case without edge effect (or with toroidal correction).

### 8.4. Biomass and carbon

| Case | Value |
|---|---:|
| CO₂/C molar mass ratio | 44/12 = 3.666666666667 |
| Baskerville factor, SEE = 0.2 (ln scale) | exp(0.02) = 1.020201340027 |

Test values for the allometric forms themselves are produced in the independent reference script (`tests/ref/make_biomass_bc01.py`) with random coefficients and trees; no fixed coefficients are given here (so as not to give the impression of a real species' coefficients).

## 9. Sources (all [D]: not read, references from knowledge; to be read before implementation)

- Avery, T.E., Burkhart, H.E. *Forest Measurements* (5th edition, 2002). Section formulas, form factor, site index concepts. (Textbook-definition exception for the Huber, Smalian and Newton formulas, 12 Nov 2026 user decision: METHODS §14. Hohenadl: Heger 1965 read [B].)
- Kershaw, J.A., Ducey, M.J., Beers, T.W., Husch, B. *Forest Mensuration* (5th edition, 2016). Section volume, taper, stand density.
- West, P.W. *Tree and Forest Measurement* (2nd edition, 2009). Section formulas, biomass.
- Burkhart, H.E., Tomé, M. *Modeling Forest Trees and Stands* (2012). Site index (difference equations), taper, competition indices.
- Bailey, R.L., Clutter, J.L. 1974. Base-age invariant polymorphic site curves. *Forest Science* 20: 155–159.
- Cieszewski, C.J., Bailey, R.L. 2000. Generalized algebraic difference approach: theory based derivation of dynamic site equations with polymorphism and variable asymptotes. *Forest Science* 46: 116–126.
- Clark, P.J., Evans, F.C. 1954. Distance to nearest neighbor as a measure of spatial relationships in populations. *Ecology* 35: 445–453.
- Donnelly, K.P. 1978. Simulations to determine the variance and edge effect of total nearest-neighbour distance. (Hodder, I. (ed.), *Simulation Studies in Archaeology*, Cambridge University Press.)
- Pommerening, A. 2002. Approaches to quantifying forest structures. *Forestry* 75: 305–324. (W, M, T, U and edge corrections.) (SS02: Clark–Evans, Donnelly and Pommerening implemented under a temporary definition exception, 12 Nov 2026 user decision; to be verified when the sources are uploaded.)
- Hegyi, F. 1974. A simulation model for managing jack-pine stands. (Fries, J. (ed.), *Growth Models for Tree and Stand Simulation*, Royal College of Forestry, Stockholm.)
- Reineke, L.H. 1933. Perfecting a stand-density index for even-aged forests. *Journal of Agricultural Research* 46: 627–638. (Read [B], METHODS §16.)
- Curtis, R.O. 1982. A simple index of stand density for Douglas-fir. *Forest Science* 28: 92–94. (Read [B], METHODS §16. Hart–Becking relative spacing: definition exception, 12 Nov 2026 user decision.)
- Max, T.A., Burkhart, H.E. 1976. Segmented polynomial regression applied to taper equations. *Forest Science* 22: 283–289.
- Kozak, A. 2004. My last words on taper equations. *The Forestry Chronicle* 80: 507–515.
- Baskerville, G.L. 1972. Use of logarithmic regression in the estimation of plant biomass. *Canadian Journal of Forest Research* 2: 49–53.
- Sprugel, D.G. 1983. Correcting for bias in log-transformed allometric equations. *Ecology* 64: 209–210.
- Snowdon, P. 1991. A ratio estimator for bias correction in logarithmic regressions. *Canadian Journal of Forest Research* 21: 720–724.
- IPCC 2006. *2006 IPCC Guidelines for National Greenhouse Gas Inventories*, Volume 4 (AFOLU), Chapter 4 (Forest Land). Concepts of conversion from volume to biomass and carbon fraction; their default values are not embedded in these tools (K1).
- Pnevmaticos, S.M., Mann, S.H. 1972. Dynamic programming in tree bucking. *Forest Products Journal* 22(2): 26–30.
