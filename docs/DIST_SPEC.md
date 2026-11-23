# Diameter distribution tool: research, technical specification and staged development prompts

Prepared: 10 Nov 2026  
Goal: Turn the existing Weibull tool into a diameter distribution analysis tool that works in Turkish and English and can be used in forestry research.

This document is a literature review and development specification. The original text was written without examining the website's source code; corrections made against the existing code are marked with **[Rev]** in Section 0 and in the relevant prompts (10 Nov 2026, with user approval). The reference numbers in the document were checked with independent Python/SciPy calculations; this does not mean that the existing web application has been tested.

## 0. Revision notes and decisions (10 Nov 2026)

The original document was prepared by the user; the corrections below were made with user approval after examining the existing code and the two uploaded sources (Poudel and Cao 2013; Parresol 2003, both read). All reference numbers in Section 8 were recomputed and verified with SciPy 1.18.1 (PDF/CDF/median to 12 digits; M8 roots 0.1915 and 2.5, M9 roots 0.3986 and 2.5; M10 → a = 5; Parresol inputs).

1. **The name Dmin.** Poudel and Cao's "D0" is the smallest diameter in the stand. Because D0 is used on the platform, in the Plot and Stand tool, to mean the dominant diameter, the minimum diameter is called **Dmin** in this tool and in this document; the source notation is mentioned only in the explanation.
2. **Variance divisor.** The user said "as in Poudel"; the paper does not state the divisor (only "diameter variance, Dvar"). Decision: the default is the **n divisor** (v = Σ(d−m)²/n). Rationale: the paper's moment equations (m = a + bG1, v = b²(G2 − G1²), Dq² = a² + 2abG1 + b²G2) are theoretical moments, and the identity Dq² = m² + v holds only with the n divisor; only then do M2 and M3 give the same result. The n−1 divisor s² remains an option. Consequence: the published 1.0.0 Weibull moment method uses n−1; in 2.0.0 the default result changes by the factor (n−1)/n, and this is written in the release notes.
3. **Basal area diameter distribution: descriptive only, optional P23.** Poudel and Cao and Parresol contain no method for it. Kangas and Maltamo (2000) [R23], uploaded later by the user, was read: it defines the basal area diameter distribution (the distribution in which trees are weighted by their basal area; the natural output of angle-count sampling), estimates the diameters at 12 basal area percentiles with SUR, interpolates between percentiles with a Späth rational spline, and converts to tree numbers by dividing the class basal area by the basal area of the class mean tree (Equation 1). The paper **does not include fitting a parametric distribution to basal-area-weighted data**; Gove and Patil (1998), cited for the size-biased likelihood, was not read. Therefore: (i) the empirical basal area distribution, its percentiles and the class conversion were added as P23; (ii) basal-area-weighted fitting of parametric families and hectare-weighted pooling of plots of different sizes remain out of scope; (iii) the Finnish coefficients in the paper are not embedded in the tool.
4. **What the existing tool lacks.** The published tool has no free three-parameter Weibull and no percentile estimator (P05 was corrected accordingly). If a measurement threshold is declared, the tool currently blocks fitting; P11 replaces this with the conditional likelihood. The earlier "Weibull only" decision (5 Nov 2026) is withdrawn by this document.
5. **Order.** P05 is run immediately after P01 (see "How to use", item 6).
6. **Rewrite decision.** The tool is rewritten on a new engine (`assets/lab/dist/`): the existing interface was built around a single distribution and a single workflow, and adapting it would cost more than rewriting it. To be reused: `core/` (import, number parsing, navigator, charts, export, statistical functions) and the formulas of the existing Weibull calculation core. The published tool (`assets/lab/weibull/`, `diameter-distribution.php`) stays **unchanged** until 2.0.0 is released; its tests (368 unit, 28 browser) are the regression reference for the new engine's Weibull results. The new tool is developed on a separate page not listed in the menu; after P15 acceptance it replaces `diameter-distribution.php` and the old code moves to `legacy/`.
7. **Source status.** [R1] and [R2] were read ([B]). It was verified in the sources that the Table 2 footnote swaps the names b/c ([R1]) and that Parresol does not recover ξ and that the third-equation attempt failed ([R2]). The other sources are marked [İ] or [D] in METHODS.md until they are read.
8. **Release rule.** Because every push goes live, a distribution or method does not appear in any menu until its own independent reference tests pass.
11. **Per-hectare stand table (23 Nov 2026, user decision; stage P25; amends decision 3).** A descriptive table of the mean number of trees per hectare by class over the plots of a period, with its standard error (plot as the unit, as in Plot & Stand Metrics; Cochran 1977). Hectare-weighted fitting of a distribution stays out of scope.
10. **Location estimated (23 Nov 2026, user request; stage P24).** The Weibull location a is estimated by one optional method, three-parameter ML (`weibull.ml3`), under the conditions of §3.5: 0 ≤ a < Dmin, a grid in a plus golden-section search (several starts), boundary diagnostics (no estimate when the likelihood rises towards Dmin or c ≤ 1). Source: ForestFit `fitWeibull` [R6] as package documentation [P], reference = the package's output. Hectare-weighted pooling stays out of scope (decision 3).
9. **Early release (10 Nov 2026, user decision; amends decision 6).** Without waiting for P15, the new tool was released at `diameter-distribution.php` as **2.0.0-beta.1** after P00, P01, P05, P02, P03, P04 and P08 were completed; the old Weibull tool was moved to `legacy/weibull/`. What is not yet available is stated inside the tool (class tables, measurement threshold, CSV/Excel, Weibull recovery, bootstrap/p-values). The version name 2.0.0 waits for P15 acceptance.
10. **P15 and 2.0.0 (11 Nov 2026, user decision).** P15 was implemented; the tool was named **2.0.0** (the naming condition in decision 9). At the user's request a "tool could not be loaded" warning was added to P15 (the hosting provider's bot protection can return HTML instead of the program files). Scope and remaining stages: `docs/DIST_P15.md`.

## How to use

1. Give this document to the AI that will do the coding as the project reference.
2. First send the "Common development instruction" and P00.
3. In later messages run only the next prompt. Do not move on to the next one until a prompt is complete and its checks have passed.
4. If the AI cannot keep the whole document in context, give it only the relevant technical specification section together with that stage's prompt.
5. P00–P15 deliver the first usable multi-distribution version; P16–P17 complete stand-level model development. P18–P23 are separate, optional extensions.
6. **Run order (Section 0, decision 5):** P00 → P01 → P05 → P02 → P03 → P04 → P08 → P10 → P06 → P07 → P09 → P11 → P12 → P13 → P14 → P15 → P16 → P17.

The priority order here is a product development proposal; it is not a universal ranking of how well the distributions perform.

## 1. Main finding of the research

Distribution choice, parameter estimation and parameter recovery are not the same thing. The interface and the calculation engine must handle them separately.

| Layer | Question it answers | Example |
|---|---|---|
| Distribution family | What is the probability model of the diameters? | Weibull, gamma, Johnson SB |
| Direct parameter estimation | How is this distribution fitted to measured diameters? | Maximum likelihood, moments, percentiles |
| Parameter recovery | Given the mean, Dq or percentiles, how are the parameters found? | Weibull moment/hybrid; Parresol SB |
| Stand-level estimation | How is the distribution of another stand predicted from variables such as N, H and age? | Parameter prediction models; summary statistic models + recovery |
| Numerical solution | How are the equations of the chosen statistical method solved? | Brent, Newton–Raphson, constrained optimisation |

For example, MLE and Newton–Raphson are not equivalent options in the same menu. MLE is an estimation principle, Newton–Raphson is a solution algorithm. Likewise, SUR should not be presented as an alternative to MLE applied to the diameters of a single plot. The SUR/CDFR approaches in Poudel and Cao belong to the context of estimating the coefficients of stand models from many plots. [R1]

### 1.1. Distribution and method matrix for the first version

Abbreviations: MLE = maximum likelihood; MOM = moments; CML = conditional maximum likelihood with fixed bounds; QME = quantile matching; MGE = minimum distance; PRM = parameter recovery model; PPM = parameter prediction model.

