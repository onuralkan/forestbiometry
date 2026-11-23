<section class="card guide-sec">
<?= $sec('data-visualization', 'Data Visualization') ?>
<p>Shows an approved data package on one page: summary, diameter distribution, species composition, N/ha and G/ha per plot, height–diameter and a tree map. Results from the tools' run records are drawn over the data. The package and the records never leave the browser.</p>
<p><b>What it does not do:</b> it fits no new model and computes nothing new (N/ha and G/ha come from the Plot &amp; Stand Metrics engine, densities from the Diameter Distribution engine, curves from the Height–Diameter engine); it does not change the package.</p>
<h3>Package and filters</h3>
<ul>
<li><b>Package shown</b>: one of the packages of the Inventory Data Manager (the active one by default); without packages, the simulated sample package can be shown.</li>
<li>Filters: <b>Period</b>, <b>Stratum</b>, <b>Species</b>, <b>Plot</b>; every panel updates together. With a species chosen, N/ha and G/ha are that species' share (0 where it is absent).</li>
<li><b>Plot × period without records</b>: "not measured" (left out) or "empty" (N = G = 0). Mean N and G are unweighted means over the plot × periods shown; design-based estimates are in Plot &amp; Stand Metrics.</li>
<li>Diameter distribution bars are densities (frequency / (n · class width)); the class width is automatic or typed. The tree map is drawn when a single plot is chosen and coordinates exist. Each chart downloads as SVG, its data as CSV. The row of buttons above the charts stays on screen while the page scrolls: a button takes you to its chart, the button of the chart in view is highlighted; <b>↑ Filters</b> goes back to the filters.</li>
</ul>
<h3>Run records</h3>
<ul>
<li><b>Add records (.json)</b>: run records downloaded from the tools. The seal is shown, and whether the record was made from this package (a record made from a package carries the package's fingerprint; for one made from a file the match cannot be told).</li>
<li>Diameter Distribution records: densities of the results whose plot and period match the filter are drawn over the histogram (the pooled result when "all" is chosen); conditional densities for thresholded fits.</li>
<li>Height–Diameter records: curves of every fitted model are drawn over the scatter; the chosen model with ★. Records of other tools are listed, not drawn. The <b>Draw</b> box hides a record, <b>Remove</b> takes it off the list.</li>
</ul>
</section>
