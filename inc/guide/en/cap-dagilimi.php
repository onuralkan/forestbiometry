<section class="card guide-sec">
<?= $sec('cap-dagilimi', 'Diameter Distribution Lab') ?>
<p>Fits eight probability distributions to individual tree diameters or to diameter classes: Weibull, normal, lognormal, gamma, fixed-bound beta, Johnson SB, exponential and log-logistic; optionally the <b>Generalized gamma (no location)</b> and the <b>Gumbel (maximum form)</b>. Each plot and period is computed separately. A separate workflow recovers parameters from summary values without raw data.</p>
<p><b>What it does not do:</b> it does not estimate location and bound parameters (a for the Weibull and exponential, L and U for the beta, ξ and λ for the Johnson SB are fixed values you give, never taken from the data); no basal-area-weighted fitting; no prediction with coefficients copied from papers (a stand model is trained on your data only).</p>
<h3>Three workflows</h3>
<ul>
<li><b>Fitting measured diameters</b>: steps Data, Settings, Results.</li>
<li><b>Recovery from summaries</b>: parameters from the mean diameter, variance or Dq, percentiles and similar summaries.</li>
<li><b>Stand model</b>: train a model on many plots and predict the distribution from the number of trees, stand height and age.</li>
</ul>
<h3>1. Data</h3>
<p>One tree per row (diameter column required; plot and period optional) or one diameter class per row (lower limit, upper limit, frequency). If lower/upper/frequency columns are found in the header, the table is recognised as a class table.</p>
<h3>2. Settings</h3>
<ul>
<li><b>Data type</b>: individual tree diameters or class frequencies. For classes, the kind of frequency (counted trees or frequencies expanded to the hectare) and what lies outside the classes ("measured, no trees" or "unrecorded") are stated.</li>
<li><b>Columns</b>: diameter and its unit (cm, mm), plot, period, an optional filter.</li>
<li><b>Unit of analysis</b>: each plot separately or all trees together (pooled).</li>
<li><b>Measurement threshold</b>: if only trees above a diameter (or between two thresholds) were measured, state it here; fitting then uses the conditional likelihood. A threshold is not the same as the support bound of the distribution or the smallest diameter in the data.</li>
<li><b>Distributions and estimation methods</b>: maximum likelihood, moments, percentiles and log-moments. Each family's formulas and notes are in its "Details" box. The moment variance uses divisor n by default; n − 1 is an option. Additional methods, not selected by default: <b>L-moments</b> (Weibull, gamma), <b>General quantile matching (QME)</b> (with the probabilities and weights you choose) and <b>Minimum distance (MGE)</b> (KS, Cramér–von Mises or Anderson–Darling) (normal, gamma, beta). They do not maximise the likelihood, so they are not in the AIC table; an MGE row is marked † in a table sorted by the criterion it was fitted with. The generalized gamma is not selected by default either: the gamma (c = 1) and the Weibull (a = 1) are special cases of it, so its ln L cannot be smaller than theirs; that does not make it a better model. The Gumbel is defined on all real numbers; the probability the fitted model gives to negative diameters, F(0), is stated with every result.</li>
<li><b>Fixed location a</b> (Weibull, exponential): a = 0 is always computed; if you type a value it is computed with that location too. <b>Beta L, U</b> and <b>Johnson SB ξ, λ</b> are asked for when these families are chosen.</li>
</ul>
<h3>3. Results</h3>
<ul>
<li><b>Results</b>: a unit summary; a sortable table of all fits (AIC, BIC, KS, AD and other criteria; methods that maximise the likelihood apart from descriptive methods); notes and warnings; the "Methods, units and sources" panel; the per-family tables with all columns in a disclosure. The "All criteria" switch shows BIC, AICc, CvM, class errors, EI and the solver.</li>
<li><b>Charts</b>: histogram and densities (density or tree-count scale), cumulative distribution, Q–Q and P–P.</li>
<li><b>Classes</b>: observed and expected class frequencies; per hectare when a plot size is entered. The <b>Basal area diameter distribution (descriptive)</b> card on the same tab draws the cumulative distribution with trees weighted by their basal area next to the one by number of trees. It gives the diameters at the 0, 10, …, 90, 95 and 100 % basal area percentiles and dgM (the diameter above which half of the basal area lies). It shows the class basal area, its share and the conversion to numbers of trees (f = G/ḡ). No distribution is fitted to these weighted data; raw diameters are needed.</li>
<li><b>Uncertainty</b>: goodness-of-fit p-values by parametric bootstrap; intervals for parameters and percentiles. The same seed gives the same result; a run can be cancelled.</li>
</ul>
<p>A result shows parameters only in the "ok" state. In the other states (at the edge of the search interval, did not converge, several solutions, not computed, error) no parameters are given and the reason is written.</p>
<h3>Recovery from summaries</h3>
<p>The table at the top shows which methods can be used with which summaries. The three groups are on separate tabs: normal, lognormal and gamma (mean and variance or Dq); Weibull, Poudel and Cao (2013) M2–M10 (mean, Dq, variance, percentiles; Dmin or a fixed a for the location); Johnson SB, Parresol (2003) (ξ, mean, median and Dq or N/ha with G); <b>Johnson SB (Fonseca, 4 parameters)</b>, Fonseca et al. (2009) (mean, median, Dq and the basal-area-weighted mean diameter d̄_G; ξ is recovered too; symmetric or weakly determined inputs give no single result). A mean, variance, Dq or n typed in one tab is written into the others. With raw data loaded, the Weibull and Parresol targets can be computed from those data.</p>
<h3>Stand model</h3>
<p>On the <b>Train a model</b> tab the training data are a table with one tree per row that repeats the stand variables (N trees/ha, H m, age) of the plot on every tree row; the "Tree data + stand parameters (Excel)" export of Plot &amp; Stand Metrics has this layout. A plot column is required. You choose which column is H (Poudel and Cao's H is the mean height of dominant and codominant trees; the H0 of Plot &amp; Stand Metrics is not the same definition), and the choice is recorded in the model.</p>
<ul>
<li><b>Approach and responses</b>: PPM (Weibull b and c directly) or PRM (targets of Weibull M2–M9 or Johnson SB Parresol; a prediction recovers the parameters from these targets).</li>
<li><b>Terms</b>: RS, ln N, ln H, 1/A (Poudel and Cao's form).</li>
<li><b>Regression method</b>: NLS (each response separately), SUR (responses together, with the covariance between equations), log-OLS (on ln y; a different objective, with a chosen back-transformation), CDFR or modified CDFR (Weibull routes: the coefficients minimise, over all plots, the distance between observed and predicted cumulative distributions; modified CDFR works with diameter classes of the width set in <b>Class width (cm)</b>). In the CDF fits, steps where a recovery cannot be solved or has several solutions are rejected and counted; for PPM the location is a = 0 or a = 0.5 × predicted Dmin.</li>
<li><b>Validation</b> is at plot level: all periods of a plot are in the same fold. For every unit the −ln L and KS of the predicted distribution on the observed trees are given; units that cannot be predicted are counted.</li>
</ul>
<p><b>Download the model (JSON)</b> records the coefficients, the training scope, units, version and validation results. On the <b>Predict with a model</b> tab you choose the model trained in this session or a model file and enter N, H and age. If the predicted percentiles are out of order or Dq is not above the mean diameter, no parameters are given (values are not clipped); inputs outside the training range are flagged as an extrapolation.</p>
<h3>Downloads</h3>
<p>Excel report (Info, Fits, Parameters, Plots, Classes, BA distribution, Comparison, Bootstrap, Sources), fits and parameters as CSV, result records as JSON; charts as SVG (with the version, settings and parameters inside the file).</p>
<p><b>R code (.R)</b> (Parameters tab): a script that redoes the fitting run with the <code>fitdistrplus</code> package: the same units, diameters or classes, fixed parameters, options and measurement thresholds. The distributions are written in the script with the tool's parameters (R's functions of the same name may use other parameters); ML, moments, two percentiles and minimum distance by <code>fitdistrplus</code>, L-moments, log-moments, weighted quantile matching and the grouped-data likelihood written out. R's optimiser starts from two significant digits of the tool's result and finds the optimum itself. Recovery, Weibull recovery, Johnson SB recovery, stand models and the bootstrap come in a later stage. The data are not embedded; you change the file name at the top of the script to the path of your file. The site's tests check in R at every release that this code gives the tool's numbers.</p>
<h3>Common situations</h3>
<ul>
<li>On a plot with very few trees or with all diameters equal, results are "not computed"; the reason is in the notes.</li>
<li>If the beta or Johnson SB is chosen without bounds, nothing can be computed; diameters outside or on a bound are refused.</li>
<li>With a measurement threshold the untruncated methods are switched off; only conditional maximum likelihood is used.</li>
<li>If no diameter is readable, the results page is not left empty; it says what to check.</li>
</ul>
</section>