| Distribution | Basic parameters | Applicable methods for direct estimation | Recovery from summaries | Recommended first implementation |
|---|---|---|---|---|
| Weibull | Location a, scale b, shape c; a=0 for 2P | MLE, MOM, percentiles; also L-moments, probability plot regressions, MPS and various modified estimators | Mean–variance; Dq–variance; percentile pairs; moment–percentile hybrids | Keep the existing methods; direct fit with 2P/fixed a and Poudel M2–M10 |
| Gamma | Shape k, scale θ | MLE, MOM; also L-moments and general QME/MGE | Mean and variance or mean and Dq | 2P MLE + MOM |
| Johnson SB | Lower bound ξ, range λ, shapes γ and δ | CML, moments and percentiles with fixed ξ, λ; mode-based methods also exist in the literature; constrained numerical fitting for free bounds is a separate problem | Parresol: three parameters given ξ; Fonseca: four parameters from the median and the first three raw moments | Direct fit with fixed bounds + Parresol |
| Normal | μ, σ | MLE and MOM; general QME/MGE can be added | Mean and variance | MLE/MOM; indicator of negative diameter probability |
| Lognormal | μ, σ on the log scale | MLE from log diameters; MOM on the diameter scale; percentiles | Mean and variance or mean and Dq | 2P MLE + MOM |
| Beta, location–scale form | Lower L, upper U; shapes α, β | MOM and numerical MLE under fixed bounds; general QME/MGE | Bounds + mean and variance | MOM + MLE with fixed/explicitly specified bounds |
| Negative exponential / exponential | Rate r; optional fixed lower location a | MLE and MOM | Mean; if a is fixed, r=1/(mean−a) | Simple comparison model for the reverse-J shape |
| Log-logistic / Fisk | Scale b, shape c | Numerical MLE; two percentiles; log-moments; ordinary moments if the conditions hold | Two percentiles; mean–variance provided the moments are finite | MLE + two percentiles |

Forestry applications of Weibull, gamma, beta and Johnson SB have been treated in direct comparative studies. Normal and lognormal are also classical alternatives in the diameter distribution literature. Forestry applications also exist for families such as log-logistic, generalised gamma, Burr and Dagum. It should not be concluded that the same distribution is superior on every data set. [R3, R4, R5]

The "general QME/MGE" options in the table are general statistical extensions that use the distribution's PDF/CDF/quantile functions; it is not claimed that each of them was compared in the same forestry paper. [R8]

### 1.2. Options for the second stage

| Family / approach | Estimation approach | Positioning |
|---|---|---|
| Generalised gamma | Primarily numerical MLE; numerical MOM possible with enough independent moments | A more flexible positive family that includes gamma and Weibull; different parameterisations must be mapped explicitly |
| Burr XII | Numerical MLE; MOM with defined moments or percentile/MGE extensions | Can model long right tails; the existence of moments depends on the parameters |
| Dagum / Burr III | Numerical MLE; MOM with defined moments or percentile/MGE extensions | Must not be merged with Burr XII under the same name |
| Gumbel | MLE, MOM, L-moments | Minimum and maximum forms must be stated; the probability of negative diameters must be monitored separately |
| Finite mixtures | Mixture likelihood; EM or constrained direct optimisation | For multimodal structures; initially limited to two components |
| KDE / empirical percentile approach | Bandwidth selection or percentile interpolation | A comparison and exploration layer separate from the parametric distributions |

Special cases such as Rayleigh should not be duplicated as if they were new, independent methods: Rayleigh is a special case of Weibull with a particular shape. Although series approximations such as A-Charlier exist in the literature, including them in the first product scope is not recommended because of the risk that they do not give a valid non-negative density for all parameters.

**Naming trap:** In some forestry publications "generalized beta" is used for the four-parameter beta with added location and scale. This does not automatically mean other generalised beta families such as GB1/GB2. Compare the formulas first; do not list the same distribution as two different families. [R3]

## 2. Common scientific and computational specification

### 2.1. Data and units

- The response is the diameter distribution by number of trees. The basal area diameter distribution is handled only descriptively, in P23; parametric weighted fitting and hectare-weighted pooling are **out of scope** (Section 0, decision 3).
- d: diameter, cm. n: number of trees actually observed. N: number of trees per hectare. G: basal area, m²/ha. Plot area: m².
- Mean m=Σd/n; second raw moment m2=Σd²/n; Dq=√m2; moment variance v=Σ(d−m)²/n. Hence m2=m²+v.
- If the sample variance s² with the n−1 divisor was used, record the conversion v=(n−1)s²/n. **Decision (Section 0, decision 2):** in moment methods and recovery the default v uses the n divisor; s² with the n−1 divisor is an explicit option, and the result states which one was used.
- A true integer frequency shows how many trees were observed at the same diameter. A per-hectare expansion factor or a sampling weight is not a number of independent observations.
- n and N must not be converted into each other and used interchangeably, especially in M10, the likelihood, BIC and bootstrap operations.
- Plot, period and, where needed, species fields must be kept; repeated measurements of the same plot must not be spread across different folds in cross-validation.
- On import, the decimal separator and the CSV column separator are separate settings. Ambiguous thousands/decimal notation must not be guessed silently; the existing explicit import preference must be kept.

### 2.2. Three different bound concepts

1. **Distribution support:** Weibull a, beta L/U, Johnson ξ and ξ+λ.
2. **Measurement threshold / truncation:** For example, recording only trees with d≥8 cm.
3. **Sample minimum/maximum:** The smallest/largest value observed in the uploaded file.

These are not the same. Do not automatically take the sample minimum as the true lower bound of the distribution. In beta and Johnson SB, placing observations exactly on the bound can cause transformation/likelihood problems. If a data-based bound-setting rule is used, the rule, unit, setting and data dependence must be visible; do not apply fixed numbers to all species as if they were a universal rule.

### 2.3. Truncation and classed data

If the interval L≤D≤U is observed:

$$
f_T(d)=\frac{f(d)}{F(U)-F(L)},\qquad
F_T(d)=\frac{F(d)-F(L)}{F(U)-F(L)}.
$$

For a continuous distribution, writing the endpoints as open or closed does not change the probability. For U=∞, F(U)=1. The fitting must also be done through the likelihood of this conditional distribution. Fitting the untruncated distribution first and then only cutting the chart is not correct. Do not plug the mean/percentiles of a truncated sample directly into the untruncated recovery equations; if this is not supported, disable the option.

Expected probability for the diameter class [l_j,u_j):

$$p_j=F(u_j)-F(l_j).$$

In the conditional model F_T is used instead of F. For classed observations the log-likelihood, apart from a constant independent of the parameters, is Σn_j log(p_j). Do not replicate class midpoints n_j times and present this as the raw-diameter MLE.

N_j=N×p_j. If the classes cover the whole relevant support, the total expected frequency must be N. Show the tail probability outside the finite plotting range separately; do not rescale silently. Distinguish whether unobserved classes have zero frequency or are outside the record.

### 2.4. Goodness-of-fit measures and uncertainty

- The log-likelihood must be computed on the original diameter scale. In models that use a log transformation, the Jacobian must not be neglected.
- AIC=2k−2ℓ, BIC=k ln(n)−2ℓ. Standard comparison must be made for the same observations, the same observation process, the same units and comparable MLE fits.
- A log score can be computed for MOM/recovery; do not add these to the standard MLE-AIC ranking without justification. The local parameter count of an externally supplied model does not represent the complexity of the whole training process.
- A bound that is genuinely fixed externally is not the same as a bound chosen from the same data. Do not produce a misleading advantage through a low k by ignoring the complexity of data-determined bounds.
- If AICc is added, state its applicability and the assumptions of the small-sample correction; do not compute it when n≤k+1. Do not treat it as automatically valid in irregular problems such as mixtures and endpoint estimation.
- KS, AD and Cramér–von Mises statistics can be given. When parameters are estimated from the same data, do not use the standard p-values for a distribution with known parameters.
- For a parametric bootstrap p-value, the same parameter estimation and the data-determined bound/measurement/rounding process must be repeated in every sample. Monte Carlo p=(1+number of statistics greater than or equal to the original)/(B+1).
- If measurement rounding creates ties, the same rounding must be applied to the bootstrap samples or a suitable interval likelihood must be used. Do not add random jitter to hide ties.
- Poudel's definition of EI: Σ_j |N_j,observed−N_j,predicted|, unit trees/ha. The handling of classes and tails must be the same across models. Give the L1 error computed with raw counts a different name/unit.
- Optimisation failure, undefined moments, boundary solutions and multiple solutions must be reported as separate states.
- Do not use Wald intervals automatically in every model. Report the validity of the approach used for parameter uncertainty and the bootstrap failure rate.

The correct two-sided definition of KS, on sorted raw data:

$$
D^+=\max_j\left[\frac{j}{n}-F(d_{(j)})\right],\quad
D^-=\max_j\left[F(d_{(j)})-\frac{j-1}{n}\right],\quad
D=\max(D^+,D^-).
$$

