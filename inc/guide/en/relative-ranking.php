<section class="card guide-sec">
<?= $sec('relative-ranking', 'Relative Ranking') ?>
<p>Computes relative ranks per criterion and overall from your table of goodness-of-fit statistics (Poudel and Cao 2013) and compares the best and worst models on a radar chart. The best model gets 1, the worst gets m (the number of models); those in between are ranked in proportion to their values.</p>
<p><b>What it does not do:</b> it does not compute the statistics (you bring the table); the weights are always equal; it does not drop one of two criteria that give the same ranks by itself; it cannot check whether AIC and BIC are comparable (they are comparable only for models fitted to the same data).</p>
<h3>Data</h3>
<p>One model per row, one goodness-of-fit statistic per column. The header row and the model name column are suggested and can be changed. Only columns with numbers become criteria.</p>
<h3>Criteria</h3>
<p>For each criterion <b>Use in ranking</b> and <b>Better is</b>: largest (R², FI), smallest (RMSE, MAE, AIC, BIC…) or closest to zero, |value| (Bias, ME…). The direction is suggested from the column name; for unrecognised names you choose it.</p>
<p><b>Weights</b> (optional): each criterion has a weight, 1 by default, which gives the equal weighting of Poudel and Cao (2013). A larger weight makes that criterion count more in the overall rank; only the ratios matter. The weights are your choice and are shown with the results and in the downloads. To see how much the order of the models depends on the data themselves, use the bootstrap ranking in <a href="model-evaluation.php">Model Evaluation</a>, which has the observed and predicted values.</p>
<h3>Results and downloads</h3>
<p>In the <b>Ranking</b> table models can be left out and put back (ranks are recomputed with the remaining models); the <b>Radar chart</b> shows the best and worst models (centre 1 = best, a smaller area is better). Downloads: full report (Excel) and ranking table (CSV).</p>
<h3>Common situations</h3>
<ul>
<li>Models with a missing or unreadable value are not ranked; leaving that criterion out brings them back.</li>
<li>Criteria that give the same ranks are counted twice (e.g. FI = prediction R²); consider dropping one.</li>
<li>One very poor model pushes the others together. A radar chart needs at least 3 criteria.</li>
</ul>
</section>
