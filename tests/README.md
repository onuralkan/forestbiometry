# Tests
- `node tests/test_math.js`: checks the maths in `assets/tools.js` against SciPy reference values.
- `python3 tests/ref/make_reference.py`: regenerates `tests/ref/distributions.json` (needs numpy + scipy).
- `node tests/checker/test_checker.mjs`: Forest Data Checker acceptance tests (pure logic + vendored SheetJS); expected values written by hand.
- `node tests/stand/test_stand.mjs`: Plot & Stand Metrics tests; references are the acceptance example and `tests/ref/stand.json`.
- `python3 tests/ref/make_stand_reference.py`: regenerates `tests/ref/stand.json` from `tests/stand/fixture.json` (numpy).
- `node tests/stand/e2e.mjs http://127.0.0.1:8092 [shots-dir]`: browser test for Plot & Stand Metrics.
- `node tests/checker/e2e.mjs http://127.0.0.1:8092 [shots-dir]`: browser test with Playwright/Chromium against a local `php -S 127.0.0.1:8092` in the site folder.
Older supplements (Meşcere, Laboratuvar, Bulmaca) were checked in the browser during development; scripted tests come when they move to the tools section.
