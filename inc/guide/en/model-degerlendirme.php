<section class="card guide-sec">
<?= $sec('model-degerlendirme', 'Model Evaluation') ?>
<p>Compares observed values with the predictions of one or more models: bias (ē), MAE, RMSE and prediction R² (1 − SSE/SST); observed–predicted and residual plots; tables by plot, species, diameter class and validation fold. The error sign is <b>e = observed − predicted</b> everywhere; a negative bias means the model over-predicts on average. R² is not the squared correlation and can be negative.</p>
<p>Optionally, the measures are weighted by a weight column, and a confidence interval for the mean error (bias), equivalence tests (Robinson and Froese 2004) and bootstrap confidence intervals for the bias, MAE, RMSE and R² (percentile and BCa; DiCiccio and Efron 1996) are given.</p>
<p><b>What it does not do:</b> AIC, adjusted R², parameter confidence intervals and model significance are not computed (the number of parameters is not known). The tool does not assume external validation.</p>
<h3>Data</h3>
<p>One observation per row: the observed value and the predictions of one or more models. Plot, species, diameter and validation fold columns are optional. The table can come from a file, by pasting, or from the data approved in the Checker with "Use approved data" (unmapped columns become prediction candidates).</p>
<h3>Columns and settings</h3>
<ul>
<li><b>Observed value column</b> and <b>prediction columns</b>: each model gets a name and a <b>source of predictions</b> (not stated, training data, independent test data, cross-validation). The source does not change the calculation; it is used in the report and the warnings.</li>
<li><b>Groups</b>: plot, species, validation fold, a diameter column and diameter class limits.</li>
<li><b>Which rows?</b> The default "common valid rows": rows where every model and the observed value are present; the models are compared on the same sample. With "each model with its own valid rows" the samples may differ and the models cannot be compared directly.</li>
<li><b>Relative measures</b> (optional): as a percentage of the observed mean, range or standard deviation.</li>
<li><b>Weight</b> (optional): e.g. a sampling weight or a per-hectare expansion factor. Every average becomes Σw·(…)/Σw. Rows with an empty, unreadable, zero or negative weight are left out and counted. Under weights the relative measure on the standard deviation is undefined, and the confidence interval and the equivalence tests are not computed.</li>
<li><b>Inference on the bias</b>: confidence level (90, 95, 99 %) and an optional equivalence test. The equivalence margin is entered either in data units (δ, e.g. 0.5 m) or relative to the standard deviation of the errors (ε, e.g. 0.25); the test size α is 0.01, 0.05 or 0.10.</li>
<li><b>Bootstrap confidence intervals</b> (optional): number of replications B (1000, 2000, 5000) and a seed. The pairs are resampled with replacement; the same seed gives the same result. The percentile interval comes from the percentiles of the bootstrap estimates, the BCa interval from percentiles adjusted by the bias correction (ẑ₀) and the jackknife acceleration (â). BCa is usually more accurate; if ẑ₀ or â is undefined, only the percentile interval is given. A "*" marks an endpoint taken from the smallest or largest replication: increase B.</li>
</ul>
<p><b>How stable is the ranking?</b> With the bootstrap on and two or more models (no weight), each bootstrap sample is also ranked as in <a href="nispi-siralama.php">Relative Ranking</a> on |bias|, MAE, RMSE and R². The Inference tab then shows, for each model, its overall relative rank on all data, the interval of that rank over the samples and how often it came first. A model that comes first in, say, 95 % of the samples is clearly the best on these data; two models that share the first place about equally are not distinguishable.</p>
<h3>Results and downloads</h3>
<p><b>Summary</b> (measures, the source statement, row accounting: empty, unreadable and used rows), <b>Inference</b> (confidence interval for the bias, bootstrap intervals and equivalence tests), <b>Charts</b> (observed–predicted with a 1:1 line; residual–predicted; the points can be coloured by a group column; below them the residual table of the chosen model, which can be ordered by the largest |e| to find outlying rows), <b>Groups</b> and <b>Download</b>: full report (Excel), measures table, inference table, bootstrap table, group table and residuals by row (CSV).</p>
<h3>How to read the equivalence test</h3>
<p>In a classical test the null hypothesis is "no difference"; a small or noisy sample cannot reject it, and the model looks good by default. In an equivalence test the null hypothesis is "the model is biased" (|mean error| ≥ δ); equivalence is accepted only if the data show it. Two tests are given: <b>TOST</b> (is the 1 − 2α confidence interval inside ±δ?) and the more powerful <b>paired t-test for equivalence</b> (|t| &lt; C). "Not shown" does not prove that the model is biased; the power column is the probability of showing equivalence when the true bias is zero. The result depends on the δ you choose; set δ from the intended use, before looking at the data.</p>
<h3>Common situations</h3>
<ul>
<li>A warning appears when the source is "training data" or "not stated": performance on the training data is usually optimistic compared with new data; predictions of unstated origin should not be read as external validation.</li>
<li>If the observed values are constant, R² is undefined; if the denominator of a relative measure is zero or negative, that measure is shown as undefined.</li>
<li>The interval and the tests assume independent pairs; trees on the same plot resemble each other, so the interval can be narrower than it really is.</li>
<li>A row can be left out for more than one reason, so the counts in the row accounting do not add up.</li>
</ul>
</section>
