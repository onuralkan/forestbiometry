<section class="card guide-sec">
<?= $sec('veri-denetcisi', 'Forest Data Checker') ?>
<p>Checks your tree and plot tables: format errors, missing and duplicate records, conflicting plot sizes and suspect diameter–height values. Nothing is deleted or changed automatically; every fix is written to the log with its reason. The data you approve are read by other tools.</p>
<p><b>What it does not do:</b> no scientific calculation (it reads, converts and screens); it never switches a unit because of how large the values are; it does not guess thousands separators. The check limits are adjustable screening thresholds, not values from the literature.</p>
<h3>1. Data</h3>
<p>The <b>tree / measurement table</b> is required: one row is one measurement of one tree in one period. The <b>plot table</b> is optional: plot sizes and empty plots.</p>
<h3>2. Columns and units</h3>
<ul>
<li>Required in the tree table: plot ID, tree ID, species, diameter at breast height. Optional: height, period, stem ID, plot size, stratum, status, X and Y coordinates, tree age (years; the Site Index tool takes the age from here when it uses approved data; the age type is chosen there). The plot size must be in either the tree table or the plot table.</li>
<li>Suggestions come only from exact header matches (e.g. <code>alan_no</code>, <code>agac_no</code>, <code>tur</code>, <code>cap_cm</code>); suffixes such as <code>_cm</code> or <code>_m2</code> also suggest the unit.</li>
<li>Units: diameter cm/mm/m, height m/dm/cm, area m²/ha. The minimum, median and maximum after conversion are shown; check the unit against them.</li>
</ul>
<h3>3. Check settings</h3>
<p>Limits for diameter (default 1–200 cm), height (2–60 m) and slenderness h/d (15–200); "Restore defaults" and "Run checks".</p>
<h3>4. Results</h3>
<ul>
<li><b>Errors</b> (block approval): unreadable number, empty required field, zero or negative value, duplicate record (the same tree in different periods is not a duplicate), plot missing from the plot table, different sizes or strata for one plot, plot without a size.</li>
<li><b>Warnings</b>: leading or trailing space, the same species code written differently, species changing between periods, diameter, height or slenderness outside the limits, a tree shorter than 1.3 m with a measured diameter.</li>
<li><b>Notes</b>: a plot without trees (it stays in the data with 0 trees per hectare).</li>
</ul>
<p>On the <b>Issues</b> tab each row offers: Fix, apply the suggestion, exclude the record (it is not deleted), include again, accept a warning, choose a value in a conflict, enter a plot size. Every action asks for a reason and is written to the <b>Change log</b>; raw values are kept. On the <b>Data</b> tab you can also fix a cell by clicking it.</p>
<p><b>Approve and export</b>: "Approve and save" is enabled once no error remains; open warnings are saved with the data. The approved data are kept in this browser, added to the list of the <b>Inventory Data Manager</b> and made the active package; the tools that read approved data use the active package. If the data change after approval you are asked to approve again. "Reset session" does not delete the approved data.</p>
<h3>Downloads</h3>
<p>Issue table and change log (CSV); after approval the approved data (CSV), the data package (JSON) and the full report (Excel). When a CSV file is opened in Excel, leading zeros (e.g. 001) may be lost.</p>
<h3>Common situations</h3>
<ul>
<li>If Turkish letters are broken, the file is most likely windows-1254; change the "Text encoding".</li>
<li>"001" and "1" are different plots; the tool does not merge them.</li>
<li>You cannot continue while a required field is not mapped or one column is mapped to two fields.</li>
</ul>
</section>
