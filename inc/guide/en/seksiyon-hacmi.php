<section class="card guide-sec">
<?= $sec('seksiyon-hacmi', 'Stem Section Volume') ?>
<p>Computes single-tree stem volume from measured section diameters by the Huber, Smalian, Newton or Hohenadl method; shows the stump and the top piece on separate rows, gives over- and under-bark volume separately, computes the form factor and an optional merchantable volume, and sums per hectare when plot sizes are given.</p>
<p><b>What it does not do:</b> it uses no volume equation and no taper equation; it does not estimate the volume of trees whose stems were not measured (per-hectare values are sums over the computed trees); it does not estimate under-bark volume without bark thickness.</p>
<h3>Data and settings</h3>
<ul>
<li><b>Stem measurement table</b>: each row is one measurement point of one tree. Tree, measurement height (above ground, not above the cut) and diameter are required; plot, period, double bark thickness, dbh, total height, cut height and plot size are optional. If you measured two cross diameters, choose how they are combined.</li>
<li><b>Link the approved data</b>: from the tree table approved in the Data Checker, missing dbh and heights are added, plot sizes are taken and trees without stem measurements are counted.</li>
<li><b>Method and data layout</b>: you may have measured at section boundaries (Smalian), at section middles (Huber), end–middle–end (Newton; Huber and Smalian can be computed too) or at 0.1H…0.9H (Hohenadl). You choose the layout; methods that do not fit are not listed.</li>
<li><b>Top piece</b>: from the last point to the tip, a cone (default), paraboloid or neiloid. Without a total height there is no top piece and the volume is labelled "to the last measured point". The stump is added to the total if you choose so.</li>
<li><b>Merchantable top diameter</b>: if given, the volume up to that diameter and its height are computed. Hohenadl works with five equal sections and does not give this volume; whenever it cannot be computed, the reason is in the Data problems list.</li>
<li><b>Per-hectare totals</b>: from the plot size column, from one size for all plots, or from the approved data.</li>
<li><b>Check thresholds</b>: buttress zone, difference between the 1.30 m diameter and dbh, share of the top piece in the volume, middle point and Hohenadl tolerances; all are tool rules and written into the report.</li>
</ul>
<h3>Results</h3>
<ul>
<li><b>Tree volumes</b>: over-bark volume per method, under-bark volume, per cent difference with several methods, form factor, extent ("cut to tip", "to the last measured point", "ground to tip" for Hohenadl; "+ stump" when the stump is added) and state. Measurement points below the cut height count as the stump only, not as sections. For Hohenadl the true form quotients and λ₀.₉ (Heger 1965) are given too.</li>
<li><b>Plots</b>: numbers of computed and not computed trees and m³/ha. With missing trees the state is "trees missing".</li>
<li><b>Data quality</b>: diameters increasing with height outside the buttress zone, section lengths, the share of the top piece in the volume (above the threshold the result depends on the chosen top solid) and the difference between the 1.30 m diameter and dbh; the thresholds are changed under Check thresholds and written into the result.</li>
<li><b>Differences between methods</b> (if several methods are chosen): total volume and per-tree differences, in per cent of the reference method. The reference is only the denominator; no method is declared correct, the known behaviour is explained in the details.</li>
<li><b>Tree details</b>: section breakdown (stump, sections, top) and stem profile chart; clicking a row opens that tree.</li>
<li><b>Data problems</b>: errors and warnings with row numbers. Trees with errors are not computed; a tree with one unreadable point is left out entirely, because a missing point would silently reduce its volume.</li>
</ul>
<h3>Downloads</h3>
<p><b>Send to Biomass &amp; Carbon</b>: with the approved data linked, the tree volumes of the chosen method (over and under bark) are written in this browser as a separate record under the package fingerprint; the package is not changed. Trees are matched on plot × tree × period; keys held by more than one package tree are not written.</p>
<p><b>Excel report</b> (Info, Trees, Plots, Quality, Method differences, Sections, Problems), tree volumes as CSV and result records as JSON.</p>
</section>