The safeguard rules in this section are not direct quotations from the sources but technical design recommendations prepared for research software. The general reference for the bootstrap approach is [R9].

## 3. Implementation equations for the distributions

The expressions below are implementation forms of the distribution definitions in the sources, written with the standard moment and likelihood relations. Methods belonging to a specific paper are named separately; general algebraic derivations must not be presented as if they were new paper-specific methods.

### 3.1. Normal

Parameters μ∈R, σ>0. MLE: μ=m, σ²=v. MOM gives the same parameters. The interface must not show this equality as if there were two different results. The probability of negative diameters Φ(−μ/σ) must be reported. For the truncated normal these closed formulas are not the MLE; the conditional likelihood is optimised. [R10]

### 3.2. Lognormal

Parameters μ=E[ln D], σ>0. Here μ is not the arithmetic mean in cm.

MLE: μ=mean(ln d), σ²=mean[(ln d−μ)²].

MOM / recovery:

$$
\sigma^2=\ln(1+v/m^2),\qquad \mu=\ln m-\sigma^2/2.
$$

E[D]=exp(μ+σ²/2), E[D²]=exp(2μ+2σ²). For given m and Dq, v=Dq²−m² is used. d≤0 is not accepted. The first version is the unshifted 2P form; a third location parameter must be added as a separate model/method. [R11]

### 3.3. Gamma

Shape k>0, scale θ>0:

$$f(d)=\frac{d^{k-1}e^{-d/\theta}}{\Gamma(k)\theta^k},\quad d>0.$$

MOM: k=m²/v, θ=v/m.

MLE: solve the equation ln(k)−ψ(k)=ln(m)−mean(ln d); then θ=m/k. ψ is the digamma function. The shape equation requires the constraint k>0 and a check for degenerate data. In libraries that use the rate, the conversion rate=1/θ must be made explicitly. If the L-moment method is added, its own equations must be used; it must not be presented by relabelling MOM. [R12, R13]

### 3.4. Location–scale beta

Y=(D−L)/(U−L) and Y~Beta(α,β). α,β>0; L<U.

S=U−L, μ_y=(m−L)/S, v_y=v/S²:

$$
t=\frac{\mu_y(1-\mu_y)}{v_y}-1,\quad
\alpha=\mu_y t,\quad \beta=(1-\mu_y)t.
$$

For MOM, 0<μ_y<1 and 0<v_y<μ_y(1−μ_y) must hold. MLE optimises the beta log-likelihood under fixed L/U; when moving to the D scale the term −n ln(S) must be included. Free L/U estimation must not be made a hidden option of the fixed-bound method. [R14]

### 3.5. Weibull: direct fit

**Standard naming:** a=location, b=scale, c=shape.

$$
F(d)=1-\exp[-((d-a)/b)^c],\quad d>a,\quad b,c>0.
$$

In the 2P model a=0. With fixed a and y_i=d_i−a>0:

$$
\frac1c+\overline{\ln y}
-\frac{\sum_i y_i^c\ln y_i}{\sum_i y_i^c}=0,\qquad
b=\left(\frac1n\sum_i y_i^c\right)^{1/c}.
$$

These are the MLE equations under fixed a. With free a, the three-parameter likelihood can behave irregularly/unboundedly, especially as a approaches the observed minimum. "Successful optimisation" alone is not proof of a valid global MLE. In the first version, examine the existing 3P behaviour; add a new free 3P method only with explicit constraints, multiple starts and boundary diagnostics.

The ForestFit documentation lists MLE/MOM/percentile/L-moment and regression options for 2P, and MLE, modified moments/likelihood, MPS and T-L-moment options for 3P. It is not necessary to carry all of these into the first version. Each method must be added separately, after verifying its original definition and validity conditions. [R6]

### 3.6. Weibull: Poudel and Cao (2013)

Source: The uploaded "Evaluation of Methods to Predict Weibull Parameters for Characterizing Diameter Distributions", especially Table 2 and printed pp.245–247. [R1]

Let G_r(c)=Γ(1+r/c), m=mean, v=variance, q=Dq:

$$
m=a+bG_1,\quad v=b^2(G_2-G_1^2),\quad
q^2=a^2+2abG_1+b^2G_2.
$$

Positive scale solution:

$$
B_q(c)=\frac{-aG_1+\sqrt{a^2G_1^2+G_2(q^2-a^2)}}{G_2}.
$$

Let Q_p be the p percentile and A_p=−ln(1−p). For 0<p<r<1:

$$
C_{p,r}(a)=
\frac{\ln(A_r/A_p)}{\ln[(Q_r-a)/(Q_p-a)]},\qquad
b=\frac{Q_p-a}{A_p^{1/c}}.
$$

| Source method | Required targets | Operation |
|---|---|---|
| M1 | Training targets for a, b, c and stand predictors | Direct parameter prediction; not a PRM |
| M2 | m, v; a policy | b=(m−a)/G1; solve b²(G2−G1²)=v for c |
| M3 | q, v; a policy | b=Bq(c); solve b²(G2−G1²)=v for c |
| M4 | Q31, Q63; a policy | c=C.31,.63(a); b from the percentile equation |
| M5 | Q50, Q95; a policy | c=C.50,.95(a); b from the percentile equation |
| M6 | q, Q25, Q95; a policy | c=C.25,.95(a); b=Bq(c) |
| M7 | q, Q31, Q63; a policy | c=C.31,.63(a); b=Bq(c) |
| M8 | m, Q95; a policy | b=(Q95−a)/A.95^(1/c); solve a+bG1=m |
| M9 | q, Q95; a policy | Same b; solve a²+2abG1+b²G2=q² |
| M10 | q, Q25, Q50, Q95, Dmin and n | a=(n^(1/3)Dmin−Q50)/(n^(1/3)−1); c=C.25,.95(a); b=Bq(c) |

For M2–M9 the source uses a=0.5×predicted Dmin. Dmin is the stand's minimum diameter target (source notation D0; see Section 0, decision 1); it is not synonymous with the mathematical Q(0)=a. A user-supplied a can use the same recovery equations but must not be labelled "the same location policy as the source".

M10 needs more inputs than its heading suggests: Dmin and the plot's n are required; n>1 must hold. An invalid value produced by the location formula must not be silently pulled to zero.

In M6/M7/M10 the shape comes from the percentile ratio and the scale from Dq. With conflicting targets, all percentiles are not expected to be matched exactly. Show the target and back-calculated values.

**Multiple roots:** M8 and M9 do not guarantee a single solution for every input. In the example in Section 8 both have two positive shape solutions. Do not give the root found from the starting value as the single correct result. Report the parameter range searched and the candidates found. If raw data are available, a choice can be made with an additional goodness-of-fit measure; otherwise keep the ambiguity unless there is an additional constraint/preference.

**Corrections needed when transcribing the source:**

- The Table 2 footnote swaps the names b/c; consistent with the main distribution equation, b=scale, c=shape must be used.
- The parenthesisation in the second term of the printed K–S Equation 7 appears to be wrong; the standard definition in Section 2.4 must be applied.
- mLogL is not the "mean log-likelihood" but the negative log-likelihood. The code field should be negative_log_likelihood.
- In M1's SUR description a, b, c are targeted, while the CDFR section states that for models 1–9 a is computed from Dmin. When the source approach is selected this distinction must be defined explicitly; the same a policy must not be applied to all of them.

### 3.7. Johnson SB: direct fit

ξ lower bound, λ>0 range, δ>0 and γ∈R shape parameters:

$$
z=\gamma+\delta\ln\frac{d-\xi}{\xi+\lambda-d},\quad
F(d)=\Phi(z),
$$

$$
f(d)=\phi(z)\frac{\delta\lambda}{(d-\xi)(\xi+\lambda-d)},\quad
Q_p=\xi+\lambda\,\operatorname{logistic}
\left(\frac{\Phi^{-1}(p)-\gamma}{\delta}\right).
$$

Under fixed ξ and λ, t_i=ln[(d_i−ξ)/(ξ+λ−d_i)]:

$$\delta=1/s_t,\qquad\gamma=-\bar t/s_t.$$

Here s_t² is the transformed variance with the n divisor. This is the conditional MLE of the two shape parameters; it is not the joint MLE of the four parameters.

With fixed bounds and two percentiles, t_p=logit[(Q_p−ξ)/λ], z_p=Φ⁻¹(p):

$$\delta=(z_r-z_p)/(t_r-t_p),\qquad\gamma=z_p-\delta t_p.$$

