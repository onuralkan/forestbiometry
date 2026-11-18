<section class="card guide-sec">
<?= $sec('buyume-islevi', 'Growth Function Fitter') ?>
<p>Fits and compares six growth functions on your age–size data (height, diameter, volume…) at once: Chapman–Richards, Schumacher, Gompertz, logistic, monomolecular and Weibull. The coefficients come from your data; the site ships no curves.</p>
<p><b>What it does not do:</b> the Korf function (its source has not been read yet); random effects of series or plots (one curve is fitted to all observations); site index curves (see the Site Index tool).</p>
<h3>Data and models</h3>
<ul>
<li>A table or a paste: the <b>Age (years)</b> and <b>Size</b> columns are required, the series column is optional. The name and unit of the variable are written on the charts and in the downloads. Rows that cannot be read are reported with their numbers.</li>
<li><b>Models to fit</b>: choose the forms; the source status is written next to each.</li>
</ul>
<h3>Results</h3>
<ul>
<li><b>Model comparison</b>: coefficients and their standard errors, RMSE, bias, σ̂, AIC (the smallest ★), asymptote, inflection age and the age of the culmination of the mean annual increment. Standard errors assume independent observations.</li>
<li>A chart of the observations and every curve; for the chosen model the current and mean annual increment, the residuals and a curve table. The chosen curve can be saved to the coefficient library with a source.</li>
<li>Downloads: Excel (Info, Comparison, Predictions, Curves), CSV and JSON. <b>R code (.R)</b>: a script that redoes the run in base R (<code>nls</code>): the same observations, functions and starting values, derivatives and increments (CAI) from R's <code>deriv</code>, the inflection and MAI culmination ages, the table of the chosen function. The data are not embedded; you change the file name at the top of the script to the path of your file. The site's tests check in R at every release that this code gives the tool's numbers.</li>
</ul>
</section>
