<?php
// User guide, English. Describes only what the tools actually do (interface strings and code; METHODS.md).
// Formulas are not repeated here. Section ids are the tools' file names. Turkish counterpart: tr.php (same structure).
?>
<section class="card guide-sec">
<?= $sec('genel', 'General') ?>
<h3>Your data</h3>
<p>All calculations run in your browser. The files you load are not sent to the server, and the server keeps no user data. Each tool's session (the loaded table and the settings) is kept only in this browser (IndexedDB) and opens with the message "Previous session restored" when you come back. The <b>Reset session</b> button in each tool deletes that tool's record. Another browser or computer does not see these records.</p>
<h3>Loading data</h3>
<ul>
<li><b>Choose a file</b>: CSV, TXT, TSV and Excel (XLSX). The old .xls format is not read; save as .xlsx in Excel. Formulas and macros in an Excel file are not run, only the last saved values are read; if there are several worksheets you can choose one.</li>
<li><b>Paste from Excel</b>: copy the cells and paste them into the box.</li>
<li>In text files the column delimiter is detected (it can be changed). The <b>Text encoding</b> can be utf-8, windows-1254 or iso-8859-9; if Turkish letters look broken, change the encoding. <b>First row is a header</b> sets the header row.</li>
<li>Columns are suggested from the header names (e.g. <code>cap_cm</code>, <code>dbh</code>, <code>alan_no</code>, <code>plot</code>); always check the suggestion.</li>
</ul>
<h3>Decimal separator</h3>
<p>The decimal separator does not depend on the interface language. The tool looks at the text cells and says whether a point or a comma was used, but leaves the decision to you: <b>Point (24.5)</b> or <b>Comma (24,5)</b>. Values such as "1.234", which could be either a decimal or a thousands separator, are reported as "ambiguous". Values that do not fit your choice count as unreadable and are reported with their row numbers; no value is skipped silently. Excel number cells are not affected by this setting.</p>
<h3>Sample data</h3>
<p>Every tool has a sample data button. The samples are simulated (made up), not real measurements; they are there to try the tool and to show edge cases.</p>
<h3>Exports</h3>
<ul>
<li><b>Excel report</b>: numbers are written as number cells at full precision; the first sheet (Info) holds the tool, version, date and settings.</li>
<li><b>CSV</b>: in both languages the column separator is a comma and the decimal mark a point. Excel with a Turkish regional setting may open a CSV file in one column; use the Excel report then.</li>
<li><b>Charts</b> download as SVG.</li>
</ul>
<h3>Citing</h3>
<p>The <b>Cite</b> button at the top of every page gives, on a tool page, that tool and its version, and on the home page the whole platform, in APA, MLA, Chicago, Harvard, IEEE, Vancouver, BibTeX and RIS. The citations carry the concept DOI of the platform's Zenodo archive (10.5281/zenodo.24135603). The tool's version is shown in the page header. Cite the original sources of the methods as well; the tools list them.</p>
</section>

<section class="card guide-sec">
<?= $sec('is-akisi', 'Tools together') ?>
<p>The tools can be used on their own; used together, the data are checked once and the later tools read the same data.</p>
<ol>
<li><b>Forest Data Checker</b>: check the tree and plot tables, record fixes with their reasons and <b>approve</b> the data. The approved data are kept in this browser.</li>
<li>Tools that read the approved data directly: <b>Plot &amp; Stand Metrics</b> ("Data approved in the checker"), <b>Height–Diameter Modelling</b> and <b>Model Evaluation</b> ("Use approved data"). These tools also accept a table directly.</li>
<li>The <b>Inventory Sampling Planner</b> expects plot-level values: the "Plot table (CSV)" export of Plot &amp; Stand Metrics can be used for it.</li>
<li>The <b>Diameter Distribution Lab</b> and <b>Relative Ranking</b> load their own tables (a list of diameters or a class table; a table of goodness-of-fit statistics).</li>
</ol>
</section>