The 50/95 choice can be used as the corresponding implementation of the Knoebel–Burkhart approach. The moment method requires a numerical solution that matches the mean/variance from transformed normal integrals under fixed bounds.

The CML/MM/KB and Bayesian options in ForestFit are run, in the documentation, with ξ and λ specified in advance. The package uses certain data-based bound constants; these constants must not be made a product assumption independent of species, unit and data coverage. The Bayesian method also requires a prior, chain convergence and an uncertainty design, so it was not included in the first scope of this package. [R7]

Mode-based Johnson SB methods also appear in the forestry literature. Because of the sensitivity of the sample mode to classing/bandwidth and the possibility of more than one peak, this method needs a separate definition and validation; the priority here is on the CML, moment, percentile and recovery approaches. [R3]

### 3.8. Johnson SB: Parresol (2003) recovery

Source: The uploaded "Recovering Parameters of Johnson's SB Distribution", especially printed pp.3–5, Equations 9–16. [R2]

Inputs: N, G, mean diameter m, median M and a given/predicted ξ. Alternatively, Dq can be entered directly instead of N/G.

$$K=\pi/40000,\qquad q^2=Dq^2=\frac{G}{KN}.$$

From the median condition:

$$\gamma=\delta\ln\left(\frac{\xi+\lambda-M}{M-\xi}\right).$$

Let Z~N(0,1), Y=logistic[(Z−γ)/δ], u_r=E[Y^r]:

$$
\xi+\lambda u_1=m,\qquad
\xi^2+2\xi\lambda u_1+\lambda^2u_2=q^2.
$$

These two equations are solved for λ and δ; γ is computed from the median. **Parresol does not recover ξ in this step.** When the lower bound is given externally, it recovers three parameters: the range and the two shapes.

u1 and u2 are normal-weighted integrals. Stable quadrature and positive parameter transformations can be used. The source uses a bivariate Newton–Raphson; another reliable solver that satisfies the same equations can be used, with separate algorithm information. For two residuals with different units, use scaled convergence and then verify in the original units.

Checks: N>0, G>0, m>ξ, M>ξ, q²≥m²; in the solution λ>M−ξ, δ>0. These are necessary conditions, not a guarantee of a valid/unique solution for every input. Use multiple starts and an identifiability check.

The source also contains a lower-bound extrapolation from the three smallest diameters and species/data-set-specific stand equations. Do not make these the general default. If a lower-bound heuristic is wanted, it must be added with separate source verification. The mean, variance and second raw moment are not three independent pieces of information; do not claim to solve for the missing fourth parameter using only these.

### 3.9. Exponential and log-logistic

For the exponential with fixed a, F(d)=1−exp[−r(d−a)], r>0. MLE and MOM give the same result: r=1/(m−a). The rate r and the scale 1/r must not be confused. Do not run a linear regression on the logarithm of class frequencies and call it the raw-data MLE. [R15]

Log-logistic/Fisk:

$$F(d)=\frac1{1+(b/d)^c},\qquad Q_p=b\left(\frac{p}{1-p}\right)^{1/c}.$$

With two percentiles:

$$
c=\frac{\operatorname{logit}(r)-\operatorname{logit}(p)}
{\ln(Q_r/Q_p)},\qquad
b=\frac{Q_p}{[p/(1-p)]^{1/c}}.
$$

The MLE is numerical. The ordinary mean exists for c>1 and the variance for c>2. Therefore mean–variance MOM/recovery must be restricted to c>2. The log-moment approach is different: b=exp[mean(ln d)], c=π/√[3 var_n(ln d)]. This method must be shown under the name "log-moment". [R16]

## 4. Prediction from stand variables

### 4.1. PPM, PRM and regression

A PPM links distribution parameters estimated from plots to stand variables. A PRM first predicts targets such as moments/percentiles and then recovers the distribution parameters from them. If the user only enters summaries by hand, no regression training is needed.

Poudel and Cao's general form of the stand equation:

$$
y=\exp[\beta_1+\beta_2RS+\beta_3\ln N+\beta_4\ln H+\beta_5/A]+\varepsilon,
\quad RS=\frac{\sqrt{10000/N}}{H}.
$$

H represents the dominant/codominant height; A is age. OLS on ln(y) is not the same objective function as the paper's equation with an additive error on the original scale. NLS suited to the original model and multi-response SUR must be defined separately, and log-OLS separately.

In SUR the residual covariance of the response equations must be taken into account. Do not run an independent regression for each target and call it "SUR". Do not train a regression model with a single plot; enough independent plots and validation are required. When the species/region changes, do not use the paper's coefficients as a universal prediction model.

### 4.2. CDFR and modified CDFR

For CDFR, the observed cumulative position of the sorted tree j in plot i is (j−0.5)/n_i:

$$
\sum_i\frac1{n_i}\sum_j
\left[\frac{j-0.5}{n_i}-F(d_{ij};\theta_i(\beta))\right]^2.
$$

What is optimised here are the β coefficients of the multi-plot stand model. Fitting a CDF distance to the parameters of a single plot is a separate minimum distance method; it must not be mixed up with this stand CDFR implementation under the same name.

Modified CDFR:

$$
\sum_i\frac1{m_i-1}\sum_{j=1}^{m_i-1}
[C_{ij}-F(u_{ij};\theta_i(\beta))]^2.
$$

C_ij is the observed cumulative class proportion and u_ij the upper class bound. The source adds +1 to the midpoint for 2 cm classes; in the software use the general upper bound. Excluding the last class belongs only to this source objective function. The last class must not disappear from the histogram, the total number of trees or the classed MLE. m_i>1 is required.

Keep the per-plot normalised weighting. Record the ordering/plotting position rule for equal diameters and the class edges. If a weighting or a truncated CDF different from the source mode is used, define the result explicitly as "extended CDFR".

## 5. Common development instruction

Send together with P00 in the first message:

~~~text
We will develop the existing diameter distribution tool in stages according to the technical specification in this document. First examine the existing code and the project instructions. Do not assume the technology stack; fit the existing architecture.

In each message implement only the scope of the specified prompt. Keep the working Weibull features and the existing plot/period navigation, and connect them to reusable components. Do not make large, unrelated rewrites.

Distribution family, statistical estimation method, parameter recovery, stand regression and numerical solver must be separate concepts. Do not add methods that are not yet implemented to the menu as if they worked.

In the Turkish and English interfaces the default decimal separator should be the point. Keep numerical values as numbers throughout the calculation; do the formatting in the presentation layer. Keep existing explicit user preferences, if any.

In the formulas, the parameter definition, support, unit, fixed/free parameters and validity conditions must be explicit. Do not transfer source coefficients to other species and regions as if they were a universal model. Do not show unsolvable or ambiguous results as successful results.

At the end of each stage, briefly report the changed behaviour, the checks that were run and the known limitations. Verify calculation changes with independent references; do not settle for tests that merely repeat your own function. Do not cover an unfinished calculation with fake data or placeholder results.
~~~

## 6. Main development prompts

### P00 — Examination of the existing application

~~~text
Examine only the existing diameter distribution tool and prepare an actionable change map for this revision.

Identify Weibull's current parameterisation, the supported estimation/recovery methods, data import, plot/period grouping, diameter classes, goodness-of-fit measures, and the chart and export components. Find where number formatting and the TR/EN translations are managed.

Map the features requested in this document as "existing", "must change" and "to be added". If any part of the existing behaviour disagrees with the source formulas, show it explicitly. If the source PDFs are not accessible, do not pretend to have read them; take the verified technical specification in this document as the reference.

Evaluate the gamma/digamma, normal CDF/quantile, optimisation and integration capabilities of the numerical library in use. If necessary, propose a small dependency; do not assume a change of technology stack.

Output: relevant files, behaviours to keep, changes to make, stage dependencies and a short implementation note. Do not make large code changes at this stage.

[Rev] Verify the known state in Section 0 (the existing tool has no free 3P and no percentile estimator; MOM uses the n−1 divisor; fitting is blocked when a threshold is declared) and propose the file layout of the new engine (assets/lab/dist/).
~~~

### P01 — Common distribution engine and data contract

~~~text
Following the P00 findings, implement the common distribution interface and the method registry.

Each distribution must provide its own id, parameter schema, support bounds, pdf/logpdf, cdf/logcdf, survival/log-survival, quantile and the applicable moment functions. Parameter estimation, recovery from summaries and stand model links must be registered as separate capabilities.

Add to the result contract the data/plot/period used, the method, fixed/free parameters, bound policy, units, sample size, objective value, convergence, warnings and source id. Do not make irrelevant fields required.

