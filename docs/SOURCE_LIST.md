# Required sources (16 Nov 2026)

☑ = in the user's Google Drive folder (`MODUL_KAYNAK`, 16 Nov 2026: 26 distinct sources). Read and marked in METHODS: Clark and Evans 1954 [B], Pommerening 2002 [B], Contreras et al. 2011 [B] (Hegyi [A]).

**17 Nov 2026 (user decision, PLATFORM_PLAN P8):** BC-05; SI-02, SI-04…SI-09; GY-01…GY-07; SM-07; ML-01, ML-04…ML-08; DS-01, DS-02, DS-04…DS-06 were removed from the plan. Below, sources tied only to these ids are no longer requested; the rows stay as an archive and need not be uploaded again.

Sources for the planned modules (`docs/PLATFORM_PLAN.md`), in two sections:

1. **PDF required:** the equation or method is to be read from the primary source (no adequate package, the package
   documentation does not write out the formula, or the method is the whole of a book).
2. **Package sufficient ([P]):** the equation form is written out explicitly on the help page of a CRAN package; the test
   reference will be that package's output (`tests/ref/*.R`, the user runs it in R). The original article is listed only
   for the citation, no PDF needed. Conditions at the top of METHODS.md (16 Nov 2026, user decision).

The citations were written from knowledge **[D]**: author and year are reliable, volume/pages may be wrong. Package
versions and help pages were checked on CRAN (search.r-project.org) on 16 Nov 2026. Rule (K1, P2): the **equation form
and method** are taken from the source; species/region coefficients, table values, package data or default constants are not embedded in the site.

Source statuses: [B] original read, [P] package documentation, [A] cited (from a secondary source), [İ]/[D] citation only (top of METHODS).

Priority: **A** required for the next stages; **B** when that module comes up; **C** optional. **Open** = no
university network needed (open access or free document).

---

## Section 1. PDF required

Column "Substitute [A]": a relatively recent source citing the original that can be used to take the equation from if
the original cannot be found (the [A] conditions at the top of METHODS: two independent secondary sources must give the
same form, or one must agree numerically with a package output or a worked example; a discrepancy becomes a note or an
option). If a row has two suggestions, together they meet condition 3. "Counts as recent": the source is already
relatively recent, no need to cite through another.

### A — next stages

