<section class="card guide-sec">
<?= $sec('mescere-yapisi', 'Stand Structure & Competition') ?>
<p>For every plot and period it computes the diameter structure, diversity and density, and tree-level BAL; when the trees have coordinates, the spatial structure and the Hegyi competition index. The unit, the per-hectare values and H0 are the definitions of Plot & Stand Metrics.</p>
<p><b>What it does not do:</b> angle-count and nested plots (fixed-area plots only); Ripley's K/L and the pair-correlation function; growth or mortality prediction. It does not choose the edge correction for you: you choose it and it is written into the result.</p>
<h3>Data and settings</h3>
<ul>
<li><b>Tree table</b>: plot, diameter at breast height and plot size are required; tree, species, height, period and x, y coordinates (m) are optional. Approved data or the simulated sample can be used too.</li>
<li><b>Structure and density</b>: diameter classes for Shannon, Gini on basal area or on diameter, equal diameters in BAL, the SDI slope and reference diameter (25 cm or Reineke's 25.4 cm), the Curtis RD exponent, the planting pattern for the relative spacing (square or triangular) and the H0 selection.</li>
<li><b>Crown competition factor (CCF)</b>, optional: one coefficient set for all species or sets by species. A set has one of two forms: the crown width of an open-grown tree CW = b0 + b1·d (m; MCA = π·CW²/4) or directly MCA = b0 + b1·d + b2·d² (m²). A least-squares line can be fitted to the dbh and crown width of your open-grown, competition-free trees and saved as a set with its citation. The site contains no coefficients.</li>
<li><b>Plot geometry</b>: circle (radius from the recorded area or entered) or rectangle; coordinates must be in the same frame in every plot. A tree outside the plot or without coordinates is reported with its row and that plot's spatial part is not computed.</li>
<li><b>Edge effect</b>: no correction (edge trees flagged), buffer (trees in the buffer are only neighbours or competitors) or toroidal translation (rectangles only). The number of neighbours k, the W standard angle (360°/k, Pommerening 2002; or 360°/(k + 1)) and the Hegyi competitors (the k nearest trees or those within a radius you enter).</li>
</ul>
<h3>Results</h3>
<ul>
<li><b>Plots</b>: N/ha, G, Dq, H0, CV, Gini, Shannon, Simpson, SDI, Curtis RD, CCF (%) if a set is chosen; with coordinates, Clark–Evans R (plain and Donnelly), W, M, T. <b>All columns</b> adds skewness, kurtosis, species Shannon, relative spacing, T1 (diameter differentiation with the nearest neighbour), U and the mean Hegyi. A value that cannot be computed is shown as "–".</li>
<li><b>Details</b>: diameter class histogram, Lorenz curve, stem map (colour: Hegyi value), notes and the tree table (BAL, d/Dq, Hegyi, edge).</li>
</ul>
<p>CCF = Σ (trees per hectare × MCA as a per cent of the hectare) (Krajicek et al. 1961, cited by Kershaw et al. 2016); 100 means that crowns of open-grown size would just cover the ground; it is not a measure of crown closure. van Laar and Akça's fraction (CCF/100) is exported too. If a species has no set or a tree's MCA cannot be computed, that plot's CCF is not given and the notes say why; a partial sum would understate the density.</p>
<p>Clark–Evans R and W, M, T and T1 have been read in their original sources; the Hegyi index is the form cited by two secondary sources (the original index is reported to add 1 ft to the distance; this tool does not). U and the Donnelly correction are verified against the documentation and output of R packages (forestSAS and spatstat; Donnelly's constant 0.0412 as in spatstat); their original sources have not been read.</p>
<h3>Downloads</h3>
<p><b>Excel report</b> (Info, Plots, Trees, Classes, Species), your tree table with the competition columns (and the MCA when CCF is computed) appended (Excel), the plots as CSV and the result records as JSON.</p>
</section>
