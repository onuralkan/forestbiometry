<section class="card guide-sec">
<?= $sec('veri-yoneticisi', 'Inventory Data Manager') ?>
<p>Keeps the data packages (<code>forest-dataset/1</code>) you approved in the Data Checker in this browser as projects. One package is <b>active</b>: Plot &amp; Stand Metrics, Stand Structure, Height–Diameter, Site Index, Section Volume, Volume Equations, Biomass &amp; Carbon and Model Evaluation read the active package as approved data; Data Visualization and the Report Generator also open the active package first. Packages are stored in this browser only.</p>
<p><b>What it does not do:</b> it does not change tree or plot records (measurement corrections are made in the Data Checker, with a reason, and approved again); it does not merge two packages; it does not carry packages to another device by itself (a backup file does).</p>
<h3>Packages</h3>
<ul>
<li>Every approval in the Data Checker is added to the list and made active; the same package is not added twice (it is recognised by its SHA-256 fingerprint). Data approved before DI-03 are taken into the list as "earlier approval" on the first visit.</li>
<li><b>Make active</b> hands the package to the tools; reload tool pages that are open. <b>Deactivate</b> on the tools index does not delete the package, it only stops the tools from seeing it.</li>
<li><b>Details</b>: project details (name, inventory year, place, description, notes; the name is required, the year has four digits), a summary of the package (plots, periods, records, species, diameter range, measured and estimated heights, ages, coordinates, strata, warnings, excluded rows, change log, approval time, fingerprint) and record counts per plot × period.</li>
<li><b>Copy</b> makes a new project with the same package; <b>Delete</b> asks first and cannot be undone. If the active package is deleted, the tools see no approved data.</li>
</ul>
<h3>Import and export</h3>
<ul>
<li><b>Data package (JSON)</b>: the package itself (same format as the Data Checker's JSON); it can also be loaded as a file in Plot &amp; Stand Metrics.</li>
<li><b>Download a backup (JSON)</b>: every project with its details in one file (<code>forest-project-library/1</code>).</li>
<li><b>Import (JSON)</b>: a data package, one project or a backup. A preview comes first: new, already there (same package; skipped) and invalid (with the reason); nothing changes until you press <b>Apply</b>.</li>
</ul>
</section>