Use stable logarithmic computations in numerical operations. Produce a structured error for data outside the support or for undefined moments. Do not hide errors by adding arbitrary small constants to the density.

Connect the existing Weibull to this interface with an adapter. The method selector must show only supported data/method combinations. Make the point the common decimal formatting default.

[Rev] The decimal standard and the common plot navigator (core/unitnav.js) are ready; do not rewrite them, use them. The new tool is developed under assets/lab/dist/, without touching the published Weibull tool, on a separate page not listed in the menu (Section 0, decision 6). For long computations (P14 bootstrap, P17 training) the calculation core is kept independent of the DOM so that it can run inside a Web Worker.

Acceptance: Existing Weibull results must be preserved within tolerance; support/parameter validation must work; adding a distribution family must not require rewriting the existing interface.
~~~

### P02 — Normal and lognormal

~~~text
Add the normal and two-parameter lognormal distributions according to Sections 3.1–3.2.

Implement MLE/MOM for the normal and the MLE and MOM methods for the lognormal. Connect recovery from mean–variance or mean–Dq inputs to a separate workflow. Label that the lognormal μ and σ are on the log scale.

Distinguish the moment variance from the sample variance with the n−1 divisor. Add explicit validation for zero variance, insufficient data and, for the lognormal, zero/negative diameters. Show the normal model's probability of negative diameters.

Use the log-likelihood on the original diameter scale; do not neglect the Jacobian of the log transformation. Until truncation is supported, do not present the closed-form MLE option with truncated data as if it were supported.

Acceptance: The normal/lognormal PDF, CDF and quantile references in Section 8 must be met. Moment recovery must reproduce the given m and Dq values. If normal MLE/MOM give the same result, state why in the short method description.
~~~

### P03 — Gamma

~~~text
Add the two-parameter gamma distribution according to Section 3.3.

For MOM use k=m²/v and θ=v/m. For MLE solve the digamma equation for the positive shape parameter stably; compute the scale as m/k. If the library used expects a rate, make the conversion explicitly.

Connect the PDF/logpdf, CDF and quantile functions to the common interface. Add MOM recovery from mean–variance and mean–Dq inputs. Do not present a free-location gamma as the same model as this method.

Separate the cases of zero/negative diameter, zero variance, overflow and non-convergence. When the solver fails, do not silently return the MOM result under the MLE label.

Acceptance: The Section 8 reference must pass. For MLE, compare parameters and log-likelihood with an independent statistics library on the same sample data. The shape/scale units and definitions must be consistent in the TR/EN interface.
~~~

### P04 — Beta and the bound policy

~~~text
Implement the location–scale beta distribution according to Section 3.4. The first scope is the estimation of the two shape parameters with MOM and MLE under explicitly specified fixed L and U.

The user must be able to set the bounds; if there is an automatic bound suggestion, the rule used and its data dependence must be visible. Do not turn the empirical minimum/maximum into the true support bound without explanation. Do not shift observations on the bound with a silent epsilon/jitter.

Check the MOM admissibility inequalities. Compute the MLE on the original diameter scale, including the scale transformation. Report observations outside the bounds as errors.

Do not duplicate the same location–scale beta formula as two separate models under the names "beta" and "generalized beta". GB1/GB2 are not within the scope of this stage.

Acceptance: Moments generated from known α, β, L, U parameters must be recovered; the Section 8 reference must be met; inadmissible bound/moment combinations must not appear as computed results.
~~~

### P05 — Rework of Weibull direct estimation

~~~text
Compare the existing Weibull functions with Section 3.5 and make them compatible with the common engine.

Standardise the naming as a=location, b=scale, c=shape; map the external library's names in the adapter. The two-parameter a=0 and user-fixed a options must be explicit.

Keep and verify the MLE under fixed a and the existing direct MOM method. [Rev] The existing tool has no percentile estimator and no free three-parameter method: add direct estimation with two percentiles (the C_{p,r}(a) and b relation in Section 3.6, user-defined p<r) as a new method; do not add free location optimisation. The default in the MOM variance is the n divisor (decision 2); the difference from the existing 1.0.0 results must come only from this factor, and in the tests the old results must be reproduced exactly with the n−1 option.

Keep the method name and the numerical solver name separate. Report iterations, tolerance, convergence and boundary warnings. If renaming breaks old records, provide an explicit compatibility conversion.

Acceptance: No regression in the existing functions. PDF/CDF/quantile must be verified for known Weibull parameters; the fixed-location MLE must be compared with an independent reference. The displayed decimal separator must be the point in TR/EN.
~~~

### P06 — Weibull moment and percentile recovery

~~~text
Implement Poudel's M2, M3, M4 and M5 recovery methods from Section 3.6 with separate ids.

M2: mean–variance. M3: Dq–variance. M4: Q31–Q63. M5: Q50–Q95. Show the required inputs according to the method; do not ask for unnecessary fields.

The location policy must be chosen separately: the source-consistent a=0.5×predicted Dmin or an explicitly given a. In the interface the name is Dmin; the explanation carries the note "D0 in Poudel and Cao". Do not confuse Dmin with the theoretical zeroth percentile. Record whether each input target was measured or predicted.

Search for the moment roots in the positive c range and check valid b and residuals. For percentiles, verify the ordering, the p/r range and the condition Qp>a. If empirical percentiles are computed, record the quantile definition used.

Acceptance: a=5, b=20, c=2.5 must be recovered from the synthetic Weibull targets in Section 8. The same method must also be able to work by computing summaries from raw data; this workflow and stand regression must not be mixed up.
~~~

### P07 — Weibull hybrid recovery

~~~text
Add the M6–M10 methods from Section 3.6. The required inputs and the a policy of each method must be defined correctly.

In M6/M7, c must be computed from the percentile ratio and b from Dq. In M8/M9, Q95 and the moment equations must be solved together. For M10, Dmin, Q50 and the plot's n must also be required; N/ha must not be used.

For M8/M9 do not present the first root of a single-start solver as the only result. Search for root candidates in a stated range, merge repeated roots and preserve the multiple-solution state. The parameter range and the selection rule must be in the result metadata. Do not add a hidden c>1 constraint.

Show the input targets and the moments/percentiles back-calculated by the model. In hybrid methods do not assume that all targets must be matched exactly.

Acceptance: In the Section 8 example the two positive roots of M8 and M9 must be detected. The M10 reference must pass. Results with no solution, multiple solutions and a single valid solution must be distinguishable in the interface.
~~~

### P08 — Johnson SB direct fit

~~~text
Add the Johnson SB distribution according to Section 3.7: ξ lower bound, λ range, γ and δ shape; δ>0.

First implement CML, two-percentile and numerical moment methods under fixed ξ and λ. In CML use the n-divisor variance of the logit transformation. Present the 50/95 percentile option with source information; if there is a user-defined pair, separate it as the general percentile method.

In the moment fit compute the normal-weighted integrals stably. Do not claim that the four parameters are estimated jointly. Check observations at and beyond the support ends, degenerate transformations and inadmissible moments.

Do not make the package constants that set the bounds a universal default. Verify with independent references that the PDF, CDF and quantile are obtained from the fitted parameters.

Acceptance: The ξ=5, λ=40, γ=0.6, δ=1.3 reference in Section 8 must be met. In symmetric/asymmetric and near-boundary examples, numerical errors must not be presented as success.
~~~

### P09 — Johnson SB Parresol recovery

~~~text
Add the Parresol (2003) method from Section 3.8 to the recovery-from-summaries workflow.

The inputs are N/ha, G m²/ha, mean diameter, median and ξ. Offer the alternative of entering Dq instead of N/G; if both are entered, check their consistency.

Express γ from the median equation. Solve λ and δ from the first and second raw moment equations. Preserve positivity with parameter transformations; scale the residuals and re-verify the result in the original units.

Define this method as "three-parameter recovery with ξ fixed". Do not embed Parresol's species-specific regression coefficients and starting equations as a general model. Handle in the calculation states that meeting the necessary conditions does not guarantee a unique/admissible solution.

Acceptance: λ=40, γ=0.6, δ=1.3 must be obtained from the Parresol inputs in Section 8; m, median and Dq must be verified back. On non-convergence or an identifiability problem, an explicit failure/ambiguity result must be returned.
~~~

### P10 — Exponential and log-logistic

~~~text
Add the exponential and log-logistic/Fisk distributions according to Section 3.9.

For the exponential, implement MLE/MOM under a=0 or an explicitly fixed a. Keep the labels rate r and scale 1/r separate. Present it as a simple comparison model that can be used for the reverse-J distribution.

