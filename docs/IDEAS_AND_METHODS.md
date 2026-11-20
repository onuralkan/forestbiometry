# Idea note: methods commonly used in the literature that could be added to the tools

Prepared: 17 Nov 2026, user request (side task).

**This document is not a plan.** It is not tied to PLATFORM_PLAN, TOOLS_SPEC, PROGRESS or SOURCE_LIST, and it contains no decisions or order. It is only a ready list of names for the question "what could be added later".

- The names were compiled from memory; none was read from a source. Their status is [D]; form, reference details and spelling have not been verified.
- If a method is to be taken into the system, the usual rule applies: the source is provided, read, marked [B]/[A]/[P], then implemented.
- The ✓ mark shows that the method was already on the site on the day this note was written.
- Out-of-scope tools (P4) and infrastructure tools without a calculation method (DI) are not in the list.

## TM — Tree measurement

**TM-01 Height calculator**
- Trigonometric (angle + horizontal distance; tangent method)
- Sine method (slope distance)
- Similar triangles (Christen hypsometer, Merritt rule)
- Correction on sloping terrain
- Leaning tree correction

**TM-02 Diameter and basal area**
- Diameter from circumference
- Two cross diameters: arithmetic, geometric and quadratic mean
- Basal area g = π/4·d²
- Breast height definition: 1.3 m, 1.37 m (4.5 ft); measuring from the uphill side on slopes
- Rules for the measurement point on forked trees and trees with butt swell

**TM-03 Bark thickness and under-bark diameter**
- Linear bark ratio (k = d_ub/d_ob)
- Bark thickness = a + b·d
- Relation between bark percentage and basal area
- Meyer bark ratio method
- Bark models along the stem: Cao and Pepper; Laasasenaho, Melkas and Aldén

**TM-04 Crown measurements**
- Crown diameter
  - mean of two perpendicular diameters
  - crown radii in eight or four directions
  - polygon area
- Crown projection area
- Crown ratio (CR)
- Crown length
- Crown surface area and volume: cone, paraboloid, cylinder and ellipsoid assumptions
- Crown competition factor (CCF): Krajicek, Brinkman and Gingrich
- Maximum crown width (MCW) models
- Height to crown base models: Ritchie and Hann; Hasenauer and Monserud

**TM-05 Tree age and diameter increment**
- Ring counting and breast-height age correction
- Diameter increment from increment cores
- Periodic and mean annual increment
- Cross-dating: COFECHA logic
- Ring-width standardisation
  - negative exponential curve
  - spline
  - RCS
- Conversion to basal area increment
- Pressler increment percentage
- Schneider increment percentage formula

**TM-06 Form factor and form quotient**
- Artificial and natural (breast height and h/10) form factors
- Form quotients
  - Schiffel
  - Girard
  - absolute form quotient (Jonson)
  - Hohenadl (✓)
- Form height (f·h)

## SV — Stem volume and taper

**SV-01 Section volume**
- Huber ✓
- Smalian ✓
- Newton ✓
- Hohenadl ✓
- Riecke formula
- Bruce correction (for Smalian)
- Frustum of cone, frustum of paraboloid and frustum of neiloid formulas
- Section length and position rules: 1 m, 2 m, relative sections

**SV-02 Taper equations**
- Single-equation
  - Kozak, Munro and Smith (1969)
  - Demaerschalk (1972)
  - Ormerod (1973)
- Segmented
  - Max and Burkhart (1976) ✓
  - Fang, Borders and Bailey (2000)
  - Clark, Souter and Schlaegel (1991)
  - Parresol, Hotvedt and Cao (1987)
- Variable-exponent
  - Kozak (1988)
  - Kozak (2004) ✓
  - Lee et al. (2003)
  - Newnham (1992)
  - Bi (2000)
  - Muhairwe (1999)
- Jiang, Brooks and Wang (2005): compatible system based on Max–Burkhart and Fang
- Riemer, Gadow and Sloboda (1995)
- Sharma and Oderwald (2001), dimensionally compatible
- Mixed-effects taper models (tree-level random effect)

**SV-03 Merchantable volume**
- Taper integral to a top diameter ✓
- Merchantable height models
- Merchantable volume ratio equations
  - Burkhart (1977)
  - Van Deusen, Sullivan and Matney (1981)
  - Cao and Burkhart (1980)
