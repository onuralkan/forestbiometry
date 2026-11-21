<section class="card guide-sec">
<?= $sec('govde-profili', 'Stem Taper') ?>
<p>With a taper equation (Max and Burkhart 1976, Model 4; Kozak 2004, Model 02) computes the diameter at any height, the height of a diameter, the total volume and the merchantable volume to a top diameter. You enter the coefficients (with their source) or fit them to your stem measurements; the site ships no coefficients.</p>
<p><b>What it does not do:</b> a bark model (outside- and inside-bark profiles are separate coefficient sets); mixed-effects fitting; defects, sweep or quality grades in bucking (diameter and length only).</p>
<h3>Model</h3>
<ul>
<li><b>Enter a coefficient set</b>: choose the form, enter the coefficients and the source; choosing whether the set gives diameters outside or inside bark (<b>Bark</b>) is required.</li>
<li><b>Fit to stem measurements</b>: the same stem table as the Stem Section Volume tool (tree, height, diameter; dbh and height from the tree columns). Choose the diameter to fit (outside or inside bark), the form and the <b>Fitting scale</b>. The result shows the coefficients, bias and RMSE by relative height class, a residual chart and, per tree, the section volume against the profile volume; enter a source to save the set to the library. Standard errors assume independent observations.</li>
<li><b>Profile sets to use</b>: one outside-bark and one inside-bark set can be chosen; with both, the results show both.</li>
</ul>
<h3>Trees and results</h3>
<ul>
<li><b>One tree</b> (dbh and height) or a <b>Tree table</b>; cut height, optional top diameter and the profile table step.</li>
<li>Per tree: total volume (cut to tip), the height of the top diameter and the merchantable volume, d(1.3) and notes (outside the valid range, regions without a diameter). The stem profile chart and profile table of the chosen tree.</li>
<li>Downloads: Excel (Info, Trees, Profile), CSV and JSON.</li>
<li><b>Log-length limit</b> (optional): log length, trim allowance per log, optional minimum log length and whether a short top piece counts. The length from the cut to the top limit (the height of the top diameter; the tip without a top diameter) is divided by log length + trim and whole logs are counted (Kershaw, Ducey, Beers and Husch 2016, §6.4.1, §7.4.1, §7.4.3). Results: number and volume of logs, trim and the rest (they add up to the merchantable volume); the log list of the chosen tree (ends, length, small-end diameter, volume). The values are yours; the book's example values are not defaults.</li>
</ul>
<h3>Product bucking (assortments)</h3>
<ul>
<li>Tick <b>Buck the stem into products</b> and add your products: name, minimum small-end diameter, length (fixed, or a range with a maximum length and a length step), trim allowance, priority (1 highest) and value per m³. The site ships no products or prices. The product list can be downloaded as JSON and loaded again.</li>
<li>The <b>Diameter side of the products</b> (outside/inside bark) must match the chosen profile set; the cut height and top diameter come from the volume settings.</li>
<li><b>Method</b>: <b>highest value</b> (dynamic programming; maximises total value or total volume) or <b>priority order</b> (from the butt up, the highest-priority product that fits). Pieces lie on a grid of the <b>Bucking step</b> from the cut; length + trim must be a whole number of steps (e.g. step 0.05 m for a 5 cm trim). A piece's volume and value include the trim; its small-end diameter is the diameter at its top.</li>
<li>Results: product summary (all trees), volume balance (pieces + stump + residual + top = total stem), pieces, volume and value per tree; a drawing of the chosen tree's stem (each product by colour and pattern) and its piece table. Downloads: Products and Pieces sheets in Excel, a pieces CSV, JSON.</li>
</ul>
<p><b>R code</b>: after a fit, "R code (.R)" downloads a script that redoes the fit in R, together with a CSV file of the measurement points the tool used (the stem table is read and checked here).</p>
</section>
