<section class="card guide-sec">
<?= $sec('denklem-sistemleri', 'Systems of Equations') ?>
<p>Fits several related equations on the same observations together (e.g. the height and the volume of a tree). When the errors of the equations are correlated, joint estimation is more efficient; coefficients shared between equations make compatible systems. The site ships no coefficients.</p>
<p><b>What it does not do:</b> instrumental-variable methods for endogenous regressors (2SLS, 3SLS), different numbers of observations per equation, weighting of the errors, linear restrictions on the coefficients other than equality.</p>
<h3>The system</h3>
<ul>
<li><b>Data table</b>: one observation per row; the variables of every equation as columns. A row with a missing value in any equation is left out of the whole system (the same observations in every equation).</li>
<li><b>Equations</b>: for each, the response and a formula (e.g. <code>1.3 + a*(1-exp(-b*D_cm))^c</code>). A name equal to a column heading is mapped to that column; the other names are coefficients. A coefficient that occurs under the same name in several equations is one coefficient: for instance, writing the height equation itself in place of the height in the volume equation (<code>k*D_cm^p*(1.3 + a*(1-exp(-b*D_cm))^c)^q</code>) makes the two equations compatible.</li>
<li><b>Starting values</b>: 0 is enough in linear equations; enter reasonable values for nonlinear coefficients.</li>
<li><b>Method</b>: OLS (equations weighted equally, with the shared coefficients), SUR (generalized least squares with the covariance estimated from first-step OLS residuals) or iterated SUR. <b>Residual covariance</b>: with T, √((T − Kᵢ)(T − Kⱼ)) or T − max(Kᵢ, Kⱼ) (Henningsen and Hamann 2007).</li>
</ul>
<h3>Results</h3>
<ul>
<li>Coefficients (estimate, standard error, t; the equations they occur in and whether they are shared), R², SSR and σ̂ per equation, the system's OLS R² and McElroy R², log L, residual correlation between equations, an observed–predicted chart for every equation.</li>
<li><b>Test of the shared coefficients</b>: the system is fitted again with the shared coefficients separate in every equation and a likelihood-ratio test is made (both fits by iterated SUR, maximum likelihood); a small p says the shared-coefficient restriction does not agree with the data.</li>
<li><b>Method comparison</b>: the same system by OLS, SUR and iterated SUR; coefficients and standard errors side by side.</li>
<li><b>Save the sets</b>: every equation is saved as its own set, with its shared coefficients and covariance, under the same system id. Downloads: Excel (Info, Coefficients, Equations, Observations), CSV, JSON run record. <b>R code (.R)</b>: a script that redoes the run in base R: the same rows, equations (translated to R) and shared coefficients, the same method and residual covariance, and with shared coefficients the likelihood-ratio test. The estimator (least squares weighted with Σ̂⁻¹, damped Gauss–Newton) is written out in the script, derivatives from R's <code>deriv</code>; <code>systemfit</code>'s nonlinear function is not used because it did not move in the SUR step. If some coefficients of the unrestricted system are not identified by the data (a flat likelihood), R's LR and the tool's can differ; the script prints the unrestricted estimates. The data are not embedded; you change the file name at the top of the script to the path of your file. The site's tests check in R at every release that this code gives the tool's numbers.</li>
</ul>
</section>