For the log-logistic implement numerical MLE and two-percentile estimation. Name the optional log-moment option separately from ordinary MOM. Check the conditions c>1 for the mean and c>2 for the variance; do not show undefined moments as NaN or as a misleading number.

Connect both distributions to the registry, the charts and the output contract. Apply the parameter constraints explicitly; check the positive support conditions.

Acceptance: The Section 8 references must pass. Log-logistic percentile recovery must give the correct parameters from theoretical inputs; moment admissibility must be reported correctly in the cases c≤1 and 1<c≤2.
~~~

### P11 — Measurement threshold and truncated distributions

~~~text
Model the measurement threshold separately from the distribution support bound, according to Sections 2.2–2.3.

First implement the conditional PDF/CDF/log-likelihood in raw data under a lower threshold and, if needed, an upper threshold. Distribution fitting must be done with the likelihood of the selected truncation model; do not settle for just cutting the chart.

Closed-form MLE/MOM/recovery methods valid for the untruncated distribution must not be treated as automatically valid for truncated observations. Disable, with an explanation, the combinations whose conditional version is not yet implemented.

Compute the difference F(U)−F(L) stably in the extreme tails. In the results, the underlying distribution parameters, the observed conditional distribution and the threshold information must be separate. Whether N represents the trees above the threshold or the whole population must be chosen explicitly.

Acceptance: The integral of the conditional density over the selected observation range must be 1; the conditional CDF/quantile must be consistent. On simulated truncated data, results must be compared with an independent conditional likelihood calculation.
~~~

### P12 — Diameter classes and grouped data

~~~text
Add data entry with lower/upper class bounds and the true number of observations, according to Section 2.3.

Compute class probabilities from CDF differences. For the numerical MLE use Σn_j log(p_j). Do not present midpoint replication as the raw-data MLE. If unequal class widths and an open-ended last class can be supported, define them explicitly.

Separate integer observation frequency from per-hectare expanded weights. If only the expanded frequency is given, do not make up the unknown true n; restrict the standard AIC/BIC/p-value options according to their validity.

Observed classes with zero frequency and intervals outside the record must be handled separately. The histogram, expected counts, N/ha and tail probability must be produced from the same class edges.

Acceptance: For classes covering the whole support, the total probability must be 1 and the expected total N. A hand-calculated probability/likelihood reference must be met for the same classes; a wrong +1 constant must not be used when the class width changes.
~~~

### P13 — Model comparison and diagnostic charts

~~~text
Build a comparison table and a diagnostic view consistent with Section 2.4.

Show the distribution, estimation method, parameters, bound/truncation policy, n, convergence, log-likelihood, AIC/BIC where appropriate, KS/AD/CvM and class errors. Do not mix results that do not use the same data and observation process in the same ranking.

Separate the MLE comparison from the descriptive comparison of MOM/recovery results. By default, do not produce a single hidden composite "best model" score for all models; the user must see which measure the ranking uses.

Add density or expected class counts on the histogram, empirical/theoretical CDF, Q–Q and P–P charts. Do not mix chart axis units with density/count scales. Class comparisons must use common edges.

Acceptance: The two-sided KS formula and the Poudel EI unit must be correct. Until the bootstrap is complete, standard KS/AD p-values for estimated parameters must not be shown. The Jacobian must be checked in the lognormal log-likelihood.
~~~

### P14 — Bootstrap and uncertainty

~~~text
Add a reproducible bootstrap infrastructure for suitable distribution/method combinations.

In the parametric bootstrap for the goodness-of-fit test, generate each sample from the fitted observation model, refit with the same method and recompute the statistic. Data-determined bounds, truncation, classing and measurement rounding must be repeated in the same process. Fixed external bounds must stay fixed.

Design parameter/quantile intervals and goodness-of-fit p-values as separate operations. Do not confuse resampling within raw data with plot-level resampling in multi-plot models.

Record the seed, the number of replicates, completed/failed replicates and the Monte Carlo uncertainty. Provide progress and cancellation; long computations must not freeze the interface. Do not silently ignore a high failure rate.

Acceptance: The same seed must produce the same result. It must be checked that re-estimation is done in every bootstrap sample. In methods with multiple solutions such as M8/M9 the selection rule used must stay the same across replicates; unsupported combinations must be stated explicitly.
~~~

### P15 — Interface, output and first-version validation

~~~text
Combine the P01–P14 functions in a way that fits the existing tool's design.

The main workflows should be "Fit a distribution to data" and "Recover parameters from summaries". The stand model workflow is added separately once implemented. The method choice must change with the distribution and the data type.

Reuse the existing plot/period navigation. Results for multiple distributions must stay synchronised with the same selected plot/period. Provide TR/EN explanations, accessible controls and a mobile view.

In every result, the method used, units, support/threshold policy and source must be findable. Table/chart exports must keep the application version, settings, model parameters and the seed, if any. Use the point in text outputs such as CSV; in spreadsheet outputs keep numeric cells without converting them to text.

Check the eight families and the recovery workflows end to end with sample data. Verify the scenarios of empty/missing data, equal diameters, the comma import preference, switching plots and failed fits.

Acceptance: Working results must be distinguishable from unsupported/ambiguous results. Briefly report the completed scope of the first usable version and the remaining stages.
~~~

### P16 — Stand models: PPM, PRM, NLS and SUR

~~~text
Add a separate "Prediction from stand variables" workflow according to Section 4.1.

In multi-plot training data, separate direct parameter prediction as PPM from moment/percentile prediction + recovery as PRM. Initially focus on the Weibull and Parresol targets.

Implement NLS for Poudel's exponential equation form with additive error on the original scale. When SUR is added, genuinely take the cross-equation residual covariance into account. If log-OLS is offered, explain its different error/objective definition; state the bias approach used in back-transformation from the log.

Make the training/validation split at plot level; the periods of the same plot must stay in the same group. Target generation and data-driven choices must run inside the training fold. The ordering of predicted percentiles and moment consistency must be checked; do no hidden clipping.

Record the coefficients, training coverage, units, model version and validation results. The user must be able to export/import a validated model.

[Rev] Stand predictors (N, H, age, Dq etc.) are read from columns that come with the tree table or from the "tree data + stand parameters" output of the Plot and Stand tool (version 1.1.0); do not invent a separate data layout. Poudel's H is the mean height of the dominant/codominant trees; that tool's H0 column (the 100 largest trees per hectare) is not the same definition; the user chooses which column is used as H, and this is recorded.

Acceptance: NLS/SUR computations must be verified with an independent example; no prediction must be made without model training, with random coefficients or coefficients copied from the paper.
~~~

### P17 — CDFR and modified CDFR

~~~text
Add Poudel and Cao's CDFR/modified CDFR objectives from Section 4.2 to stand model training.

The optimised variables must be regression coefficients common across plots. Depending on the selected M1–M10 path, parameters must be predicted directly or recovered from targets. For M1, apply the difference in location policy between the source approaches explicitly.

In CDFR use the per-plot weight 1/n_i and the plotting position (j−0.5)/n_i. In modified CDFR use the true upper class bound and the weight 1/(m_i−1); exclude the last class only in this objective.

Make failures in nested recovery solvers traceable. Do not allow the optimisation to jump between multiple roots without explanation; record a predefined selection/parameter-region policy.

Name source reproduction and new truncation/weighting extensions separately. Check with plot-level cross-validation and with examples whose class width differs from the source's.

Acceptance: Hand-calculated values of the two objective functions must be met on small data. The last class must not disappear from the histogram or the total number of trees.
~~~

## 7. Optional advanced stages

### P18 — L-moments, general percentiles and minimum distance

~~~text
After the core version is complete, extend the additional estimation methods in a controlled way.

First add source-verified L-moment methods for 2P/fixed-location Weibull and 2P gamma. For Weibull, with y=d−a, c=−ln(2)/ln(1−L2/L1), b=L1/Γ(1+1/c); L1/L2 are the sample L-moments. Check the sample L-moment computation against an independent reference. For gamma take the lmomco documentation as the reference.

In general QME record the selected percentiles and weights explicitly; in MGE record the minimised KS/CvM/AD measure explicitly. Do not switch on all options automatically for every distribution: check for sufficient information, parameter identifiability and support.

Do not automatically add the results of these methods to the standard MLE-AIC ranking. Make sure the user can see that fitting and evaluation were done with the same measure.

Acceptance: The different definitions of L-moments, MOM and MLE must be preserved; the selected method must actually be applied. New methods must be validated with independent examples; there must be no hidden switch to another method on failure.
~~~

