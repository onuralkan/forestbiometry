<section class="card guide-sec">
<?= $sec('ornek-alan', 'Plot & Stand Metrics') ?>
<p>For every plot and measurement period: stems per hectare (N/ha) and basal area (G/ha), arithmetic mean diameter and quadratic mean diameter (Dq), the standard deviation of diameter, the smallest and largest diameter, the diameter class distribution, species composition, the dominant diameter D0 (mean diameter of the 100 thickest trees per hectare) and the top height H0 (mean height of the 100 tallest trees per hectare), the mean of measured heights and the mean age. Also a descriptive between-plot summary and, when a sampling design is given, a design-based estimate for the forest.</p>
<p><b>What it does not do:</b> it does not estimate heights (heights flagged "estimated" in the data are shown apart, never pooled with measured ones); it is for fixed-area plots only (nested plots and angle counts are out of scope, and the tool does not correct for them); it applies no finite population correction under simple random sampling. The between-plot table is not a forest estimate.</p>
<h3>Data</h3>
<ul>
<li><b>Data approved in the checker</b>: "Use these data". This is the recommended route.</li>
<li><b>Data package (.json)</b>: the package exported by the Checker.</li>
<li><b>Tree table (Excel, CSV)</b>: one tree per row. Required: plot, diameter, plot size (a column or one value for every plot). Optional: height, age, tree number, species, period, stratum, status. Units: diameter cm/mm, area m²/ha, height m/dm/cm. A table loaded directly does not go through the Checker's coding and unit screens; only unreadable values are reported.</li>
</ul>
<p>To continue, tick the scope statement: the data come from fixed-area plots, and no nested plots or angle counts were used.</p>
<h3>Settings</h3>
<ul>
<li><b>Records to count</b>: if the data have a status, which statuses are counted (default: all).</li>
<li><b>Plot–period combinations without records</b>: if some plots have no tree records in some periods, you decide: "Measured, no trees (N = 0, G = 0)" or "Not measured". Without a decision these combinations stay out of the calculation and no forest estimate is made for that period.</li>
<li><b>Dominant diameter and top height</b>: D0 from the 100 thickest, H0 from the 100 tallest trees per hectare; there is no choice. H0 uses measured heights only.</li>
<li><b>Diameter classes</b>: equal width (default 4 cm) or a list of limits; classes are half-open [lower, upper); optional open class above the last limit.</li>
<li><b>Estimate for the forest</b>: without a design no forest estimate is made. "Simple random" (approximately for systematic grids) with an optional forest area (for totals); "Stratified random" with stratum areas (when the data have strata).</li>
</ul>
<h3>Results</h3>
<ul>
<li><b>Plots</b>: one row per plot × period with its state (measured, empty, not measured, awaiting a decision). Click a plot ID to open its detail.</li>
<li><b>Detail</b>: main figures (including the expansion factor 10000/A), dominant trees and age, the diameter class distribution and its chart, species composition (shares and their denominators), heights. The navigator on the left offers search, sorting and a "problems only" filter; ← → move between plots.</li>
<li><b>Between-plot summary</b>: per period the number of plots, mean, standard deviation, minimum, median, maximum (not weighted by plot size).</li>
<li><b>Forest estimate</b>: for N/ha and G/ha the estimate, standard error, relative standard error, confidence limits at the level you choose in the settings (90, 95 or 99 %; Student's t, Cochran 1977) and (with an area) totals with their limits; by species if there are several; a strata table for the stratified design. The limits assume a roughly normal mean: with few plots and very skewed values they can be too narrow.</li>
</ul>
<h3>Downloads</h3>
<p>"Tree data + stand parameters (Excel)" adds the plot-level results to the unchanged tree table; "Full report (Excel)"; plot table, diameter classes and species composition as CSV.</p>
<h3>Common situations</h3>
<ul>
<li>"Problems found; the table was not used": problems such as different sizes for one plot or a tree number repeated in the same period are listed with row numbers.</li>
<li>Nothing is calculated if the class limits are not strictly increasing or there are too many classes.</li>
<li>In the stratified design no standard error is given for a stratum without an area or with a single plot.</li>
</ul>
</section>
