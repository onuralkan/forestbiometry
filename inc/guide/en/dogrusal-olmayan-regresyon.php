<section class="card guide-sec">
<?= $sec('dogrusal-olmayan-regresyon', 'Nonlinear Regression') ?>
<p>Fits nonlinear models to your own data: you choose a ready-made form or write the formula yourself. Several models are fitted to the same rows and compared. The site ships no coefficients.</p>
<p><b>What it does not do:</b> mixed-effects models (for plot effects, use the Mixed-Effects Models tool), equation systems (for these, use the Systems of Equations tool), constrained parameters, autocorrelated errors, profile-likelihood intervals.</p>
<h3>Data and models</h3>
<ul>
<li><b>Data table</b>: one observation per row; the response and the explanatory variables as columns. The simulated table is only for trying out.</li>
<li><b>Ready-made forms</b>: Chapman–Richards, Schumacher, Gompertz, logistic, monomolecular, Weibull (the forms of the Growth Functions tool) and the power forms y = a·x^b, y = a·x1^b·x2^c (Parresol 2001). Map the variables to columns; empty starting values are found from the data.</li>
<li><b>Free formula</b>: e.g. <code>a*D^b*H^c</code> or <code>1.3 + b0*(1-exp(-b1*D))^b2</code>. Operators + − * / ^ and parentheses; functions exp, ln, log10, sqrt, abs; constant pi. Every name in the formula is either mapped to a column or is a coefficient; a name equal to a column heading is mapped to that column. Starting values of the coefficients are required. Derivatives are computed exactly from the formula.</li>
<li><b>Weight</b> (optional, per model): error variance σ²·ψ; ψ = X^θ (X a column, θ given or estimated from the residuals of the unweighted fit) or ψ the value of a column (Parresol 2001).</li>
</ul>
<h3>Results</h3>
<ul>
<li><b>Comparison</b>: n, number of coefficients, RMSE, bias, R² (the Model Evaluation tool's definitions), AIC, σ̂, weight and convergence status. Every model is fitted to the same rows; rows with a missing value in a column used are left out with their row numbers. A model that does not converge is not hidden; its status is shown.</li>
<li>For every model the coefficients, asymptotic standard errors and 95% confidence intervals, observed–predicted and residual charts.</li>
<li><b>Confidence and prediction intervals</b>: at the variable values you enter, the confidence interval for the mean and the prediction interval for a new observation (a weighted model also asks for the value of the weight variable).</li>
<li><b>Save the set</b>: the chosen model is saved to the coefficient library with its formula, coefficients, covariance, units and source description. <b>Send and open Model Evaluation</b>: the observed y and the models' predictions go to the Model Evaluation tool.</li>
<li>Downloads: Excel (Info, Comparison, Coefficients, Observations), CSV, JSON run record. <b>R code (.R)</b>: a script that redoes the run in base R (<code>nls</code>): the same rows, formulas (translated to R; <code>ln</code> is R's <code>log</code>), starting values and weights, derivatives from R's <code>deriv</code> (numerical for functions not in its table, such as <code>abs</code>), the point of the interval card. The data are not embedded; you change the file name at the top of the script to the path of your file. The site's tests check in R at every release that this code gives the tool's numbers.</li>
</ul>
</section>