- Volume limited by log length

**SV-04 Volume equations**
- Spurr combined variable: V = a + b·D²H
- Schumacher–Hall: V = a·D^b·H^c
- Logarithmic Spurr
- Berkhout: V = a·D^b
- Kopezky–Gehrhardt: V = a + b·D²
- Hohenadl–Krenn: V = a + b·D + c·D²
- Meyer
- Stoate (combined-variable variant)
- Ogaya
- Takata
- Naslund volume equation
- Honer (1965)
- Single- and double-entry volume tables (local and general volume tables)

**SV-05 Log scaling rules**
- Doyle
- Scribner and Scribner Decimal C
- International ¼-inch
- Huber/Smalian cubic scaling
- Hoppus
- JAS rule
- TS measurement and grading standards for Türkiye (logs, mine props, pulpwood)

**SV-06 Bucking (assortment) optimisation**
- Dynamic programming
  - Pnevmaticos and Mann
  - Grondin ✓
  - Bennemann et al. (BuckR) ✓
- Priority (greedy) rule ✓
- Network analysis and shortest path (Sessions)
- Stand-level assortments with linear programming
- Market-constrained bucking (matching demand proportions; Laroze and Greber)
- Heuristics: tabu search, genetic algorithm (Kivinen)
- Bucking that takes quality (defects, crook) into account

## BC — Biomass and carbon

**BC-01 Allometric biomass**
- Power (log–log) model: B = a·D^b
- D²H combined-variable models
- Chave et al. (2005, 2014) pantropical models
- Jenkins et al. (2003) national-scale equations
- Muukkonen (2007) generalized equations
- Zianis et al. (2005) compilation of European equations
- Back-transformation corrections
  - Baskerville ✓ (ln scale)
  - Sprugel
  - Snowdon ratio
  - smearing (Duan)

**BC-02 Biomass components**
- Component models: stem, bark, branches, foliage/needles, roots
- Additivity: Parresol (1999, 2001), simultaneous estimation with NSUR
- Root/shoot ratio (R/S)
- Root biomass equations: Cairns et al. (1997), Mokany et al. (2006)

**BC-03 Biomass expansion factor (BEF)**
- BEF, BCEF, root/shoot ratio
- Constant and age-/density-dependent BEF
- Lehtonen et al. (2004)
- Fang and Wang type volume-dependent BEF

**BC-04 Carbon stock and CO₂ equivalent**
- Carbon fraction approach (user value)
- CO₂ = C × 44/12 ✓ (definition)
- Conversion from volume to mass with wood density ✓

**BC-05 IPCC carbon accounting**
- Gain–loss method
- Stock-difference method
- Tier 1, 2 and 3 approaches
- Dead wood, litter and soil pools

**BC-06 Carbon uncertainty**
- Error propagation (IPCC Approach 1)
- Monte Carlo (IPCC Approach 2)
- Propagation including model uncertainty: Picard et al., Molto et al.

## SS — Stand structure and density

**SS-01 Stand summary**
- N/ha, G/ha
- Arithmetic and quadratic mean diameter (dg)
- Basal-area-weighted mean diameter
- Top height definitions
  - Assmann top height (100 thickest trees/ha)
  - Weise
  - Lorey's mean height
  - dominant/codominant mean
- Volume/ha

**SS-02 Stand density indices**
- Reineke SDI ✓
- SDI by the summation method (Zeide; Shaw)
- Curtis RD ✓
- Hart–Becking relative spacing ✓
- Crown competition factor (CCF)
- Wilson spacing factor
- Yoda –3/2 rule
- Power-law density measures
- Stand Density Management Diagram indicators (Drew and Flewelling)

**SS-03 Diameter distribution**
- Distribution family
  - Weibull (2 and 3 parameters) ✓
  - Johnson SB ✓
  - gamma ✓
  - beta ✓
  - lognormal ✓
  - normal ✓
  - generalized gamma ✓
  - Gumbel ✓
  - Burr XII
  - Dagum
  - finite mixtures (two Weibulls)
- Fitting and recovery methods
  - parameter prediction (PPM) ✓
  - parameter recovery (PRM) ✓
  - CDFR ✓
  - percentile matching ✓
  - moments ✓
  - L-moments ✓