| ☐ | Source | Tool | Substitute [A] |
|---|---|---|---|
| ☑ | Pommerening, A. 2002. Approaches to quantifying forest structures. *Forestry* 75: 305–324. (upload again; `forestSAS` numerical reference) | SS-05 | Pommerening, A., Grabarnik, P. 2019. *Individual-based Methods in Forest Ecology and Management.* Springer |
| ☑ | Clark, P.J., Evans, F.C. 1954. Distance to nearest neighbor as a measure of spatial relationships in populations. *Ecology* 35: 445–453. (upload again; `spatstat` numerical reference) | SS-06 | Pommerening, A., Grabarnik, P. 2019. *Individual-based Methods in Forest Ecology and Management.* Springer |
| ☐ | Donnelly, K.P. 1978. Simulations to determine the variance and edge effect of total nearest-neighbour distance. Hodder (ed.), *Simulation Studies in Archaeology*, Cambridge Univ. Press. (upload again) | SS-06 | Pommerening, A., Grabarnik, P. 2019. *Individual-based Methods in Forest Ecology and Management.* Springer (to be checked that it gives the Donnelly correction); numerical: `clarkevans(correction = "Donnelly")` |
| ☑ | Krajicek, J.E., Brinkman, K.A., Gingrich, S.F. 1961. Crown competition — a measure of density. *Forest Science* 7: 35–42. (upload again) | SS-02 CCF | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer; Weiskittel et al. 2011 (below, GY) |
| ☑ | Max, T.A., Burkhart, H.E. 1976. Segmented polynomial regression applied to taper equations. *Forest Science* 22: 283–289. (upload again) | SV-02 | Li, R., Weiskittel, A.R. 2010. Comparison of model forms for estimating stem taper and volume in the primary conifer species of the North American Acadian Region. *Annals of Forest Science* 67: 302; Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer |
| ☑ | Kozak, A. 2004. My last words on taper equations. *The Forestry Chronicle* 80: 507–515. | SV-02 | Li, R., Weiskittel, A.R. 2010. Comparison of model forms for estimating stem taper and volume in the primary conifer species of the North American Acadian Region. *Annals of Forest Science* 67: 302 |
| ☑ | Kozak, A. 1988. A variable-exponent taper equation. *Canadian Journal of Forest Research* 18: 1363–1368. | SV-02 | Kozak 2004 (rewrites his own models); Li, R., Weiskittel, A.R. 2010. Comparison of model forms for estimating stem taper and volume in the primary conifer species of the North American Acadian Region. *Annals of Forest Science* 67: 302 |
| ☑ | Pnevmaticos, S.M., Mann, S.H. 1972. Dynamic programming in tree bucking. *Forest Products Journal* 22(2): 26–30. (not found; no longer needed) | SV-06 | Grondin, F. 1998. Improvements of the dynamic programming algorithm for tree bucking. *Wood and Fiber Science* 30(1): 91–104 [B, recursion explicit]; Bennemann, C., Lussier, J.-M., Labelle, E.R. 2025. *Forests* 16: 780 [B] (16 Nov 2026, METHODS §19) |
| ☐ | Cieszewski, C.J., Bailey, R.L. 2000. Generalized algebraic difference approach… *Forest Science* 46: 116–126. | SQ-02 GADA | Diéguez-Aranda, U. et al. 2006. Dynamic growth model for Scots pine plantations in Galicia (north-western Spain). *Ecological Modelling* 191: 225–242; Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer |
| ☑ | Baskerville, G.L. 1972. Use of logarithmic regression in the estimation of plant biomass. *Canadian Journal of Forest Research* 2: 49–53. (16 Nov 2026: [A] met, cited via Chave et al. 2014 *Global Change Biology* 20: 3177–3190 and Baia et al. 2025 *PeerJ* 13: e18974, open access, read; METHODS §22) | BC-01 | Clifford, D., Cressie, N., England, J.R., Roxburgh, S.H., Paul, K.I. 2013. Correction factors for unbiased, efficient estimation and prediction of biomass from log–log allometric models. *Forest Ecology and Management* 310: 375–381 |
| ☐ | Sprugel, D.G. **1983**. Correcting for bias in log-transformed allometric equations. *Ecology* 64: 209–210. | BC-01 | Clifford, D., Cressie, N., England, J.R., Roxburgh, S.H., Paul, K.I. 2013. Correction factors for unbiased, efficient estimation and prediction of biomass from log–log allometric models. *Forest Ecology and Management* 310: 375–381 |
| ☐ | Snowdon, P. 1991. A ratio estimator for bias correction in logarithmic regressions. *Canadian Journal of Forest Research* 21: 720–724. | BC-01 | Clifford, D., Cressie, N., England, J.R., Roxburgh, S.H., Paul, K.I. 2013. Correction factors for unbiased, efficient estimation and prediction of biomass from log–log allometric models. *Forest Ecology and Management* 310: 375–381 |
| ☑ | Chave, J., Condit, R., Aguilar, S., Hernandez, A., Lao, S., Perez, R. 2004. Error propagation and scaling for tropical forest biomass estimates. *Philosophical Transactions of the Royal Society B* 359: 409–420. (17 Nov 2026: uploaded by the user, read; METHODS §22 BC04 [B]) | BC-06 (BC04) | Réjou-Méchain, M. et al. 2017. BIOMASS: an R package… *Methods in Ecology and Evolution* 8: 1163–1167 (17 Nov 2026: uploaded by the user, read, [B]); BIOMASS `AGBmonteCarlo` source code read (rdrr.io) |
| ☑ | **Open** — IPCC 2006. *2006 IPCC Guidelines for National Greenhouse Gas Inventories*, Volume 4 Chapters 2 and 4; Volume 1 Chapter 3. ipcc-nggip.iges.or.jp (16 Nov 2026: Volume 4 Chapter 2 Equation 2.8 and §2.2.3 read, METHODS §22 [B]) | BC-03…06 | not needed (free) |