### P19 — Johnson SB: Fonseca et al. (2009)

This is a method separate from Parresol (2003). The work of Fonseca, Marques and Parresol proposes recovering four parameters from the median and the first three raw moments. The third raw moment m3 equals the basal-area-weighted mean diameter multiplied by Dq². [R17]

The moment equality extending Parresol's notation for implementation:

$$
E[D^3]=\xi^3+3\xi^2\lambda u_1+
3\xi\lambda^2u_2+\lambda^3u_3=m_3.
$$

γ is eliminated with the median equation and three moment equations are solved for ξ, λ, δ. This algebraic expression is an implementation derivation made in this document. Having four summaries for four parameters does not mean a unique and stable solution under all conditions; symmetric cases in particular must be examined separately.

~~~text
Add the Fonseca–Marques–Parresol (2009) four-parameter recovery as a separate advanced method.

The inputs are the median, m1, m2 and m3. Use the relations Dq²=m2 and basal-area-weighted mean=m3/m2 correctly. Do not overwrite Parresol's fixed-ξ method under the same name.

Apply a constrained, multi-start solution to the median and three moment equations. Check physical support, moment admissibility, Jacobian rank/conditioning and multiple solutions. When the required input is missing, do not make up m3 from the mean and variance.

Acceptance: Recovery of summaries generated from known asymmetric parameters must be verified. With symmetric or weakly identified inputs, no artificial unique solution must be produced. Source and convergence details must be recorded.
~~~

### P20 — Generalised gamma and Gumbel

The explicit parameterisation of the generalised gamma for this stage:

$$
f(d)=\frac{c}{b\Gamma(a)}
\left(\frac d b\right)^{ac-1}
\exp[-(d/b)^c],\quad a,b,c>0.
$$

E[D^r]=b^r Γ(a+r/c)/Γ(a). c=1 is the gamma and a=1 the Weibull special case. The a here is not Weibull's location parameter; a family-specific parameter schema must be used. This version is restricted to positive c; it must not claim the same scope as the broader definition that allows c<0. [R18]

For the maximum form of the Gumbel, F(d)=exp{−exp[−(d−μ)/β]}, β>0. MOM: β=√(6v)/π, μ=m−γ_E β; γ_E is the Euler–Mascheroni constant. The direction and the mean relation of the minimum form are different. [R19]

~~~text
Implement this stage as two small changes: first the generalised gamma, then the Gumbel.

For the generalised gamma add MLE with the positive-c parameterisation above. Do not confuse it with the three-parameter shifted gamma. Use the gamma/Weibull special cases as validation examples.

For the Gumbel add the maximum form under an explicit name, with the MLE and MOM methods. Report the probability of negative diameters; if it is connected to the truncation options, use the correct conditional likelihood.

Open each family to the user only once its own PDF/CDF/quantile, constraints and independent numerical checks are complete. In the design of the comparison screen, preserve the point that increasing the number of parameters does not automatically mean a better biological model.
~~~

### P21 — Burr XII and Dagum

> **Dropped from scope (12 Nov 2026, user decision).** Not implemented; the text below remains for the record only.

The two separate CDFs to be used:

$$
F_{\text{Burr XII}}(d)=1-[1+(d/b)^c]^{-k},
\quad
F_{\text{Dagum}}(d)=[1+(d/b)^{-c}]^{-k},
$$

b,c,k>0, d>0. In Burr XII the r-th positive moment requires ck>r; in Dagum, c>r. The mapping of standard units must be explicit in the library adapter. [R20, R21]

~~~text
Add the Burr XII and Dagum/Burr III families with separate ids, initially with a fixed zero location and numerical MLE.

Verify the parameter mapping from the CDF definitions above. Use multiple starts, stable tail computations and support checks. Reflect the moment existence conditions in the results; do not confuse an undefined mean/variance with numerical overflow.

Test that both models reduce to the log-logistic special case when k=1. Use the common comparison and bootstrap infrastructure only for supported combinations.

Acceptance: PDF/CDF/quantile and MLE comparisons against independent SciPy/R references must pass. The two families or their parameter names must not be mixed up.
~~~

### P22 — Two-component mixture distributions

> **Dropped from scope (12 Nov 2026, user decision).** Not implemented; the text below remains for the record only.

~~~text
After the single-distribution version has become stable, add a two-component mixture as a separate advanced analysis. First choose two lognormal or two gamma components; do not implement all family combinations in a single stage.

f(d)=π f1(d)+(1−π)f2(d), 0<π<1. Compute the mixture log-likelihood with log-sum-exp. Use EM or constrained direct optimisation; add multiple starts and checks for component collapse and very small weights.

Standardise the reporting order of the components with a specific rule such as the mean/median. Do not automatically interpret the components as species, age classes or biological subpopulations.

Support comparison with a single component. Because of irregular inference problems in mixtures, do not give a standard likelihood ratio p-value or an automatic AICc guarantee; predictive performance and plot-level validation must take priority.

Acceptance: In a bimodal synthetic example the components must be found stably; in a unimodal example the overfitting and collapse diagnostics must work. Do not make this stage a prerequisite for completing all other distributions.
~~~

Implementation reference for mixture fitting in the context of forestry software: ForestFit fitmixture documentation. [R22]

### P23 — Empirical basal area diameter distribution (descriptive)

Source: Kangas and Maltamo (2000) [R23], Sections 2.2–2.3. The basal area diameter distribution is the distribution in which each tree is weighted by g=πd²/40000. The empirical function on a fixed-area plot:

$$F_G(x)=\frac{\sum_{d_i\le x} g_i}{\sum_i g_i}.$$

If the basal area of class k is b_k (m²/ha), the number of trees is f_k=b_k/ḡ_k, where ḡ_k is the basal area of the class mean tree (source Equation 1). When raw diameters are available, ḡ_k is computed from the observed trees; if only the class bounds are known, the basal area of the class mid-diameter is an approximation and is labelled as such.

~~~text
After the single-distribution version is complete, add the empirical basal area diameter distribution as a separate, descriptive view.

For the selected plot, show the empirical cumulative distributions by number of trees and by basal area together. Give the diameters at the 0, 10, 20, …, 90, 95 and 100% percentiles of basal area and the basal area median diameter (dgM, 50%); record the percentile definition used. Add the class basal area (m²/ha) and its share to the diameter class table.

Apply the conversion from class basal area to number of trees with f_k=b_k/ḡ_k; state whether ḡ_k comes from the observed mean or from the class mid-diameter. Verify that the conversion is exactly consistent with the raw data.

Fitting a parametric family to basal-area-weighted data, the size-biased likelihood, angle-count data and percentile prediction models are not within the scope of this stage; do not embed the species coefficients from the source. Rational spline interpolation is implemented only if a workflow that builds a distribution from percentiles is added, and then together with a monotonicity check.

Acceptance: In a small hand-calculated example, F_G, the percentile diameters and the class shares must be met; Σb_k must equal the total G and Σf_k the total N; the results of the distribution by number of trees must not change.
~~~

## 8. Independent numerical references

These values were computed on 10 Nov 2026 using Python, NumPy 2.3.5 and SciPy 1.17.0. For the eight models, the density integral and F(Q.50)=0.5 were checked. The Weibull recovery equations were verified by root scanning, and the Parresol example with normal-weighted numerical integration and an independent least-squares solution.

These checks do not belong to the website; they are references against which the code to be developed can be compared. For table rounding an absolute tolerance of about 1e−8 is appropriate. For parameter estimation checks, a relative tolerance suited to the scale of the problem must also be set.

### 8.1. PDF, CDF and median

In all rows the evaluation point is d=20 cm.

| Distribution and parameters | PDF(20) | CDF(20) | Q.50 |
|---|---:|---:|---:|
| Normal μ=20, σ=5 | 0.079788456080 | 0.500000000000 | 20.000000000000 |
| Lognormal μ=3, σ=0.4 | 0.049864946799 | 0.495743639452 | 20.085536923188 |
| Gamma k=2, θ=8 | 0.025651562070 | 0.712702504816 | 13.426775920133 |
| Weibull a=5, b=20, c=2.5 | 0.049881557187 | 0.385618549980 | 22.272698012047 |
| Beta L=5, U=45, α=2, β=5 | 0.042915344238 | 0.725818634033 | 15.577999331826 |
| Johnson SB ξ=5, λ=40, γ=0.6, δ=1.3 | 0.055206557626 | 0.474455926493 | 20.464836861499 |
| Exponential a=0, r=0.1 | 0.013533528324 | 0.864664716763 | 6.931471805599 |
| Log-logistic b=20, c=3 | 0.037500000000 | 0.500000000000 | 20.000000000000 |