<section class="card guide-sec">
<?= $sec('veri-denetcisi', 'Forest Data Checker') ?>
<p>Checks your tree and plot tables: format errors, missing and duplicate records, conflicting plot sizes and suspect diameter–height values. Nothing is deleted or changed automatically; every fix is written to the log with its reason. The data you approve are read by other tools.</p>
<p><b>What it does not do:</b> no scientific calculation (it reads, converts and screens); it never switches a unit because of how large the values are; it does not guess thousands separators. The check limits are adjustable screening thresholds, not values from the literature.</p>
<h3>1. Data</h3>
<p>The <b>tree / measurement table</b> is required: one row is one measurement of one tree in one period. The <b>plot table</b> is optional: plot sizes and empty plots.</p>
<h3>2. Columns and units</h3>
<ul>
<li>Required in the tree table: plot ID, tree ID, species, diameter at breast height. Optional: height, period, stem ID, plot size, stratum, status, X and Y coordinates. The plot size must be in either the tree table or the plot table.</li>
<li>Suggestions come only from exact header matches (e.g. <code>alan_no</code>, <code>agac_no</code>, <code>tur</code>, <code>cap_cm</code>); suffixes such as <code>_cm</code> or <code>_m2</code> also suggest the unit.</li>
<li>Units: diameter cm/mm/m, height m/dm/cm, area m²/ha. The minimum, median and maximum after conversion are shown; check the unit against them.</li>
</ul>
<h3>3. Check settings</h3>
<p>Limits for diameter (default 1–200 cm), height (2–60 m) and slenderness h/d (15–200); "Restore defaults" and "Run checks".</p>
<h3>4. Results</h3>
<ul>
<li><b>Errors</b> (block approval): unreadable number, empty required field, zero or negative value, duplicate record (the same tree in different periods is not a duplicate), plot missing from the plot table, different sizes or strata for one plot, plot without a size.</li>
<li><b>Warnings</b>: leading or trailing space, the same species code written differently, species changing between periods, diameter, height or slenderness outside the limits, a tree shorter than 1.3 m with a measured diameter.</li>
<li><b>Notes</b>: a plot without trees (it stays in the data with 0 trees per hectare).</li>
</ul>
<p>On the <b>Issues</b> tab each row offers: Fix, apply the suggestion, exclude the record (it is not deleted), include again, accept a warning, choose a value in a conflict, enter a plot size. Every action asks for a reason and is written to the <b>Change log</b>; raw values are kept. On the <b>Data</b> tab you can also fix a cell by clicking it.</p>
<p><b>Approve and export</b>: "Approve and save" is enabled once no error remains; open warnings are saved with the data. The approved data are kept in this browser and read by Plot &amp; Stand Metrics, Height–Diameter Modelling and Model Evaluation. If the data change after approval you are asked to approve again. "Reset session" does not delete the approved data.</p>
<h3>Downloads</h3>
<p>Issue table and change log (CSV); after approval the approved data (CSV), the data package (JSON) and the full report (Excel). When a CSV file is opened in Excel, leading zeros (e.g. 001) may be lost.</p>
<h3>Common situations</h3>
<ul>
<li>If Turkish letters are broken, the file is most likely windows-1254; change the "Text encoding".</li>
<li>"001" and "1" are different plots; the tool does not merge them.</li>
<li>You cannot continue while a required field is not mapped or one column is mapped to two fields.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('ornek-alan', 'Plot & Stand Metrics') ?>
<p>For every plot and measurement period: stems per hectare (N/ha) and basal area (G/ha), arithmetic mean diameter and quadratic mean diameter (Dq), the standard deviation of diameter, the smallest and largest diameter, the diameter class distribution, species composition, dominant diameter and height (D0, H0: the 100 largest trees per hectare), the mean of measured heights and the mean age. Also a descriptive between-plot summary and, when a sampling design is given, a design-based estimate for the forest.</p>
<p><b>What it does not do:</b> it does not estimate heights (heights flagged "estimated" in the data are shown apart, never pooled with measured ones); it gives no confidence intervals; it is for fixed-area plots only (nested plots and angle counts are out of scope, and the tool does not correct for them); it applies no finite population correction under simple random sampling. The between-plot table is not a forest estimate.</p>
<h3>Data</h3>
<ul>
<li><b>Data approved in the checker</b>: "Use these data". This is the recommended route.</li>
<li><b>Data package (.json)</b>: the package exported by the Checker.</li>
<li><b>Tree table (Excel, CSV)</b>: one tree per row. Required: plot, diameter, plot size (a column or one value for every plot). Optional: height, age, tree number, species, period, stratum, status. Units: diameter cm/mm, area m²/ha, height m/dm/cm. A table loaded directly does not go through the Checker's coding and unit screens; only unreadable values are reported.</li>
</ul>
<p>To continue, tick the scope statement: the data come from fixed-area plots, and no nested plots or angle counts were used.</p>
<h3>Settings</h3>
<ul>
<li><b>Records to count</b>: if the data have a status, which statuses are counted (default: all).</li>
<li><b>Plot–period combinations without records</b>: if some plots have no tree records in some periods, you decide: "Measured, no trees (N = 0, G = 0)" or "Not measured". Without a decision these combinations stay out of the calculation and no forest estimate is made for that period.</li>
<li><b>Dominant diameter and height</b>: the "largest" trees by diameter, by height, or both separately. H0 uses measured heights only.</li>
<li><b>Diameter classes</b>: equal width (default 4 cm) or a list of limits; classes are half-open [lower, upper); optional open class above the last limit.</li>
<li><b>Estimate for the forest</b>: without a design no forest estimate is made. "Simple random" (approximately for systematic grids) with an optional forest area (for totals); "Stratified random" with stratum areas (when the data have strata).</li>
</ul>
<h3>Results</h3>
<ul>
<li><b>Plots</b>: one row per plot × period with its state (measured, empty, not measured, awaiting a decision). Click a plot ID to open its detail.</li>
<li><b>Detail</b>: main figures (including the expansion factor 10000/A), dominant trees and age, the diameter class distribution and its chart, species composition (shares and their denominators), heights. The navigator on the left offers search, sorting and a "problems only" filter; ← → move between plots.</li>
<li><b>Between-plot summary</b>: per period the number of plots, mean, standard deviation, minimum, median, maximum (not weighted by plot size).</li>
<li><b>Forest estimate</b>: for N/ha and G/ha the estimate, standard error, relative standard error and (with an area) totals; by species if there are several; a strata table for the stratified design.</li>
</ul>
<h3>Downloads</h3>
<p>"Tree data + stand parameters (Excel)" adds the plot-level results to the unchanged tree table; "Full report (Excel)"; plot table, diameter classes and species composition as CSV.</p>
<h3>Common situations</h3>
<ul>
<li>"Problems found; the table was not used": problems such as different sizes for one plot or a tree number repeated in the same period are listed with row numbers.</li>
<li>Nothing is calculated if the class limits are not strictly increasing or there are too many classes.</li>
<li>In the stratified design no standard error is given for a stratum without an area or with a single plot.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('model-degerlendirme', 'Model Evaluation') ?>
<p>Compares observed values with the predictions of one or more models: bias (ē), MAE, RMSE and prediction R² (1 − SSE/SST); observed–predicted and residual plots; tables by plot, species, diameter class and validation fold. The error sign is <b>e = predicted − observed</b> everywhere; a positive bias means the model over-predicts on average. R² is not the squared correlation and can be negative.</p>
<p><b>What it does not do:</b> AIC, adjusted R², parameter confidence intervals and model significance are not computed (the number of parameters is not known). The tool does not assume external validation.</p>
<h3>Data</h3>
<p>One observation per row: the observed value and the predictions of one or more models. Plot, species, diameter and validation fold columns are optional. The table can come from a file, by pasting, or from the data approved in the Checker with "Use approved data" (unmapped columns become prediction candidates).</p>
<h3>Columns and settings</h3>
<ul>
<li><b>Observed value column</b> and <b>prediction columns</b>: each model gets a name and a <b>source of predictions</b> (not stated, training data, independent test data, cross-validation). The source does not change the calculation; it is used in the report and the warnings.</li>
<li><b>Groups</b>: plot, species, validation fold, a diameter column and diameter class limits.</li>
<li><b>Which rows?</b> The default "common valid rows": rows where every model and the observed value are present; the models are compared on the same sample. With "each model with its own valid rows" the samples may differ and the models cannot be compared directly.</li>
<li><b>Relative measures</b> (optional): as a percentage of the observed mean, range or standard deviation.</li>
</ul>
<h3>Results and downloads</h3>
<p><b>Summary</b> (measures, the source statement, row accounting: empty, unreadable and used rows), <b>Charts</b> (observed–predicted with a 1:1 line; residual–predicted), <b>Groups</b> and <b>Download</b>: full report (Excel), measures table, group table and residuals by row (CSV).</p>
<h3>Common situations</h3>
<ul>
<li>A warning appears when the source is "training data" or "not stated": performance on the training data is usually optimistic compared with new data; predictions of unstated origin should not be read as external validation.</li>
<li>If the observed values are constant, R² is undefined; if the denominator of a relative measure is zero or negative, that measure is shown as undefined.</li>
<li>A row can be left out for more than one reason, so the counts in the row accounting do not add up.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('cap-dagilimi', 'Diameter Distribution Lab') ?>
<p>Fits eight probability distributions to individual tree diameters or to diameter classes: Weibull, normal, lognormal, gamma, fixed-bound beta, Johnson SB, exponential and log-logistic. Each plot and period is computed separately. A separate workflow recovers parameters from summary values without raw data.</p>
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
<li><b>Distributions and estimation methods</b>: maximum likelihood, moments, percentiles and log-moments. Each family's formulas and notes are in its "Details" box. The moment variance uses divisor n by default; n − 1 is an option.</li>
<li><b>Fixed location a</b> (Weibull, exponential): a = 0 is always computed; if you type a value it is computed with that location too. <b>Beta L, U</b> and <b>Johnson SB ξ, λ</b> are asked for when these families are chosen.</li>
</ul>
<h3>3. Results</h3>
<ul>
<li><b>Results</b>: a unit summary; a sortable table of all fits (AIC, BIC, KS, AD and other criteria; methods that maximise the likelihood apart from descriptive methods); notes and warnings; the "Methods, units and sources" panel; the per-family tables with all columns in a disclosure. The "All criteria" switch shows BIC, AICc, CvM, class errors, EI and the solver.</li>
<li><b>Charts</b>: histogram and densities (density or tree-count scale), cumulative distribution, Q–Q and P–P.</li>
<li><b>Classes</b>: observed and expected class frequencies; per hectare when a plot size is entered.</li>
<li><b>Uncertainty</b>: goodness-of-fit p-values by parametric bootstrap; intervals for parameters and percentiles. The same seed gives the same result; a run can be cancelled.</li>
</ul>
<p>A result shows parameters only in the "ok" state. In the other states (at the edge of the search interval, did not converge, several solutions, not computed, error) no parameters are given and the reason is written.</p>
<h3>Recovery from summaries</h3>
<p>The table at the top shows which methods can be used with which summaries. The three groups are on separate tabs: normal, lognormal and gamma (mean and variance or Dq); Weibull, Poudel and Cao (2013) M2–M10 (mean, Dq, variance, percentiles; Dmin or a fixed a for the location); Johnson SB, Parresol (2003) (ξ, mean, median and Dq or N/ha with G). A mean, variance, Dq or n typed in one tab is written into the others. With raw data loaded, the Weibull and Parresol targets can be computed from those data.</p>
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
<p>Excel report (Info, Fits, Parameters, Plots, Classes, Comparison, Bootstrap, Sources), fits and parameters as CSV, result records as JSON; charts as SVG (with the version, settings and parameters inside the file).</p>
<h3>Common situations</h3>
<ul>
<li>On a plot with very few trees or with all diameters equal, results are "not computed"; the reason is in the notes.</li>
<li>If the beta or Johnson SB is chosen without bounds, nothing can be computed; diameters outside or on a bound are refused.</li>
<li>With a measurement threshold the untruncated methods are switched off; only conditional maximum likelihood is used.</li>
<li>If no diameter is readable, the results page is not left empty; it says what to check.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('boy-cap', 'Height–Diameter Modelling') ?>
<p>Fits six height–diameter equations to measured heights by nonlinear least squares: Näslund, Michailoff, Curtis, Power (Stoffels and van Soest), Chapman–Richards and Weibull (Yang et al.). It compares the models on the same trees, tests them by plot-based cross-validation and predicts heights for trees without a measured height.</p>
<p><b>What it does not do:</b> no mixed-effects models (plot effects are the next stage); species share one curve (if they differ, run each species separately); it does not choose a model for prediction by itself; it does not write predicted heights back into the approved data.</p>
<h3>Data and settings</h3>
<ul>
<li>Source: a file, pasting, the approved data or the sample data.</li>
<li><b>Columns and units</b>: diameter (cm/mm) and height (m/dm/cm) required; plot, species and a filter optional. Trees with a valid diameter and an empty height cell count as "height missing" and get a prediction; unreadable heights are left out.</li>
<li><b>Breast height bh</b>: default 1.3 m. Trees with a height at or below bh do not enter the fit.</li>
<li><b>Cross-validation</b>: by plot (default with at least 2 plots), by tree (10 folds) or none.</li>
</ul>
<h3>Results</h3>
<ul>
<li><b>Models</b>: status, parameters, asymptote and number of iterations.</li>
<li><b>Comparison</b>: RMSE, MAE and bias on the fitting data; cross-validation results.</li>
<li><b>Charts</b>: data and curves, residuals, mean error by plot. A model is chosen for the detailed charts and the predictions.</li>
<li><b>Prediction</b>: for trees without a height and for diameters you type; predictions outside the diameter range of the fitting data are flagged "outside".</li>
</ul>
<p><b>When are standard errors withheld?</b> With two or more plots in the data, trees in the same plot are not independent; standard errors would come out too small. In that case this version gives no standard errors, confidence or prediction intervals, and no AIC/BIC.</p>
<h3>Downloads</h3>
<p>Full report (Excel); the tree table (measured and predicted heights in separate columns), parameters, cross-validation folds and new-diameter predictions as CSV.</p>
<h3>Common situations</h3>
<ul>
<li>Models that "did not converge" or "diverged" give no parameters; divergence means the asymptote is not identified by the data.</li>
<li>If a cross-validation fold fails, that fold's trees are left out for every model.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('ornekleme', 'Inventory Sampling Planner') ?>
<p>Answers one question: under simple random sampling, about how many plots are needed to estimate the mean of a plot-level variable (e.g. volume per hectare) with the relative error you aim for. The calculation is n₀ = z²(CV/E)², with an optional finite population correction.</p>
<p><b>What it does not do:</b> it is not a power analysis for a hypothesis test; the allocation of plots to strata, the variance of systematic sampling and cluster or multistage sampling are not solved by this formula.</p>
<h3>Cards</h3>
<ol>
<li><b>Variability (CV)</b>: compute it from pilot measurements (each row is the value of one plot, not a tree-level measurement) or type the CV yourself (with its source). For pilot data you choose the value column, an optional plot ID (to check for repeats) and a filter (e.g. period); the standard deviation uses divisor n − 1. Tick the statement box to calculate from a pilot.</li>
<li><b>Target</b>: relative error E (%) and confidence level (defaults 10% and 95%).</li>
<li><b>Sampling frame</b>: without a finite, listed frame (M units) no correction is applied. Dividing the forest area by the plot size does not make a frame.</li>
<li><b>Existing plots</b>: if the pilot plots are part of the same design, only the number still needed is shown.</li>
</ol>
<h3>Result and downloads</h3>
<p>The number of plots needed (rounded up), the calculation lines, a table and chart of other error targets; the assumptions in a disclosure. Example: CV = 30%, E = 10%, 95% confidence, no correction → n₀ = 34.573, 35 plots needed. Downloads: <b>Assumption summary (TXT)</b>, error targets (CSV), full report (Excel), chart (SVG).</p>
<h3>Common situations</h3>
<ul>
<li>If the same plot ID appears in several rows nothing is calculated; use the filter to choose one period.</li>
<li>If the pilot mean is zero or negative, or all values are equal, the CV is undefined.</li>
<li>With fewer than 10 pilot plots the CV itself is uncertain and a warning appears. If the column name looks like a diameter or height, a tree-level data warning appears.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('nispi-siralama', 'Relative Ranking') ?>
<p>Computes relative ranks per criterion and overall from your table of goodness-of-fit statistics (Poudel and Cao 2013) and compares the best and worst models on a radar chart. The best model gets 1, the worst gets m (the number of models); those in between are ranked in proportion to their values.</p>
<p><b>What it does not do:</b> it does not compute the statistics (you bring the table); the weights are always equal; it does not drop one of two criteria that give the same ranks by itself; it cannot check whether AIC and BIC are comparable (they are comparable only for models fitted to the same data).</p>
<h3>Data</h3>
<p>One model per row, one goodness-of-fit statistic per column. The header row and the model name column are suggested and can be changed. Only columns with numbers become criteria.</p>
<h3>Criteria</h3>
<p>For each criterion <b>Use in ranking</b> and <b>Better is</b>: largest (R², FI), smallest (RMSE, MAE, AIC, BIC…) or closest to zero, |value| (Bias, ME…). The direction is suggested from the column name; for unrecognised names you choose it.</p>
<h3>Results and downloads</h3>
<p>In the <b>Ranking</b> table models can be left out and put back (ranks are recomputed with the remaining models); the <b>Radar chart</b> shows the best and worst models (centre 1 = best, a smaller area is better). Downloads: full report (Excel) and ranking table (CSV).</p>
<h3>Common situations</h3>
<ul>
<li>Models with a missing or unreadable value are not ranked; leaving that criterion out brings them back.</li>
<li>Criteria that give the same ranks are counted twice (e.g. FI = prediction R²); consider dropping one.</li>
<li>One very poor model pushes the others together. A radar chart needs at least 3 criteria.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('seksiyon-hacmi', 'Stem Section Volume') ?>
<p>Computes single-tree stem volume from measured section diameters by the Huber, Smalian, Newton or Hohenadl method; shows the stump and the top piece on separate rows, gives over- and under-bark volume separately, computes the form factor and an optional merchantable volume, and sums per hectare when plot sizes are given.</p>
<p><b>What it does not do:</b> it uses no volume equation and no taper equation; it does not estimate the volume of trees whose stems were not measured (per-hectare values are sums over the computed trees); it does not estimate under-bark volume without bark thickness.</p>
<h3>Data and settings</h3>
<ul>
<li><b>Stem measurement table</b>: each row is one measurement point of one tree. Tree, measurement height (above ground, not above the cut) and diameter are required; plot, period, double bark thickness, dbh, total height, cut height and plot size are optional. If you measured two cross diameters, choose how they are combined.</li>
<li><b>Link the approved data</b>: from the tree table approved in the Data Checker, missing dbh and heights are added, plot sizes are taken and trees without stem measurements are counted.</li>
<li><b>Method and data layout</b>: you may have measured at section boundaries (Smalian), at section middles (Huber), end–middle–end (Newton; Huber and Smalian can be computed too) or at 0.1H…0.9H (Hohenadl). You choose the layout; methods that do not fit are not listed.</li>
<li><b>Top piece</b>: from the last point to the tip, a cone (default), paraboloid or neiloid. Without a total height there is no top piece and the volume is labelled "to the last measured point". The stump is added to the total if you choose so.</li>
<li><b>Merchantable top diameter</b>: if given, the volume up to that diameter and its height are computed.</li>
<li><b>Per-hectare totals</b>: from the plot size column, from one size for all plots, or from the approved data.</li>
<li><b>Check thresholds</b>: buttress zone, difference between the 1.30 m diameter and dbh, middle point and Hohenadl tolerances; all are tool rules and written into the report.</li>
</ul>
<h3>Results</h3>
<ul>
<li><b>Tree volumes</b>: over-bark volume per method, under-bark volume, per cent difference with several methods, form factor, extent ("cut to tip", "to the last measured point") and state.</li>
<li><b>Plots</b>: numbers of computed and not computed trees and m³/ha. With missing trees the state is "trees missing".</li>
<li><b>Data quality</b>: diameters increasing with height outside the buttress zone, section lengths, the share of the top piece in the volume (above the threshold the result depends on the chosen top solid) and the difference between the 1.30 m diameter and dbh; the thresholds are changed under Check thresholds and written into the result.</li>
<li><b>Differences between methods</b> (if several methods are chosen): total volume and per-tree differences, in per cent of the reference method. The reference is only the denominator; no method is declared correct, the known behaviour is explained in the details.</li>
<li><b>Tree details</b>: section breakdown (stump, sections, top) and stem profile chart; clicking a row opens that tree.</li>
<li><b>Data problems</b>: errors and warnings with row numbers. Trees with errors are not computed; a tree with one unreadable point is left out entirely, because a missing point would silently reduce its volume.</li>
</ul>
<h3>Downloads</h3>
<p><b>Excel report</b> (Info, Trees, Plots, Quality, Method differences, Sections, Problems), tree volumes as CSV and result records as JSON.</p>
</section>
