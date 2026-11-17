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
