<section class="card guide-sec">
<?= $sec('site-index', 'Site Index') ?>
<p>Computes the site index at a base age (the top height at that age) from top height and age with a coefficient set you enter; if you define site classes it gives the class and draws the curve family.</p>
<p><b>What it does not do:</b> it contains no species or regional coefficients and no yield table; it does not convert between age types (total age, breast-height age); mixed-effects models are not in this version.</p>
<h3>Model</h3>
<ul>
<li><b>Coefficient sets</b>: form (Chapman–Richards anamorphic or polymorphic, Schumacher), coefficients, <b>age type</b> and <b>top height definition</b> (required), optional validity range and the citation (required). Sets are stored in this browser only and can be downloaded and loaded as JSON.</li>
<li>The Schumacher form is written ln H = b₀ + b₁/A; a growing curve has a negative b₁. If your source writes H = b₀·exp(−b₁/A), enter the coefficient as −b₁.</li>
<li><b>Fit to my own data</b> tab (in the Model step, next to the <b>Coefficient set from a source</b> tab): stem analysis or repeated top height measurements (series id, age, height). A simulated sample can be loaded to try it; the coefficients it gives belong to no species or region. The equation is fitted to pairs of observations of the same series; pairs may be consecutive, from the first observation or all pairs, and the choice changes the result. Start values are automatic or yours; standard errors assume independent observations (observations of one series are not independent). The result is written to the library as a "fitted" set with the age type, top height definition and citation; the age and height range of the data becomes its validity range.</li>
<li><b>Uncertainty: series-level bootstrap</b>: series (not single observations) are resampled and the equation is refitted in each replicate; the 95 % percentile intervals of the coefficients, the failure rate, B and the seed are shown. If a bootstrapped set is saved, the results give a 95 % interval for the site index of every point. For sets you enter, an interval is computed only if you enter the covariance matrix from the source (delta method); otherwise "no uncertainty information" is written.</li>
<li><b>Base age</b>: there is no default; enter the base age of the classification you use. Difference equations are base-age invariant, so the base age changes the age at which the index is read, not the curves.</li>
<li><b>Site classes</b> (optional): equal-width classes or boundaries you write; I may be the best or the poorest site. An index outside the classes is written "outside the classes".</li>
</ul>
<h3>Data</h3>
<ul>
<li>One point (age and top height), a table (plot, period, age, top height) or the approved tree data. With approved data, H0 uses the same definition as the Plot & Stand tool (the 100 tallest trees per hectare) and measured heights only; the age is the mean of the trees with a recorded age.</li>
<li><b>Age type in the data</b>: you choose it; if it is not the age type of the equation, nothing is computed.</li>
</ul>
<h3>Results and downloads</h3>
<p>For each point the site index, class and notes (points outside the validity range of the set are computed and flagged); the curve family chart (the indices at the class boundaries, or the smallest, median and largest computed index). Every result carries the equation, base age, age type, top height definition and the note "produced with user coefficients". <b>Excel report</b> (Info, Site index, Curves), CSV and JSON.</p>
<p><b>R code</b>: after a fit, "R code (.R)" downloads a script that redoes the fit in R (nls) with the same series, pairs and equation; pasted cells come with it as a CSV file.</p>
</section>
