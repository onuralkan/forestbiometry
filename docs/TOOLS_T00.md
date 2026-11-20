# T00: review of the existing code for the new tools

Date: 12 Nov 2026. Scope: `docs/TOOLS_SPEC.md` (K1–K9 approved) and `main` @ `0fa667d` (diameter distribution 2.1.0). **No code was changed** at this stage.

## 1. Core to be reused

| Module | What it provides | Use in the new tools | Missing |
|---|---|---|---|
| `core/importer.js`, `core/table.js`, `core/num.js` | CSV/TSV/XLSX reading, delimiter/encoding, decimal setting and evidence, unit conversion (`UNITS`) | All tools; the stem measurement table (`stem-sections/1`) is also read with this panel | `UNITS` has diameter (cm/mm), height, area, xy; there is no unit for **bark thickness in mm** or for age (added in T01) |
| `core/store.js` | IndexedDB key–value (`forestbiometry`/`kv`), in-memory fallback | Sessions, confirmed data; new key namespace `coef:` for the coefficient registry | The key list is in the comment at the top of the file; new keys must be written there |
| `core/export.js` | CSV (`,`/`.`), multi-sheet XLSX, JSON | All tools | – |
| `core/unitnav.js` | Plot navigator | Site index, structure, biomass (multi-unit data) | – |
| `core/chart.js` | bar, scatter, continuous axis (line/step/point), radar | Taper (`plotChart` line + point), site index curve family, Lorenz curve, histogram | **No stem map** (coordinates, circle by size, marker by value): SS04 needs a new `mapChart`. The section breakdown drawing (horizontal stem, section boundaries) is also new |
| `core/nls.js` | Levenberg–Marquardt, covariance σ̂²(JᵀJ)⁻¹, delta method, OLS | SI03 (site index fitting), TP02 (taper fitting), SV04 | The model object requires an **analytic gradient** (`grad(θ, x)`); gradients are written for the site index difference equations and taper forms, or a numerical derivative option is added (decision in T01/SI03; compared with the numerical derivative in the test) |
| `core/roots.js` | Brent, geometric bisection | SI01 (solving the base model for SI), TP01 (h(d)) | The multiple-root scanner is in `dist/recover/weibull.js` (`scanRoots`); it will also be needed for taper → can be moved to `core/roots.js` (without changing behaviour) |
| `core/quad.js` | Gauss–Legendre nodes, expected value under the normal | TP01 volume integral | **No adaptive integral on a finite interval**: composite Gauss–Legendre + error estimate (e.g. difference between 10 and 20 nodes) should be added |
| `core/optim.js` | Nelder–Mead | Fallback optimisation | – |
| `core/stats.js` | distributions, `rng`, `shuffle` | Seeded generator for SI04, BC04 bootstrap/Monte Carlo | – |
| `core/citation.js`, `cite-ui.js` | Citation dialog | New tools automatically via their `site_tools()` row | – |
| Web Worker pattern | `dist/boot-worker.js`, `dist/stand-worker.js` | SS02 (neighbour search on 10 000+ trees), SI04, BC04 | There is no shared worker helper; each tool writes its own worker (the pattern in the distribution tool is taken as the model) |

## 2. What to share from the Plot and Stand tool

`assets/lab/stand/calc.js` is already DOM-free and can be imported from outside (the Model Performance tool imports `classIndex` and `classesFromBreaks` from it). Functions to share:

| Function | What it does | Tool that will use it |
|---|---|---|
| `validateDataset`, `periodsOf`, `statusesOf` | `forest-dataset/1` validation, periods, statuses | all |
| `buildUnits` | plot × period units (including the empty/unmeasured merge rule) | SI, SS, BC |
| `unitMetrics` | N/ha, G/ha, Dq, species shares, measured/predicted height distinction, age, D0/H0 | SI (H0), SS (N, Dq, G), BC (expansion) |
| `dominantWeights`, `dominant` | the 100 largest trees per hectare (fractional k, sharing on ties; for height only measured heights) | SI02 (H0), SS |
| `classesFromBreaks`, `breaksFromWidth`, `classIndex` | half-open diameter classes | SS01 (Shannon), BC |
| `tableToDataset` | raw table → `forest-dataset/1` (direct loading path) | SI, SS, BC (loading without the Validator) |

**Smallest change:** no move is needed. The new tools import these functions directly from `../stand/calc.js` (as Model Performance does). The item "move to a shareable module" in TOOLS_SPEC T01 is therefore **unnecessary**: moving would change the file layout of the Plot tool and bring no benefit. Proposal: in T01, instead of moving, write the public contract (input/output) of these functions into METHODS §6 and test the new tools against this contract.

Two points to watch:
- The expansion factor is only for **fixed-area** plots (EF = 10000/A; no nested plots and no Bitterlich, as written at the top of the file). The structure and biomass tools inherit this limitation and must state it on screen.
- The diameter distribution tool's own unit builder (`dist/data.js` `extractUnits`) reads only diameter from the raw table; it is not suitable for the new tools. The two unit builders stay side by side; the new tools use the `buildUnits` + `tableToDataset` path.

## 3. Data contracts