- Non-parametric methods: kernel density, k-NN imputation (Haara, Maltamo and Kangas)
- Matrix and class shifting (see GY-02)

**SS-04 Diversity indices**
- Shannon ✓
- Simpson ✓
- Pielou evenness
- Berger–Parker
- Margalef
- Menhinick
- Hill numbers
- Rényi family
- Fisher α
- Rarefaction curves
- Chao1, ACE estimators
- β diversity: Jaccard, Sørensen, Bray–Curtis

**SS-05 Structural diversity indices**
- Gini coefficient ✓
- Lorenz curve ✓
- Diameter and height differentiation (T) ✓
- Uniform angle index (W) ✓
- Mingling (M) ✓
- Dominance (U) ✓
- Structural complexity index (Zenner and Hibbs)
- Stand Structural Complexity Index
- Shannon structure index (by diameter classes)
- Latham et al. height differentiation
- Staudhammer and LeMay indices
- Jaehne and Dohrenbusch index
- Pretzsch's A index (vertical species profile)

**SS-06 Spatial pattern analysis**
- Clark–Evans ✓ (with the Donnelly correction ✓)
- Ripley K and Besag L functions
- Pair correlation function g(r)
- Morisita index
- Variance/mean ratio
- Hopkins and Skellam
- Pielou randomness index
- Edge corrections: Ripley, Ohser, border strip
- Mark correlation functions
- Nearest-neighbour G, F and J functions
- Joint and bivariate patterns (Lotwick–Silverman)

**SS-07 Competition indices**
- Distance-independent
  - BAL ✓
  - relative size ✓
  - Glover–Hool
  - CCF-based indices
- Distance-dependent
  - Hegyi ✓
  - Martin–Ek
  - Bella
  - Lorimer
  - Daniels
  - Rouvinen and Kuuluvainen
  - Pukkala and Kolström
- Area overlap (ZOI): Gerrard; Bella
- Competition zone and competitor selection
  - fixed radius
  - k neighbours ✓
  - angle count (BAF)
- Voronoi and Dirichlet polygon areas
- Light-based indices (crown projection, shading)

## SQ — Site productivity

**SQ-01 / SQ-02 Site index and site index curves**
- Guide curve method
- Algebraic difference approach (ADA) ✓
- Generalized algebraic difference approach (GADA): Cieszewski and Bailey
- Bailey and Clutter (1974)
- Chapman–Richards-based ADA ✓
- Schumacher-based ADA ✓
- Hossfeld IV
- Korf
- McDill–Amateis
- Cieszewski (2001, 2002) GADA forms
- Parameter prediction and parameter recovery approaches
- Mixed-effects site index models
- Site index from height growth (growth intercept)
- Age type: total age / breast-height age ✓ (K8)

**SQ-03 Growth function fitting**
- Chapman–Richards ✓
- Schumacher ✓
- Gompertz ✓
- Logistic ✓
- Monomolecular (Mitscherlich) ✓
- Weibull ✓
- Korf
- Hossfeld (I–IV)
- Levaković (I, III)
- Yoshida I
- Sloboda
- von Bertalanffy
- Richards (four-parameter)
- Lundqvist–Matérn
- Schnute
- Zeide's LTD/TD forms
- Prodan

## SI — Sampling and inventory

**SI-01 Sample size**
- Simple random (n₀ = z²(CV/E)²) ✓
- Finite population correction ✓
- Allocation in stratified sampling: proportional, Neyman, optimal (with costs)
- Variance approximations for systematic sampling
- Cluster sampling
- Freese and Cochran formulas

**SI-02 Sampling design generator**
- Simple random
- Systematic grid (square, triangular)
- Stratified random
- Cluster sampling
- Balanced sampling: cube method (Deville and Tillé)
- Spatially balanced sampling
  - GRTS
  - local pivotal method (LPM)
- Halton and BAS
- Probability proportional to size (PPS)

**SI-03 Fixed-area plot estimation**
- Conversion to per hectare with the area expansion factor ✓
- Horvitz–Thompson
- Ratio estimator
- Nested circles
- Variable-area subplots

**SI-04 Angle count (Bitterlich)**
- Bitterlich angle count (basal area factor, BAF)
- Borderline tree check (limiting distance)
- Grosenbaugh's height angle count (vertical point sampling)
- Big BAF (Marshall, Iles and Bell)
- 3P sampling
- Nested counts
- Strand line method

