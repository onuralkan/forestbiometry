# forestbiometry.online: working rules

Rules that are in force. The full decision history (dates, release stories, scope changes, exceptions) is in `docs/DECISIONS.md` (the former CLAUDE.md, frozen 21 Nov 2026); grep it when a past decision matters, do not read it whole.

## What to read (21 Nov 2026, user decision: keep agent context small)
- Always: `docs/PROJECT.md` (architecture, data contract, shared rules) and `docs/PROGRESS.md` (short: current state, active branches, next step, open gaps).
- Only the section you need: `docs/METHODS.md` (320 KB; one `## N.` section per tool, find it with grep), the binding specs `docs/DIST_SPEC.md` §0, `docs/TOOLS_SPEC.md` §0 (K1–K9), `docs/PLATFORM_PLAN.md` (P1–P8).
- Never whole: `docs/PROGRESS_ARCHIVE.md`, `docs/DECISIONS.md` (grep them).

## Product
- Independent **Forest Biometrics Tools**, brand name exactly **Forest Biometry** (`site_ctx()['site']`; "Forest Biometrics Tools" is the subtitle `site_ctx()['sub']`). Author and responsible person Onur Alkan. Mark "03 / STAND" in `assets/brand/`, on pages `site_mark()`. Citation texts, CITATION.cff, .zenodo.json and the README title keep the name "Forest Biometrics Tools" (English only since 23 Nov 2026, user decision). The old onuralkan.com.tr personal site is closed (last state commit `8a002d2`).
- **English only.** `lang()` returns `en`; `?lang=tr` gets a 301 without the parameter; no language switch. The Turkish code was removed on 21 Nov 2026 (stage 2: no `tr` dictionaries, no `$tr`/`lang === 'tr'` branches, no `inc/guide/tr/`); do not add language branches back. `lang` in `core/i18n.js` is the constant `'en'`. New code, texts and all Markdown files are in English, even though the user writes in Turkish. Data import still reads Turkish input (decimal comma, Turkish column names).
- Catalogue: 11 module ids / 74 tool ids in `inc/catalog.php` (permanent ids `MODULE-NN`; sidebar, index and `tools.php` are drawn from it). Out-of-scope ids stay as `out`, are not shown and are never proposed again under another name. No planned tools remain. New stages are named `<ID>/a<n>`.
- Every tool page has the red **Delete all data and reset the site** button (`core/reset-all.js`); a new browser store or preference must be added there too.

## Scientific rules
- Calculation (`calc.js`) is separate from the interface. No data, coefficient, source or personal detail is made up. No built-in species/regional coefficients, yield tables, wood densities or carbon fractions (the user enters them with a required source field, `model-coef/1`).
- Each source is marked in METHODS.md (legend and full [P]/[A] conditions at its top): [B] checked in the primary source, [İ] record verified via a secondary source's reference list, [P] equation form from a CRAN package help page, test reference = that package's output (`tests/ref/*.R`, run by the user; no package code or data copied), [A] peer-reviewed secondary source citing the original, needing two independent secondary sources or a numerical check, [D] not verified. Nothing is implemented before its source is [B], [P] or [A] (definition-only exceptions are listed in DECISIONS.md).
- A distribution/method/equation is not added to a tool before it passes an independent reference test. The beta number of a tool rises with every release that changes what it computes.
- Terminology: "fit" (model), "estimation" (parameters), "prediction" (values; random effects are predicted); e = y − ŷ everywhere; top height H0 = mean height of the 100 tallest trees/ha; dominant diameter D0 = mean diameter of the 100 thickest trees/ha; minimum diameter is Dmin; sample data are "simulated".
- References: `references.php`, APA 7; a source added to METHODS also goes to `docs/kaynakca.json` (the only file edited by hand); then run `node scripts/kaynakca.mjs`, which builds `inc/kaynakca.json` (leaves out references whose every `tools` entry says "archived"; CI checks `--check`). Missing fields stay null.
- The free-formula parser `core/expr.js` is only used in SM-02/03/04.

## Code and tests
- PHP 7.4 compatible (also 8.x). No server-side data, database, API or user account; data never leave the browser. **One exception (21–22 Nov 2026, user decisions):** optional accounts (ORCID sign-in only, approved by the administrator) with the AI interpretation service (30 per account per month) and saved analysis results and interpretations for their owner (`inc/account.php`, `inc/backup.php`, `auth/`, `api/interpret.php`, `api/library.php`, `account.php`, `administration.php` (administration panel), `privacy.php`, client `core/interpret.js`, `core/record-ui.js`; private config, SQLite and backups outside the web root, never committed; details PROJECT.md §3). **Raw data are never sent to or kept on the server** (the server refuses run records with input data); only run-record summaries, on the user's request. Tree-level result tables in a record (e.g. Stand Structure, Stem Taper) may repeat measured values; they are accepted and the privacy notice says so (22 Nov 2026, user decision). `data/`, `files/` and secrets are never committed.
- In a turn only the module/prompt the user sent is implemented; finished modules are not rewritten.
- Tests: numeric `node tests/<tool>/test_*.mjs` (old code `node legacy/test_math.js`, references in `tests/ref/`), browser `tests/*/e2e*.mjs` via `scripts/e2e.sh` with `php -S` (and `FB_BUNDLE=1 php -S …`). **Locally run only the tests of the tool(s) you changed plus `tests/site/`** (21 Nov 2026, user decision); the full suite runs in CI before every upload and blocks the upload if anything fails.
- If `assets/lab/` changed, regenerate `assets/build/` with `node scripts/bundle.mjs` and commit it (CI checks `--check`).

## Git, branches, publishing
- Several agents work in parallel. Before starting, merge `main` into your branch (no rebase) and add/update your row in the "Active branches" table of PROGRESS.md. On conflicts in `inc/site.php`, `inc/catalog.php`, `inc/home.php`, `inc/guide/*` run `tests/site/e2e.mjs` and `tests/site/test_guide.mjs`.
- Push to `main` = going live (GitHub Actions: tests, browser tests, R code check, then upload through the cPanel API; `.github/workflows/deploy.yml`). Push to `main` only when the user says so ("yayına al"). Nothing is deleted on the server. Fallback: `scripts/build-zip.sh` + cPanel.
- Pushes that change only Markdown/docs (except `docs/METHODS.md`, `docs/DIST_SPEC.md` and `docs/kaynakca.json`, which CI checks) do not start the deploy workflow.
- At the end of a module update PROGRESS.md (and METHODS.md if needed), in the same push; keep PROGRESS short (one line per item, details belong in the commit message). Do not add "published" commits: live status is the Actions run.
- Other documents: `docs/MINOR_REVISIONS.md` (user's MR-001… notes), `docs/SOURCE_LIST.md`, `docs/IDEAS_AND_METHODS.md`.
