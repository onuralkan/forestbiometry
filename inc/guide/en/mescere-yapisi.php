<section class="card guide-sec">
<?= $sec('mescere-yapisi', 'Stand Structure & Competition') ?>
<p>For every plot and period it computes the diameter structure, diversity and density, and tree-level BAL; when the trees have coordinates, the spatial structure and the Hegyi competition index. The unit, the per-hectare values and H0 are the definitions of Plot & Stand Metrics.</p>
<p><b>What it does not do:</b> angle-count and nested plots (fixed-area plots only); Ripley's K/L and the pair-correlation function; growth or mortality prediction. It does not choose the edge correction for you: you choose it and it is written into the result.</p>
<h3>Data and settings</h3>
<ul>
<li><b>Tree table</b>: plot, diameter at breast height and plot size are required; tree, species, height, period and x, y coordinates (m) are optional. Approved data or the simulated sample can be used too.</li>
<li><b>Structure and density</b>: diameter classes for Shannon, Gini on basal area or on diameter, equal diameters in BAL, the SDI slope and reference diameter (25 cm or Reineke's 25.4 cm), the Curtis RD exponent, the planting pattern for the relative spacing (square or triangular) and the H0 selection.</li>
<li><b>Plot geometry</b>: circle (radius from the recorded area or entered) or rectangle; coordinates must be in the same frame in every plot. A tree outside the plot or without coordinates is reported with its row and that plot's spatial part is not computed.</li>
<li><b>Edge effect</b>: no correction (edge trees flagged), buffer (trees in the buffer are only neighbours or competitors) or toroidal translation (rectangles only). The number of neighbours k, the W standard angle (360°/k, Pommerening 2002; or 360°/(k + 1)) and the Hegyi competitors (the k nearest trees or those within a radius you enter).</li>
</ul>
<h3>Results</h3>
<ul>
<li><b>Plots</b>: N/ha, G, Dq, H0, CV, Gini, Shannon, Simpson, SDI, Curtis RD; with coordinates, Clark–Evans R (plain and Donnelly), W, M, T. <b>All columns</b> adds skewness, kurtosis, species Shannon, relative spacing, T1 (diameter differentiation with the nearest neighbour), U and the mean Hegyi. A value that cannot be computed is shown as "–".</li>
<li><b>Details</b>: diameter class histogram, Lorenz curve, stem map (colour: Hegyi value), notes and the tree table (BAL, d/Dq, Hegyi, edge).</li>
</ul>
<p>Clark–Evans R and W, M, T and T1 have been read in their original sources; the Hegyi index is the form cited by two secondary sources (the original index is reported to add 1 ft to the distance; this tool does not). U and the Donnelly correction are implemented under a provisional definition exception until their sources are read.</p>
<h3>Downloads</h3>
<p><b>Excel report</b> (Info, Plots, Trees, Classes, Species), your tree table with the competition columns appended (Excel), the plots as CSV and the result records as JSON.</p>
</section>