**SI-05 Edge effect correction**
- Reflection (mirage, Schmid–Haas)
- Walkthrough (Ducey, Gove and Valentine)
- Edge weights
- Toroidal shift
- Buffer strip
- Ripley edge correction

**SI-06 Line intersect sampling**
- Line intersect sampling: Warren and Olsen; Van Wagner; De Vries
- Template intersect (Gregoire and Valentine)
- Transect relascope (Ståhl)
- LIS formulas for dead wood volume

**SI-07 Two-stage and double sampling**
- Ratio and regression estimators with double sampling
- Double sampling for stratification
- Two-stage sampling (primary/secondary units)
- Multistage sampling

**SI-08 Design-based inference**
- Horvitz–Thompson
- Hansen–Hurwitz
- Ratio estimator
- Regression estimator
- Generalized regression (GREG)
- Calibration estimators
- Jackknife and bootstrap variances
- Variance approximations for systematic sampling: successive differences (Matérn)

**SI-09 Repeated inventory analysis**
- Continuous forest inventory (CFI)
- Sampling with replacement (SRP)
- Partial replacement
- Growth components
  - survival
  - ingrowth
  - mortality
  - cut
  - ontogrowth
- Beers and Miller approaches
- Martin (1982) change estimators

## GY — Growth and yield

**GY-01 Stand yield table generator**
- Normal yield tables (Schwappach, Wiedemann, Schober)
- Clutter (1963) compatible growth and yield
- Buckman (1962)
- Sullivan and Clutter (1972)
- Basal area projection models
- Langsaeter density–increment relationship
- Eichhorn's rule

**GY-02 Diameter class and matrix model**
- Usher matrix model
- Buongiorno and Michie
- Diameter class progression (stand table projection)
- Fixed and dynamic transition probabilities
- Liang, Buongiorno and Monserud

**GY-03 Individual-tree growth simulation**
- Distance-independent: Prognosis/FVS logic (Wykoff), Monserud and Sterba
- Distance-dependent: SILVA (Pretzsch), MOSES (Hasenauer)
- BWINPro
- Potential × modifier approach
- Diameter increment models (ln(DDS) form)

**GY-04 Mortality and ingrowth models**
- Logistic mortality models
- Hamilton mortality model
- Monserud and Sterba
- Self-thinning-based mortality
- Zero-inflated and hurdle ingrowth models
- Vanclay ingrowth model

**GY-05 Thinning scenarios**
- Thinning types: from below, from above, selection, mixed
- Thinning ratio definitions: N, G or V ratio
- Thinning intensity indicators
  - Reineke SDI target
  - Hart–Becking spacing
  - A-value (Wilson)
- Thinning response models (Hynynen, Pukkala)

**GY-06 Stand density management diagram**
- SDMD: Drew and Flewelling (1979); McCarter and Long (1986); Newton
- Ando's SDMD
- Yoda –3/2 rule
- Crown closure and competition thresholds (Long)

**GY-07 Self-thinning line**
- Reineke (–1.605)
- Yoda (–3/2)
- Boundary line estimation methods
  - quantile regression
  - stochastic frontier
  - selection of maximum density points
  - reduced major axis
- Zeide models

## SM — Statistical modelling

**SM-01 Height–diameter models**
- Näslund ✓
- Michailoff ✓
- Curtis ✓
- Power ✓
- Chapman–Richards ✓
- Weibull ✓
- Petterson
- Prodan
- Korf
- Wykoff
- Schnute
- Henricksen
- Meyer
- Logistic
- Gompertz
- Sloboda
- Generalized height–diameter models: with stand variables, e.g. Cañadas, Sharma and Parton, Mehtätalo
- Mixed-effects height–diameter models and calibration (with a few measured heights)

**SM-02 Nonlinear regression**
- Gauss–Newton
- Levenberg–Marquardt ✓
- Weighted least squares (variance functions: power, exponential)
- Starting value strategies (grid, linearisation)
- Profile likelihood confidence intervals
- Bootstrap confidence intervals

**SM-03 Mixed-effects models**
- Linear mixed models (REML, ML)
- Nonlinear mixed models (Lindstrom–Bates)
- Random effect calibration (BLUP; Lappi)
- Nested and crossed random effects
- Variance and correlation structures: AR(1), CAR

