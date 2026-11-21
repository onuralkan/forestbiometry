# References still open

Updated 21 Nov 2026 after the user's verification report (REFERENCES_VERIFIED.md, not stored in the repository). Applied to `docs/kaynakca.json` (then `node scripts/kaynakca.mjs`): 26 verified references and 6 undated NIST pages completed; 46 DOIs added; richards1959 pages 290–301; stoffels1953 original title. The records below were **not** changed: the report's suggestion and warning are kept in each record's `note` ("NOT applied …"). Source status ([B]/[İ]/[P]/[A]/[D]) is unchanged by all of this.

## Work not identified with certainty (send the original citation, title page or the page used) (8)

| Key | Record now | Used in |
|---|---|---|
| `becking1953` | Becking (1953) | METHODS §16 SS01 (relative spacing, definition exception) |
| `krenn1944` | Krenn; Prodan (1944) | METHODS §14 SV01 (Hohenadl, via Heger 1965) |
| `meyer1942` | Meyer (1942) | METHODS §23 TM-03 (bark ratio k) |
| `oestlin1963` | Oestlin (1963) | METHODS §23 TM-03 (ln bark form) |
| `parresol2009` | Parresol (2009) | METHODS §12 P19 |
| `press_nr` | Press, W. H. (n.d.). Numerical Recipes | METHODS §3 (erfcc, gser/gcf); METHODS §10 (betacf) |
| `prodan_vol` | Prodan (n.d.) | METHODS §24 SV-04 (local function V = b₀ + b₁D²) |
| `zohrer1973` | Zöhrer (1973) | METHODS §23 TM-03 (1/k) |

## Partly verified (original copy needed for pages, issue or edition) (8)

| Key | Record now | Used in |
|---|---|---|
| `acklam2003` | Acklam, P. J. (n.d.). An algorithm for computing the inverse normal cumulative distribution function | METHODS §3 (Φ⁻¹) |
| `clark1906` | Clark (1906) | METHODS §25 SV-05 (International ⅛-inch, Eq. 7.7–7.10) |
| `donnelly1978` | Donnelly, K. P. (1978). Simulations to determine the variance and edge effect of total nearest-neighbour distance | METHODS §16 SS02 (Donnelly edge correction, temporary exception) |
| `heger1965` | Heger, L. (1965). A trial of Hohenadl's method of stem form and stem volume estimation | METHODS §14 SV01 (Hohenadl); METHODS §14 audit fixes (Fig. 1 test) |
| `hegyi1974` | Hegyi, F. (1974). A simulation model for managing jack-pine stands | METHODS §16 SS-07/a1 (Hegyi index) |
| `minka2002` | Minka, T. P. (2002). Estimating a gamma distribution | METHODS §12 P03 (solver start value only) |
| `rohle1985` | Röhle (1985) | METHODS §23 TM-04 (number of radii) |
| `vonesh1997` | Vonesh; Chinchilli (1997) | METHODS §27 SM-03 (calibration) |

## Software and documentation: the version actually used is needed (R sessionInfo()/packageVersion(), Python environment) (11)

| Key | Record now | Used in |
|---|---|---|
| `biomass_agbmontecarlo` | — (n.d.). BIOMASS — AGBmonteCarlo (source code and help page) | METHODS §22 BC04 |
| `fitdistrplus_vignette` | — (n.d.). fitdistrplus vignette | METHODS §12 P18 (QME, MGE); DIST_SPEC [R8] |
| `forestfit_fitjsb` | — (n.d.). ForestFit — fitJSB | METHODS §12 P08; DIST_SPEC [R7] |
| `forestfit_fitweibull` | — (n.d.). ForestFit — fitWeibull | DIST_SPEC [R6] (§3.5 Weibull method inventory) |
| `forestsas_dominance` | — (n.d.). forestSAS — dominance | METHODS §16 SS02 (U; numerical check tests/ref/ss02_check.R) |
| `lmfor` | Mehtätalo, L. (n.d.). lmfor: Functions for Forest Biometrics (HDmodels help page) | METHODS §10 (model forms) |
| `lmomco_pargam` | — (n.d.). lmomco — pargam | METHODS §12 P03, P18; DIST_SPEC [R13] |
| `scipy_fisk` | — (n.d.). SciPy — scipy.stats.fisk | METHODS §12 P10; DIST_SPEC [R16] |
| `scipy_gengamma` | — (n.d.). SciPy — scipy.stats.gengamma | METHODS §12 P20; DIST_SPEC [R18] |
| `scipy_goodness_of_fit` | — (n.d.). SciPy — scipy.stats.goodness_of_fit | METHODS §12 P14 (bootstrap); METHODS §12 P15; DIST_SPEC [R9] |
| `spatstat_clarkevans` | — (n.d.). spatstat — clarkevans(correction = "Donnelly") | METHODS §16 SS02 (numerical check tests/ref/ss02_check.R) |

## No DOI found (may have none; nothing to do unless the original shows one) (8)

| Key | Record now | Used in |
|---|---|---|
| `grondin1998` | Grondin, F. (1998). Improvements of the dynamic programming algorithm for tree bucking | METHODS §19 SV-06 (recursion 3) |
| `hernandezcuevas2018` | Hernández-Cuevas, M.; Santiago-García, W.; De los Santos-Posadas, H. M.; Martínez-Antúnez, P.; Ruiz-Aquino, F. (2018). Modelos de crecimiento en altura dominante e índices de sitio para Pinus ayacahuite Ehren. | METHODS §15 SI01 (Cuadro 2, 3); METHODS §18 SQ-03 (cr, schu); METHODS §26 SM-02 |
| `michailoff1943` | Michailoff, I. (1943). Zahlenmässiges Verfahren für die Ausführung der Bestandeshöhenkurven | METHODS §10 (height–diameter) |
| `naslund1936` | Näslund, M. (1936). Skogsförsöksanstaltens gallringsförsök i tallskog | METHODS §1 (archived); METHODS §10 (height–diameter); METHODS §21 DI-04 |
| `pnevmaticos1972` | Pnevmaticos, S. M.; Mann, S. H. (1972). Dynamic programming in tree bucking | METHODS §19 SV-06 |
| `reineke1933` | Reineke, L. H. (1933). Perfecting a stand-density index for even-aged forests | METHODS §1 (archived); METHODS §16 SS01 (SDI) |
| `schumacher1939` | Schumacher, F. X. (1939). A new growth curve and its application to timber-yield studies | METHODS §15 SI01; METHODS §18 SQ-03 |
| `stoffels1953` | Stoffels, A.; van Soest, J. (1953). Principiële vraagstukken bij proefperken: 3. Hoogteregressie | METHODS §10 (power h–d) |
