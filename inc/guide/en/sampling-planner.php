<section class="card guide-sec">
<?= $sec('sampling-planner', 'Inventory Sampling Planner') ?>
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