### 8.2. Weibull recovery

For a=5, b=20, c=2.5:

| Target | Value |
|---|---:|
| Mean | 22.745276350061506 |
| Moment variance | 57.65867565204488 |
| Second raw moment | 575.0062718927121 |
| Dq | 23.979288394210368 |
| Q25 | 17.150527008986376 |
| Q31 | 18.45269745606343 |
| Q50 | 22.272698012047496 |
| Q63 | 24.95393865551951 |
| Q95 | 36.01924299565496 |

In the M2–M9 checks a is given explicitly as 5. If the source's a=0.5Dmin policy is also to be tried, the target Dmin=10 is entered for this check; this value is not interpreted as the theoretical Q0.

Roots found in the range 0.15≤c≤50:

| Method | Shape parameter candidates |
|---|---|
| M2 | 2.500000000000 |
| M3 | 2.500000000000 |
| M8 | 0.191476498065 and 2.500000000000 |
| M9 | 0.398620001976 and 2.500000000000 |

This is a computed example showing that the single-root assumption in M8/M9 can be wrong; it is not an experimental result taken from the paper. The candidates must be evaluated together with the corresponding scale formulas.

Separate location check for M10: with n=125 and Dmin=8.4545396024095, a=5 is obtained with the Q50 above. Dmin here is a target generated to test the formula; it need not be the same Dmin as in the M2–M9 location policy.

### 8.3. Parresol recovery

| Input | Value |
|---|---:|
| ξ | 5 |
| N, trees/ha | 500 |
| G, m²/ha | 18.979383683389663 |
| Mean diameter | 20.972673017674087 |
| Median | 20.464836861498966 |
| Dq | 21.984222451746177 |
| Second raw moment | 483.30603680786066 |

Expected parameters: ξ=5, λ=40, γ=0.6, δ=1.3. The independent solution gave λ=39.99999999999997, γ=0.5999999999999978, δ=1.299999999999999. The largest scaled moment residual was about 2.4×10⁻¹⁶. This single example is not a guarantee of the same precision or uniqueness for all data combinations.

### 8.4. Bound and method admissibility checks

- Empty data; a single observation; all diameters equal.
- Zero/negative values and observations outside the selected support.
- Repeated diameters for which a separate rounding policy exists.
- Mean–Dq inconsistency; unordered or equal percentiles.
- Observations on the bound in beta and Johnson SB.
- Weibull M8/M9 multiple roots; n=1 in M10.
- The support parameter must not change by itself when the truncation threshold changes.
- Parameter and density transformations under unit conversion; model comparison in the same unit.
- The number of independent observations must not change when the per-hectare expansion factor changes.
- The total probability must stay correct when class widths and the number of classes change.
- Numerical results and the default point notation must be preserved when switching TR/EN.

## 9. Sources and the purpose for which they were used

### Uploaded and examined sources

- **[R1] Poudel, K. P. & Cao, Q. V. (2013).** Evaluation of Methods to Predict Weibull Parameters for Characterizing Diameter Distributions. Forest Science, 59(2), 243–252. [Publication link](https://academic.oup.com/forestscience/article-abstract/59/2/243/4583693), DOI: 10.5849/forsci.12-001. The main methods section and Table 2 of the uploaded PDF were examined; the pages containing Table 2 and the K–S equation were checked visually. Primary source for M1–M10, the SUR/CDFR distinction and the EI/mLogL definitions.
- **[R2] Parresol, B. R. (2003).** Recovering Parameters of Johnson's SB Distribution. USDA Forest Service, Southern Research Station, Research Paper SRS–31. [Institutional PDF](https://www.srs.fs.usda.gov/pubs/rp/rp_srs031.pdf). The methods section and the integral/recovery equations of the uploaded PDF were examined. Primary source for the recovery of λ, γ and δ with ξ fixed.

### Distribution choice and forestry applications

- **[R3] Gorgoso-Varela, J. J., Adedapo, S. M. & Ogana, F. N. (2024).** A Comparison of Probability Density Functions Fitted by Moments and Maximum Likelihood Estimation Methods Used for Diameter Distribution Estimation. Forests, 15(3), 425. [Article](https://www.mdpi.com/1999-4907/15/3/425). Variety of distributions/methods and MOM–MLE applications; not used to turn success on a single data set into a universal ranking.
- **[R4] Hafley, W. L. & Schreuder, H. T. (1977).** Statistical distributions for fitting diameter and height data in even-aged stands. Canadian Journal of Forest Research, 7, 481–487. [Original article PDF](https://www.u-cursos.cl/forestal/2010/1/MF004/1/material_docente/bajar?id_material=483164). Classical forestry comparison of normal, lognormal, gamma, beta, Weibull and Johnson SB.
- **[R5] Binoti, D. H. B. et al. (2012).** Probability density functions for description of diameter distribution in thinned stands of Tectona grandis. CERNE, 18(2). [Article](https://www.scielo.br/j/cerne/a/M55XHDVw4LKSjns7m5jFNjQ/?lang=en), [journal record](https://cerne.ufla.br/site/index.php/CERNE/article/view/814). MLE application in forestry of log-logistic, generalised gamma, Burr, Dagum and other alternatives.

### Method and computation documentation

- **[R6] ForestFit — fitWeibull.** [Official package documentation](https://search.r-project.org/CRAN/refmans/ForestFit/html/fitWeibull.html). Inventory of 2P/3P Weibull estimation methods; parameter name mapping.
- **[R7] ForestFit — fitJSB.** [Official package documentation](https://search.r-project.org/CRAN/refmans/ForestFit/html/fitJSB.html). The CML/MM/KB/Bayesian distinction under fixed bounds in Johnson SB.
- **[R8] fitdistrplus vignette.** [Developer documentation](https://lbbe-software.github.io/fitdistrplus/articles/fitdistrplus_vignette.html). General framework of the MLE, moment, quantile and minimum distance approaches.
- **[R9] SciPy — goodness_of_fit.** [Official documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.goodness_of_fit.html). Monte Carlo/parametric bootstrap goodness-of-fit assessment in which the parameters are re-estimated.
- **[R10] NIST — Normal Distribution.** [Technical handbook](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3661.htm).
- **[R11] NIST — Lognormal Distribution.** [Technical handbook](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3669.htm).
- **[R12] NIST — Gamma Distribution.** [Technical handbook](https://www.itl.nist.gov/div898/handbook/eda/section3/eda366b.htm).
- **[R13] lmomco — pargam.** [Official package documentation](https://search.r-project.org/CRAN/refmans/lmomco/html/pargam.html). L-moment parameter estimation for the gamma.
- **[R14] NIST — Beta Distribution.** [Technical handbook](https://www.itl.nist.gov/div898/handbook/eda/section3/eda366h.htm).
- **[R15] NIST — Exponential Distribution.** [Technical handbook](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3667.htm).
- **[R16] SciPy — fisk.** [Official documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisk.html). Log-logistic parameterisation.
- **[R17] Fonseca, T. F., Marques, C. P. & Parresol, B. R. (2009).** Describing Maritime Pine Diameter Distributions with Johnson's SB Distribution Using a New All-Parameter Recovery Approach. Forest Science, 55(4), 367–373. [Original article PDF](https://capsis.cirad.fr/capsis/_media/help/describing_maritime_pine_with_sb_distribution.pdf). Four-parameter recovery from the median and the first three raw moments.
- **[R18] SciPy — gengamma.** [Official documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gengamma.html).
- **[R19] NIST — Extreme Value Type I / Gumbel.** [Technical handbook](https://www.itl.nist.gov/div898/handbook/eda/section3/eda366g.htm).
- **[R20] SciPy — burr12.** [Official documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.burr12.html).
- **[R21] SciPy — burr.** [Official documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.burr.html). Burr III / Dagum.
- **[R23] Kangas, A. & Maltamo, M. (2000).** Percentile based basal area diameter distribution models for Scots pine, Norway spruce and birch species. Silva Fennica, 34(4), 371–380. The uploaded PDF was read. Source for the definition of the basal area diameter distribution, the percentile method and the conversion from class basal area to number of trees (P23).
- **[R22] ForestFit — fitmixture.** [Official package documentation](https://search.r-project.org/CRAN/refmans/ForestFit/html/fitmixture.html). EM implementations for mixture distributions.

The sources are the versions accessed during the 10 Nov 2026 research. The official package pages are references for methods and parameterisation; they do not require that the package or the same programming language be used in the current project.