**SM-04 Simultaneous and compatible systems**
- Seemingly unrelated regression (SUR)
- Nonlinear SUR (NSUR)
- Three-stage least squares (3SLS)
- Full information maximum likelihood (FIML)
- Compatible taper–volume systems
- Additive biomass systems (Parresol)

**SM-05 Mortality and survival models**
- Logistic regression (tree level)
- Complementary log–log (for different measurement intervals)
- Cox proportional hazards
- Weibull survival
- Parametric and semi-parametric survival
- Zero-inflated models

**SM-06 Model evaluation**
- Model performance measures
  - Bias ✓
  - RMSE ✓
  - MAE ✓
  - R² = 1 − SSE/SST ✓
  - modelling efficiency (EF)
  - AIC ✓ (in Growth Function)
  - BIC
- Theil U
- Freese χ² accuracy test
- Reynolds test
- Equivalence tests (Robinson and Froese)
- Cross-validation: k-fold, LOO, by plot ✓
- Relative ranking (Poudel and Cao) ✓

**SM-07 Uncertainty quantification**
- Delta method
- Bootstrap: parametric, non-parametric, residual bootstrap
- Monte Carlo error propagation
- Bayesian estimation (MCMC)
- Distinction between prediction intervals and confidence intervals

## ML — Machine learning and spatial prediction

**ML-01 Regression and classification with machine learning**
- Random forest
- Gradient boosting: XGBoost, LightGBM
- Support vector machines
- Artificial neural networks (MLP)
- Cubist
- MARS
- GAM
- Variable importance: permutation, SHAP

**ML-04 k-NN imputation**
- k-NN: Euclidean, Mahalanobis
- MSN (Moeur and Stage)
- GNN (Ohmann and Gregory)
- Random-forest-based proximity (RF-kNN)
- Weighting schemes

**ML-05 Spatial interpolation**
- Inverse distance weighting (IDW)
- Simple, ordinary and universal kriging
- Regression kriging
- Co-kriging
- Variogram models: spherical, exponential, Gaussian, Matérn
- Spline (thin-plate)

**ML-06 Spatial cross-validation**
- Block cross-validation
- LOO with a buffer
- Clustered k-fold (spatial k-fold)
- Distance-based folds (Roberts et al.)
- Area of applicability (Meyer and Pebesma)

**ML-07 Small area estimation**
- Direct estimator
- Synthetic estimator
- Fay–Herriot (area level)
- Battese–Harter–Fuller (unit level)
- EBLUP
- Hierarchical Bayes

**ML-08 Model-assisted inference**
- Model-assisted GREG
- Difference estimator
- Lidar-assisted inventory estimators (Gregoire et al.; Næsset)
- Hybrid inference (Ståhl et al.)
- Comparison of model-based and design-based inference

## DS — Decision support and applications

**DS-01 Timber valuation**
- Net present value (NPV)
- Faustmann (land expectation value, LEV)
- Internal rate of return
- Equivalent annual income
- Stumpage value (residual value method)
- Optimal rotation age
  - Faustmann
  - maximum mean annual increment
  - maximum forest rent

**DS-02 Harvest scheduling optimisation**
- Model I and Model II (Johnson and Scheurman)
- Linear and integer programming
- Goal programming
- Adjacency constraints: URM, ARM
- Heuristics: tabu search, simulated annealing, genetic algorithm
- Area and volume control methods

**DS-04 Dead wood and habitat structure**
- Dead wood volume: line intersect, fixed area
- Decay classes (Maser; Hunter)
- Habitat tree typology (Larrieu et al.)
- Index of Biodiversity Potential (IBP)
- Old-growth indicators

**DS-05 Damage assessment**
- Fire severity measures: bark char height, crown scorch, probability of mortality (Ryan and Reinhardt)
- Wind damage risk: GALES, HWIND
- Insect damage classification
- Crown condition and defoliation classes (ICP Forests)
- Estimation of damaged wood volume and value loss

**DS-06 Urban tree inventory**
- i-Tree Eco and Streets approaches
- Urban tree biomass equations (Nowak; McHale)
- Tree appraisal
  - CTLA (Council of Tree and Landscape Appraisers)
  - Burnley
  - Helliwell
- Risk assessment: ISA TRAQ
- Ecosystem service estimates: rainfall interception, air pollution removal
