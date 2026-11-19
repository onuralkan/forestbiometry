<section class="card guide-sec">
<?= $sec('genel', 'General') ?>
<h3>Your data</h3>
<p>All calculations run in your browser. The files you load are not sent to the server, and the server keeps no user data. Each tool's session (the loaded table and the settings) is kept only in this browser (IndexedDB) and opens with the message "Previous session restored" when you come back. The <b>Reset session</b> button in each tool deletes that tool's record. Another browser or computer does not see these records.</p>
<h3>Loading data</h3>
<ul>
<li><b>Choose a file</b>: CSV, TXT, TSV and Excel (XLSX). The old .xls format is not read; save as .xlsx in Excel. Formulas and macros in an Excel file are not run, only the last saved values are read; if there are several worksheets you can choose one.</li>
<li><b>Paste from Excel</b>: copy the cells and paste them into the box.</li>
<li>In text files the column delimiter is detected (it can be changed). The <b>Text encoding</b> can be utf-8, windows-1254 or iso-8859-9; if Turkish letters look broken, change the encoding. <b>First row is a header</b> sets the header row.</li>
<li>Columns are suggested from the header names (e.g. <code>cap_cm</code>, <code>dbh</code>, <code>alan_no</code>, <code>plot</code>); always check the suggestion.</li>
</ul>
<h3>Decimal separator</h3>
<p>On screen, numbers use a decimal comma in Turkish and a point in English; reading the numbers of your files does not depend on the interface language. The tool looks at the text cells and says whether a point or a comma was used, but leaves the decision to you: <b>Point (24.5)</b> or <b>Comma (24,5)</b>. Values such as "1.234", which could be either a decimal or a thousands separator, are reported as "ambiguous". Values that do not fit your choice count as unreadable and are reported with their row numbers; no value is skipped silently. Excel number cells are not affected by this setting.</p>
<h3>Sample data</h3>
<p>Every tool has a sample data button. The samples are simulated, not real measurements; they are there to try the tool and to show edge cases.</p>
<h3>Exports</h3>
<ul>
<li><b>Excel report</b>: numbers are written as number cells at full precision; the first sheet (Info) holds the tool, version, date and settings.</li>
<li><b>CSV</b>: in both languages the column separator is a comma and the decimal mark a point. Excel with a Turkish regional setting may open a CSV file in one column; use the Excel report then.</li>
<li><b>Charts</b> download as SVG.</li>
</ul>
<h3>Citing</h3>
<p>The <b>Cite</b> button at the top of every page gives, on a tool page, that tool and its version, and on the home page the whole platform, in APA, MLA, Chicago, Harvard, IEEE, Vancouver, BibTeX and RIS. The citations carry the concept DOI of the platform's Zenodo archive (10.5281/zenodo.24135603). The tool's version is shown in the page header. Cite the original sources of the methods as well; the tools list them.</p>
</section>