### B — when the module comes up

**SV — stem volume**

| ☐ | Source | Tool | Substitute [A] |
|---|---|---|---|
| ☑ | Kozak, A., Munro, D.D., Smith, J.H.G. 1969. Taper functions and their application in forest inventory. *The Forestry Chronicle* 45: 278–283. | SV-02 | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer; Kozak 2004 |
| ☑ | Demaerschalk, J.P. 1972. Converting volume equations to compatible taper equations. *Forest Science* 18: 241–245. | SV-02 | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer |
| ☑ | Clutter, J.L. 1980. Development of taper functions from variable-top merchantable volume equations. *Forest Science* 26: 117–120. | SV-02/03 | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer |
| ☐ | Fang, Z., Borders, B.E., Bailey, R.L. 2000. Compatible volume–taper models… *Forest Science* 46: 1–12. | SV-02/03 | Li, R., Weiskittel, A.R. 2010. Comparison of model forms for estimating stem taper and volume in the primary conifer species of the North American Acadian Region. *Annals of Forest Science* 67: 302 |
| ☐ | Schumacher, F.X., Hall, F.D.S. 1933. Logarithmic expression of timber-tree volume. *Journal of Agricultural Research* 47: 719–734. (may be free in the USDA archive) | SV-04 | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer; Avery and Burkhart 2002 |

**BC — biomass and carbon**

| ☐ | Source | Tool | Substitute [A] |
|---|---|---|---|
| ☑ | Parresol, B.R. 1999. Assessing tree and stand biomass: a review with examples and critical comparisons. *Forest Science* 45: 573–593. (17 Nov 2026: uploaded by the user, read; METHODS §22 BC-02/a1 [B]; Table 4 numerical reference) | BC-01/02 | counts as recent |
| ☑ | Parresol, B.R. 2001. Additivity of nonlinear biomass equations. *Canadian Journal of Forest Research* 31: 865–878. (17 Nov 2026: uploaded by the user, read; METHODS §22 BC-02/a2 [B] and §26 SM-02 [B] (weighting, EGNLS, intervals); Table 1 data and Tables 2–4 numerical reference; misprints in METHODS) | BC-02, SM-02, SM-04 | counts as recent |
| ☐ | Somogyi, Z. et al. 2007. Indirect methods of large-scale forest biomass estimation. *European Journal of Forest Research* 126: 197–207. | BC-03 | counts as recent |
| ☐ | Lehtonen, A. et al. 2004. Biomass expansion factors (BEFs)… *Forest Ecology and Management* 188: 211–224. | BC-03 | counts as recent |
| ☐ | **Open** — IPCC 2019. *2019 Refinement…*, Volume 4, Chapter 4. | BC-03…05 | not needed |
| ☐ | **Open** — JCGM 101:2008. *Supplement 1 to the GUM: Monte Carlo method.* bipm.org | BC-06 | not needed |

**SI — sampling and inventory**

