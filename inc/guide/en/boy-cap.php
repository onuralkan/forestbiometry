<section class="card guide-sec">
<?= $sec('boy-cap', 'Height–Diameter Modelling') ?>
<p>Fits six height–diameter equations to measured heights by nonlinear least squares: Näslund, Michailoff, Curtis, Power (Stoffels and van Soest), Chapman–Richards and Weibull (Yang et al.). It compares the models on the same trees, tests them by plot-based cross-validation and predicts heights for trees without a measured height.</p>
<p><b>What it does not do:</b> no mixed-effects models (for plot effects, use the Mixed-Effects Models tool); species share one curve (if they differ, run each species separately); it does not choose a model for prediction by itself; it does not write predicted heights back into the approved data.</p>
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
<p>Full report (Excel); the tree table (measured and predicted heights in separate columns), parameters, cross-validation folds and new-diameter predictions as CSV. <b>R code (.R)</b>: a script that redoes the run in base R (<code>nls</code>) with the same settings, starting values and cross-validation folds; the data are not embedded, you change the file name at its top to the path of your file. The site's tests check in R at every release that this code gives the tool's numbers.</p>
<p><b>Continue in another tool</b> (Downloads tab): the trees used in the fit (d in cm, h in m) open in <a href="dogrusal-olmayan-regresyon.php">Nonlinear Regression</a> for weighted fitting and variance functions when the spread of heights grows with diameter, or, with at least two plots, in <a href="karma-modeller.php">Mixed-Effects Models</a> for a plot random effect and calibration to a new plot from a few measured heights. The other tool starts with the response, the plot group and a first model chosen; your table here does not change.</p>
<h3>Common situations</h3>
<ul>
<li>Models that "did not converge" or "diverged" give no parameters; divergence means the asymptote is not identified by the data.</li>
<li>If a cross-validation fold fails, that fold's trees are left out for every model.</li>
</ul>
</section>
