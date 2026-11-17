<section class="card guide-sec">
<?= $sec('rapor', 'Report Generator') ?>
<p>Gathers a data package and the tools' run records in one report. The report is previewed on the page; it goes to paper or, with "Save as PDF", to PDF through the browser's print dialog, and to a standalone file with <b>Download HTML</b>. The package, records and notes never leave the browser.</p>
<p><b>What it does not do:</b> it computes nothing new (values are taken as they are from the package, the dashboard's computation and the records); it adds no reference that is not in the records; it writes no Word or other file format.</p>
<h3>Content</h3>
<ul>
<li><b>Report details</b>: title, prepared by, institution, date, introduction and the <b>Report language</b> (Turkish or English, apart from the interface language).</li>
<li><b>Data package</b>: a package of the Inventory Data Manager (or the made-up sample package); the filters are those of the Visualization Dashboard and affect only the charts.</li>
<li><b>Run records</b>: <b>Add records (.json)</b> or <b>Take the dashboard's records</b>; their order can be changed. For each record the tool, version, seal, origin of the data, settings and result tables (the first 60 rows of long tables) are written.</li>
</ul>
<h3>Sections and output</h3>
<ul>
<li>Sections (data package, charts, run records, references, reproducibility appendix) can be switched on and off, each with a note; the numbering follows.</li>
<li><b>References</b>: citations of the platform and of the tools used (APA, the report date as access date), references named in the records with their reading status, sources of the user's coefficient sets.</li>
<li><b>Appendix: Reproducibility</b>: the commit of the site that made the report and of each record, the seals, fingerprints of the data package and of the input files.</li>
<li><b>Print / save as PDF</b> lays out the report alone on A4 pages; <b>Download HTML</b> gives one file that carries its styles and charts.</li>
</ul>
</section>
