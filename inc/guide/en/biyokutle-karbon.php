<section class="card guide-sec">
<?= $sec('biyokutle-karbon', 'Biomass and Carbon') ?>
<p>Computes component biomass (kg per tree, Mg/ha per plot × period), carbon and CO₂ equivalent from your tree data. The site contains no species coefficients, wood densities, expansion factors, root ratios or carbon fractions; you enter all of them and their sources are written with the results.</p>
<p><b>What it does not do:</b> it does not estimate missing heights (the Height–Diameter tool does); it does not compute a species without a set with another species' equation; it does not assume the components add up; it cannot check that the volume definition matches the factors.</p>
<h3>Data and approach</h3>
<ul>
<li>Data: a <b>Tree table</b> (plot, diameter at breast height and plot size required; tree, species, height, period optional) or the active approved data package. The simulated table is for trying out only; it carries no coefficients.</li>
<li><b>Allometric equations</b>: enter the components (e.g. stem, branches, foliage) and the carbon fraction of each (CF, 0–1). In the <b>Species → coefficient set</b> table choose a set for every species and component; "Apply this column to every species" does it explicitly. If an optional separate total equation is chosen, its difference from the component sum is written. Sets come from the editor on the page or from the Coefficient Library; ln and log₁₀ forms are separate, and the Baskerville correction is not applied to a log₁₀ equation (source awaited).</li>
<li><b>Conversion from volume</b>: a volume column per tree (m³), the bark side of the volume and of the factors (different sides compute nothing), D and BEF or BCEF, R (below-ground / above-ground), CF and the source of the factors (required). The volume definition must be the one the factors were defined for.</li>
</ul>
<h3>Results</h3>
<ul>
<li>Species without a set, trees without height and trees without volume with their row numbers; the number of trees computed with an estimated height or outside the validity range.</li>
<li>Per plot × period: components, total, C and CO₂ (Mg/ha). A unit with a tree that could not be computed gets no total (–). Plot × period without records count as "not measured" or "empty".</li>
<li>Downloads: Excel (Info sheet with the sources of the sets and the rules, Units, Trees), trees as CSV and the JSON run record.</li>
</ul>
</section>
