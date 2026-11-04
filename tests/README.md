# Tests
- `node tests/test_math.js`: checks the maths in `assets/tools.js` against SciPy reference values.
- `python3 tests/ref/make_reference.py`: regenerates `tests/ref/distributions.json` (needs numpy + scipy).
Page-level browser checks (Playwright) were run during development; scripted versions will be added per module.