### 3.1. `forest-dataset/1`
- For site index the `age` field **exists** (tree level; filled by the Plot tool's direct loading, not mapped by the Validator). **There is no field for age type (K8).** Proposal: the age type should be part of the setting in the site index tool, not of the dataset (this is how K8 "chosen explicitly for each dataset" is satisfied); the schema does not change.
- The `x`, `y` fields exist (mapped by the Validator, unit m). **What the coordinates are relative to (plot centre or a common system) and the plot geometry (circle/rectangle, centre, radius, corners) are not in the contract.** SS02's edge correction depends on them. Proposal: the geometry is entered as a **setting** in the stand structure tool (a table per plot or common to all); `forest-dataset/1` does not change. If it is later added to the Validator, `forest-dataset/2` is needed.
- `height_source` (measured/predicted) exists; in biomass the "number of trees computed with predicted height" (BC01) is read from this field.

### 3.2. `stem-sections/1` (new)
- The Validator does not support a second table type (stem measurements); it is built around the tree and plot tables (`FIELDS = { trees, plots }`). Proposal: the stem measurement table is read in the section volume and taper tools **with their own mapping screen** (like the raw table approach of the diameter distribution tool); the checks are shared in `core/stems.js`. Adding it to the Validator is a separate, later task.
- Tree-level fields (dbh, height, felling height) can have two sources: columns of the same table or the confirmed tree table. The join key is `plot_id` + `tree_id` (+ `period`); ids are text (Validator rule).

### 3.3. `model-coef/1` (new)
- It can be kept in the store with `coef:<id>` keys or as a single `coef:library` object. Proposal: **one key per record** (`coef:<id>`), because `store.js` offers no list/key scan function; in that case an index key (`coef:index`) is also needed. Alternative: add listing by key prefix to `store.js` (a small, tested change). To be decided in T01; the second is cleaner.

## 4. Site shell, guide and tests

| Place | Effect |
|---|---|
| `inc/site.php` `site_cats()` | There are 4 categories (data, inventory, dist, model); the two categories in K3 are added (with ids such as `tree`, `site`). It must be checked whether a category with no tools appears empty on the home page: a category should not be added until its first tool is added (the T01 text says "add the categories"; **a category without tools produces an empty heading**, so each category must be added together with its first tool) |
| `site_tools()` | One row per tool (`cat`, `icon`, `short`, `file`, `v`, `lab`) |
| `site_icon()` | Five new icons (line, 24 × 24) |
| `tests/site/test_guide.mjs` | The tool count is **hard-coded** (`tools.length === 7`); updated with each new tool or generalised to "as many as the site_tools rows". The list of labels named in the guide is extended per tool |
| `tests/site/test_cite.mjs` | The tool count is fixed (`rows.length === 7`); the version is read from the `export const TOOL = { id: '…', version: '…' }` line in `assets/lab/<lab>/calc.js` (only `dist` is an exception). New tools must define `TOOL` in `calc.js` in this form |
| `tests/site/e2e.mjs` | Sidebar and home page checks; assumptions about the number of categories must be checked |
| `.github/workflows/deploy.yml` | Tests are listed one by one; each new test file must be added |
| `inc/guide/tr/<tool>.php`, `inc/guide/en/<tool>.php` (since 17 Nov 2026; before that `tr.php`, `en.php`) | A section file for each tool (id = file name); a tool without a guide is not published |

## 5. Points that conflict with TOOLS_SPEC or need correcting

1. **BC03 and Section 5.1-B, "user volume in the Plot tool":** the Plot and Stand tool has **no volume computation** (there is no volume in `stand/calc.js`; METHODS §1 lists it as "to be rewritten in later modules"). For the volume-to-biomass path, the volume source is for now only the Section volume tool and manual entry. This wording should be corrected in the specification (decision: user).
2. **T01, "Move the Plot computations to a shareable module":** unnecessary (Section 2). Direct import instead of moving.
3. **T01, "add the categories to site_cats() (the tools are not added yet)":** a category without tools produces an empty heading. A category should be added together with its first tool (SV02 and SI02).
4. **SS02 plot geometry:** not in the data contract; it is entered as a setting of the tool (Section 3.1). The specification says "the user provides it", so there is no conflict; it only needs to be made clear that its place is a setting.
5. **Gradient:** `core/nls.js` requires an analytic gradient; this is not stated in the SI03 and TP02 prompts. Proposal: in the form registry each form carries its analytic gradient and the test compares it with the numerical derivative.
6. **Adaptive integral** is missing from `core/quad.js`; it should be added for the TP01 wording "if there is no closed form, adaptive Gauss–Legendre" (within the scope of TP01).

None of these conflicts with the K1–K9 decisions; 1–3 require the specification text to be corrected.

## 6. Proposal: updated scope of T01

- `core/coef.js` (+ listing by prefix in `store.js`), `core/coef-ui.js`, `core/stems.js`, bark thickness (mm) and age in `UNITS`.
- Moving `scanRoots` to `core/roots.js` (the distribution tests must pass unchanged).
- Reading the tool count in `test_guide.mjs` and `test_cite.mjs` from `site_tools()` (instead of the fixed 7).
- The Plot functions are not moved; their contracts are written into METHODS §6.
- The categories are not added in T01; they are added with their first tools.
