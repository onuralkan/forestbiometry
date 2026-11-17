<section class="card guide-sec">
<?= $sec('karma-modeller', 'Mixed-Effects Models') ?>
<p>Fits mixed-effects models to grouped data (e.g. trees in plots): the fixed effects are common to all groups, the random effects are per-group deviations. Linear (LME) and nonlinear (NLME) models are on the same page. The site ships no coefficients.</p>
<p><b>What it does not do:</b> several nested grouping levels (e.g. region › plot), autocorrelated errors, generalized mixed models (binary or count data), variables with measurement error.</p>
<h3>Data and models</h3>
<ul>
<li><b>Data table</b>: a group column, the response and the explanatory variables. The simulated table (25 plots, height–diameter) is only for trying out.</li>
<li><b>Linear mixed model</b>: the intercept and the columns you choose (transformation x, ln x or x²); random effects on the intercept and/or on chosen terms.</li>
<li><b>Nonlinear mixed model</b>: one of the ready-made forms or a free formula (e.g. <code>1.3 + a*(1-exp(-b*D))^c</code>); a random effect is added per group to the chosen coefficients. With empty starting values the model is first fitted to all data by nonlinear least squares.</li>
<li><b>Estimation</b>: ML or REML. <b>Covariance</b>: diagonal (independent) or general (correlated) random effects. <b>Error variance</b>: constant or σ²·|v|^(2δ) (varPower; v a variable of the model, δ estimated).</li>
</ul>
<h3>Results</h3>
<ul>
<li><b>Comparison</b>: k, log L, AIC, BIC and σ̂; every model is fitted to the same rows. Compare REML likelihoods only between models with the same fixed effects; compare models with different fixed effects by ML.</li>
<li><b>Likelihood-ratio test</b>: L = 2(log L₁ − log L₀) for two nested ML models, χ² distribution.</li>
<li>For every model the fixed effects (estimate, standard error, t), the variance components (standard deviations, correlation, σ, δ), the groups' random effects, observed–predicted and residual charts at the group level.</li>
<li><b>Calibrate a new group</b>: the random effects of a group not in the fit are predicted from a few of its measurements (e.g. the heights of three trees in a new plot) and the curve is adapted to that group. For a nonlinear model choose the one-step approximation or the iterated conditional mode.</li>
<li><b>Save the set</b>: the fixed effects as coefficients; the random-effect covariance, σ and δ are written into the set. Downloads: Excel (Info, Comparison, Fixed effects, Random effects, Observations), CSV, JSON run record.</li>
</ul>
</section>