| ☐ | Source | Tool | Substitute [A] |
|---|---|---|---|
| ☐ | Gregoire, T.G., Valentine, H.T. 2008. *Sampling Strategies for Natural Resources and the Environment.* Chapman & Hall/CRC. (the module's main source) | SI-02…09 | Mandallaz 2008 (below) |
| ☐ | Mandallaz, D. 2008. *Sampling Techniques for Forest Inventories.* Chapman & Hall/CRC. | SI-07, SI-08 | Gregoire and Valentine 2008 (below, SI) |
| ☐ | Grosenbaugh, L.R. 1952. Plotless timber estimates — new, fast, easy. *Journal of Forestry* 50: 32–37. | SI-04 | Gregoire and Valentine 2008 (below, SI); Kershaw et al. 2016 |
| ☐ | Gregoire, T.G. 1982. The unbiasedness of the mirage correction procedure for boundary overlap. *Forest Science* 28: 504–508. | SI-05 | Gregoire and Valentine 2008 (below, SI) |
| ☐ | Ducey, M.J., Gove, J.H., Valentine, H.T. 2004. A walkthrough solution to the boundary overlap problem. *Forest Science* 50: 427–435. | SI-05 | Gregoire and Valentine 2008 (below, SI) |
| ☐ | Warren, W.G., Olsen, P.F. 1964. A line intersect technique for assessing logging waste. *Forest Science* 10: 267–276. | SI-06 | Gregoire and Valentine 2008 (below, SI) |
| ☐ | Van Wagner, C.E. 1968. The line intersect method in forest fuel sampling. *Forest Science* 14: 20–26. | SI-06 | Gregoire and Valentine 2008 (below, SI) |
| ☑ | Beers, T.W. 1962. Components of forest growth. *Journal of Forestry* 60: 245–248. | SI-09 | Kershaw et al. 2016 (components of growth) |

**SM — statistical modelling** (algorithms at textbook level; packages serve as numerical references)

| ☐ | Source | Tool | Substitute [A] |
|---|---|---|---|
| ☐ | Mehtätalo, L., Lappi, J. 2020. *Biometry for Forestry and Environmental Data.* Chapman & Hall/CRC. (`lmfor` is this book's package; 17 Nov 2026: the uploaded file has only the contents and references, no chapter text; not needed for SM-03) | SM-02, SM-03 | recent |
| ☑ | Pinheiro, J.C., Bates, D.M. 2000. *Mixed-Effects Models in S and S-PLUS.* Springer. (17 Nov 2026: uploaded by the user, six parts; §2.2, §2.4.1, §5.2, §7.2 read; METHODS §27 [B]) | SM-03 | Mehtätalo and Lappi 2020 |
| ☐ | Bates, D.M., Watts, D.G. 1988. *Nonlinear Regression Analysis and Its Applications.* Wiley. | SM-02 | Mehtätalo and Lappi 2020 |
| ☐ | Efron, B., Tibshirani, R.J. 1993. *An Introduction to the Bootstrap.* Chapman & Hall. | SM-07 | Davison and Hinkley 1997 (the book of the `boot` package) |

**GY — growth and yield**

| ☐ | Source | Tool | Substitute [A] |
|---|---|---|---|
| ☐ | Weiskittel, A.R., Hann, D.W., Kershaw, J.A., Vanclay, J.K. 2011. *Forest Growth and Yield Modeling.* Wiley-Blackwell. (the module's main source) | GY-01…07 | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer |
| ☐ | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer. (also for taper, site index, competition, density) | GY, SV, SQ, SS | Weiskittel et al. 2011 |
| ☐ | Usher, M.B. 1966. A matrix approach to the management of renewable resources… *Journal of Applied Ecology* 3: 355–367. | GY-02 | Weiskittel et al. 2011; Buongiorno and Michie 1980 |
| ☑ | Buongiorno, J., Michie, B.R. 1980. A matrix model of uneven-aged forest management. *Forest Science* 26: 609–625. | GY-02 | Weiskittel et al. 2011 |
| ☑ | Wykoff, W.R. 1990. A basal area increment model for individual conifers in the northern Rocky Mountains. *Forest Science* 36: 1077–1104. | GY-03 | Weiskittel et al. 2011 |
| ☐ | Monserud, R.A., Sterba, H. 1996. A basal area increment model for individual trees… *Forest Ecology and Management* 80: 57–80. | GY-03 | Weiskittel et al. 2011 |
| ☐ | Monserud, R.A., Sterba, H. 1999. Modeling individual tree mortality for Austrian forest species. *Forest Ecology and Management* 113: 109–123. | GY-04 | Weiskittel et al. 2011 |
| ☑ | Drew, T.J., Flewelling, J.W. 1979. Stand density management… *Forest Science* 25: 518–532. | GY-06 | Newton 1997 (below) |
| ☐ | Newton, P.F. 1997. Stand density management diagrams: review… *Forest Ecology and Management* 98: 251–265. | GY-06 | counts as recent (review) |
| ☐ | Yoda, K., Kira, T., Ogawa, H., Hozumi, K. 1963. Self-thinning in overcrowded pure stands… *Journal of Biology, Osaka City University* 14: 107–129. | GY-07 | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer; Weiskittel et al. 2011 |

**ML — spatial prediction**

| ☐ | Source | Tool | Substitute [A] |
|---|---|---|---|
| ☐ | Cressie, N. 1993. *Statistics for Spatial Data*, revised edition. Wiley. | ML-05 | Rasmussen and Williams 2006 (**open**, Gaussian processes); numerical: `gstat` |
| ☐ | Moeur, M., Stage, A.R. 1995. Most similar neighbor… *Forest Science* 41: 337–359. | ML-04 | Crookston and Finley 2008 (**open**, Section 2) |
| ☐ | Roberts, D.R. et al. 2017. Cross-validation strategies… *Ecography* 40: 913–929. | ML-06 | recent; Ploton et al. 2020 (**open**) |
| ☐ | Särndal, C.-E., Swensson, B., Wretman, J. 1992. *Model Assisted Survey Sampling.* Springer. | ML-08, SI-08 | Ståhl et al. 2016 (**open**); Lumley 2004 (**open**, `survey`) |

**DS — decision support**

| ☐ | Source | Tool | Substitute [A] |
|---|---|---|---|
| ☐ | Faustmann, M. 1849 (English translation 1995). *Journal of Forest Economics* 1: 7–44. | DS-01 | the translation is recent; Bettinger et al. 2017 |
| ☐ | Johnson, K.N., Scheurman, H.L. 1977. Techniques for prescribing optimal timber harvest… *Forest Science Monograph* 18. | DS-02 | Bettinger, P., Boston, K., Siry, J.P., Grebner, D.L. 2017. *Forest Management and Planning*, 2nd ed. Academic Press |
| ☐ | Harmon, M.E. et al. 1986. Ecology of coarse woody debris in temperate ecosystems. *Advances in Ecological Research* 15: 133–302. | DS-04 | Gregoire and Valentine 2008 (below, SI) (line-intersect volume) |
| ☐ | Nowak, D.J. et al. 2008. A ground-based method of assessing urban forest structure and ecosystem services. *Arboriculture & Urban Forestry* 34: 347–358. | DS-06 | counts as recent |

The source for DS-05 (damage assessment) will be chosen once the tool's scope is defined.

**TM — tree measurement** (textbook level; one is enough)

| ☐ | Source | Tool | Substitute [A] |
|---|---|---|---|
| ☑ | Kershaw, J.A., Ducey, M.J., Beers, T.W., Husch, B. 2016. *Forest Mensuration*, 5th ed. Wiley. (full book on Drive, 15–17 MB, the reading tool cuts off at about p. 67; 17 Nov 2026 the pages set aside by the user were read: pp. 125–131 §5.5, 236–246 §8.6, 263–266 §8.9.3–8.9.5, Appendix A.2–A.3; pp. 160–200 §6.4.1, §7.4.1, §7.4.3 → SV-03 [B]; 17 Nov 2026: the book was split into 7 parts by the user, part 2 §6.2 pp. 156–159 → SV-04 [B]; §7.3, §7.4.1, Table 6.1 → SV-05 [B]) | TM-01…06, SS-02 (CCF), SV-03, SV-04, SV-05 | van Laar and Akça 2007; Avery and Burkhart 2002 |
| ☑ | Hamilton, G.J. 1975. *Forest Mensuration Handbook.* Forestry Commission Booklet 39. HMSO. (uploaded 17 Nov 2026; METHODS §23) | TM | — |
| ☑ | Graves, H.S. 1906. *Forest Mensuration.* Wiley. (uploaded 17 Nov 2026; public domain; METHODS §23) | TM | — |
| ☑ | C — van Laar, A., Akça, A. 2007. *Forest Mensuration*, 2nd ed. Springer. (uploaded 17 Nov 2026; the reading tool gives the first 163 pages of the PDF, chapter 9 onwards could not be read) | TM | Kershaw et al. 2016 |
| ☐ | C — Avery, T.E., Burkhart, H.E. 2002. *Forest Measurements*, 5th ed. McGraw-Hill. (SV-05 log rules) | TM, SV-05 | Kershaw et al. 2016 |
| ☐ | C — Kalıpsız, A. *Dendrometri.* İÜ Orman Fakültesi (the edition at hand). For Turkish terms. | TM | — |

### Key sources for citing through (download these first)

Most of the "substitute" suggestions above rest on these sources; if they are at hand, most of the old articles are no longer needed:

- ☐ Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer. (SV, SQ, SS, GY)
- ☐ Weiskittel, A.R., Hann, D.W., Kershaw, J.A., Vanclay, J.K. 2011. *Forest Growth and Yield Modeling.* Wiley-Blackwell. (GY, SS)
- ☐ Gregoire, T.G., Valentine, H.T. 2008. *Sampling Strategies for Natural Resources and the Environment.* Chapman & Hall/CRC. (SI, DS-04)
- ☐ Pommerening, A., Grabarnik, P. 2019. *Individual-based Methods in Forest Ecology and Management.* Springer. (SS-05, SS-06, SS-07)
- ☐ Li, R., Weiskittel, A.R. 2010. Comparison of model forms for estimating stem taper and volume in the primary conifer species of the North American Acadian Region. *Annals of Forest Science* 67: 302. (SV-02)
- ☑ Clifford, D., Cressie, N., England, J.R., Roxburgh, S.H., Paul, K.I. 2013. Correction factors for unbiased, efficient estimation and prediction of biomass from log–log allometric models. *Forest Ecology and Management* 310: 375–381. (BC-01)
- ☑ Contreras, M.A., Affleck, D., Chung, W. 2011. Evaluating tree competition indices as predictors of basal area increment in western Montana forests. *Forest Ecology and Management* 262: 1939–1949. (SS-07 Hegyi; together with `siplab` meets the [A] condition)

---

## Section 2. Package sufficient ([P] candidates)

No PDF needed. Each row gives: tool id, package and function, what the package gives (**formula** = the help page writes
out the equation explicitly; **numerical** = test reference only), the publication introducing the package (mostly **open**). Before a
function is implemented, its help page is read and marked [P] in METHODS; if an ambiguous notation turns up (the Chapman–Richards note below),
it is clarified with the package's code and numerical output; if still ambiguous, the PDF is sought.

| Tool | Package and function | Gives | Original source (citation; no PDF needed) | Package publication |
|---|---|---|---|---|
| SS-07 Hegyi | `siplab` 1.6: `pairwise(kernel = powers_ker)` | formula: (S_j/S_i)/R, p_i = p_j = p_r = 1; note that the original Hegyi added 1 ft to the distance | Hegyi 1974 ([A]: with Contreras et al. 2011) | García, O. 2014. siplab, a spatial individual-based plant modelling system. *Computational Ecology and Software* 4(4): 215–222. **Open** |
| SS-06 Ripley K, L | `spatstat.explore` 3.8-3: `Kest`, `Lest` | formula + edge corrections | Ripley 1976, 1977; Besag 1977 | Baddeley, A., Turner, R. 2005. spatstat: an R package for analyzing spatial point patterns. *J. Statistical Software* 12(6). **Open** |
| SS-06 pair correlation | `spatstat.explore`: `pcf` | formula (kernel estimation) | Stoyan and Stoyan 1994; Illian et al. 2008 | same |
| SS-04 diversity (additional verification) | `vegan` 2.7-6: `diversity` | formula | Shannon, Simpson | — |
| SQ-03 growth functions | `growthmodels` 1.3.1: `chapmanRichards`, `gompertz`, `richard`, `schnute`, `weibull`, `vonBertalanffy`… | formula (caution: the bracketing in the notation on the Chapman–Richards page is ambiguous; to be clarified with the code and numerical output) | Richards 1959; Chapman 1961; Gompertz 1825; Schumacher 1939 | source given by the package: Fekedulegn, D., Mac Siurtain, M., Colbert, J. 1999. Parameter estimation of nonlinear growth models in forestry. *Silva Fennica* 33(4): 327–336. **Open** |
| SM-04 SUR | `systemfit` 1.1-30 | formula + numerical | Zellner 1962 | Henningsen, A., Hamann, J.D. 2007. systemfit: a package for estimating systems of simultaneous equations in R. *J. Statistical Software* 23(4). **Open** |
| SM-03 mixed models | `nlme` 3.1, `lme4` 2.1 | numerical (for the method, the books in Section 1) | Lindstrom and Bates 1990 | Bates, D., Mächler, M., Bolker, B., Walker, S. 2015. Fitting linear mixed-effects models using lme4. *J. Statistical Software* 67(1). **Open** |
| SM-01/03 height–diameter | `lmfor` 1.7 | formula (already used as [B], 9 Nov) | Mehtätalo et al. 2015 | Mehtätalo and Lappi 2020 (Section 1) |
| SM-05 survival (17 Nov 2026: out of scope, user decision) | `survival` 3.8 | numerical | Cox 1972 | — |
| SM-07 bootstrap | `boot` 1.3 | numerical | Efron and Tibshirani 1993 | Davison and Hinkley 1997 (the package's book) |
| SI-02, SI-03 designs | `forestmangr` 0.9: `sprs`, `strs`, `ss_diffs` | numerical | Kershaw et al. 2016 | — |
| SI-08 Horvitz–Thompson, GREG | `survey` 4.5: `svytotal`, `calibrate` | formula + numerical | Horvitz and Thompson 1952; Särndal et al. 1992 | Lumley, T. 2004. Analysis of complex survey samples. *J. Statistical Software* 9(8). **Open** |
| ML-07 small area | `sae` 1.4: `eblupFH`, `eblupBHF` | formula + numerical | Fay and Herriot 1979; Battese, Harter and Fuller 1988 | Molina, I., Marhuenda, Y. 2015. sae: an R package for small area estimation. *The R Journal* 7(1): 81–98. **Open** |
| ML-01 random forest | `ranger` 0.18 | numerical (at the distribution level because of randomness) | Breiman 2001 | Wright, M.N., Ziegler, A. 2017. ranger: a fast implementation of random forests for high dimensional data in C++ and R. *J. Statistical Software* 77(1). **Open** |
| ML-04 k-NN imputation | `yaImpute` 1.0 | formula + numerical | Moeur and Stage 1995 | Crookston, N.L., Finley, A.O. 2008. yaImpute: an R package for kNN imputation. *J. Statistical Software* 23(10). **Open** |
| ML-05 kriging | `gstat` 2.1 | numerical (method: Cressie, Section 1) | Matheron; Cressie 1993 | Pebesma, E.J. 2004. Multivariable geostatistics in S: the gstat package. *Computers & Geosciences* 30: 683–691. |
| DS-02 linear programming | `lpSolve` 5.6 | numerical (solver) | — | — |
| BC-01 tropical biomass (test only) | `BIOMASS` 2.2: `computeAGB`, `AGBmonteCarlo` | formula + numerical; the package's wood densities and coefficients are **not embedded** (K1) | Chave et al. 2014 | Réjou-Méchain, M. et al. 2017. BIOMASS: an R package for estimating above-ground biomass and its uncertainty in tropical forests. *Methods in Ecology and Evolution* 8: 1163–1167. |
| SV-02 B-spline taper (optional additional model) | `TapeR` 0.5 | numerical | Kublin, E., Breidenbach, J., Kändler, G. 2013. A flexible stem taper and volume prediction method based on mixed-effects B-spline regression. *European Journal of Forest Research* 132: 983–997. | — |

Dropped from Section 1 because of Section 2 (PDFs no longer sought): Hegyi 1974; Ripley 1976, 1977; Illian et al. 2008;
Richards 1959; Chapman 1961; Schumacher 1939; Zeide 1993; Zellner 1962; Borders 1989; Cox 1972; Davison and Hinkley
1997; Horvitz and Thompson 1952; Cochran 1977 (`survey`/`forestmangr` for the design formulas); Fay and Herriot 1979;
Battese et al. 1988; Rao and Molina 2015; Breiman 2001; Hastie et al. 2009; Crookston and Finley 2008; Rasmussen and
Williams 2006 (kriging with `gstat`); Ploton et al. 2020; Ståhl et al. 2016 (open access; read if wanted); Chave et
al. 2014; Jenkins et al. 2003; Zianis et al. 2005; Tolunay 2011; Thomas and Martin 2012 (carbon fraction already
comes from the user); Bitterlich 1984; de Vries 1986; Schreuder et al. 1993; Ware and Cunia 1962; Vanclay 1994; Clutter et
al. 1983; Pretzsch 2009; Bettinger et al. 2017; West 2009; Calama and Montero 2004; Marquardt 1963.

---

## Section 3. Verification debt of the existing tools (C; [D] in METHODS.md)

The live calculations have already been tested against independent numerical references; these are for verifying the
citations and definitions. Most can be closed with [P]: diameter distributions `fitdistrplus` (Delignette-Muller, M.L., Dutang, C. 2015. *J. Statistical
Software* 64(4), **open**), `lmomco`, `ForestFit`; goodness-of-fit tests and AIC `stats`/`fitdistrplus`.

- Johnson 1949 (Johnson SB; `ForestFit`), Burk and Newberry 1984 (moment-based parameter recovery), Knoebel and Burkhart 1991,
  Cohen 1965, Anderson and Darling 1954, Massey 1951, Akaike 1974, Hyndman and Fan 1996 (the R `quantile` type 7 documentation
  suffices), Näslund 1936 (met by `lmfor` [B]), Assmann 1970 (definition of top height; textbook).

**SM-03 additional sources (17 Nov 2026, uploaded by the user):** ☑ Lindstrom, M.J., Bates, D.M. 1990. *Biometrics* 46: 673–687 [B]; ☑ Raptis, D.I., Kazana, V., Kazaklis, A., Stamatiou, C. 2021. Mixed-effects height–diameter models for black pine (*Pinus nigra* Arn.) forest management. *Trees* 35: 1167–1183 (calibration [A]); ☑ Ciceu, A., Garcia-Duro, J., Seceleanu, I., Badea, O. 2020. A generalized nonlinear mixed-effects height–diameter model for Norway spruce in mixed-uneven aged stands. *For. Ecol. Manage.* 477: 118507 (calibration [A]); Bates, D., Mächler, M., Bolker, B., Walker, S. 2015. lme4. *J. Stat. Softw.* 67(1) (uploaded; not used in the implementation).

**SM-04 (17 Nov 2026):** ☑ Henningsen, A., Hamann, J.D. 2007. systemfit: a package for estimating systems of simultaneous equations in R. *J. Statistical Software* 23(4) (CRAN vignette, open access; read, METHODS §28 [B]); numerical reference systemfit 1.1-30 [P].
