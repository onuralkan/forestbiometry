<section class="card guide-sec">
<?= $sec('katsayi-kutuphanesi', 'Coefficient Library') ?>
<p>Shows every coefficient set you entered or fitted in the Site Index, Growth Functions, Stem Taper, Biomass and Carbon, Volume Equations, Nonlinear Regression, Mixed-Effects Models, Systems of Equations, Stand Structure (CCF) and Tree Measurement (bark) tools in one place. Sets are stored in this browser only; the site ships no coefficients and this page adds none.</p>
<p><b>What it does not do:</b> move sets to another device or person by itself (a backup file does); compute with an equation (that is done on the tool's own page).</p>
<h3>Library</h3>
<ul>
<li>Number of sets per tool; groups of sets with the same coefficients and sets with problems are pointed out.</li>
<li><b>Download a backup (JSON)</b>: the whole library in one file (the same format as the JSON buttons on the tool pages, <code>model-coef-library/1</code>). Clearing the browser data deletes the sets; keep the backup.</li>
<li><b>Restore from a backup</b>: a <b>Restore preview</b> comes first: new, changed (overwritten), identical (skipped) and invalid (not loaded, with the reason) sets; sets whose coefficients are already in the library are noted. Nothing changes until you press <b>Apply</b>.</li>
<li>The list can be downloaded as Excel or CSV (coefficients as stored).</li>
</ul>
<h3>Sets and editing</h3>
<ul>
<li>Filter by tool and origin (entered/fitted) and search (form, species, region, component, source; case and Turkish letters ignored); <b>only sets with problems</b>.</li>
<li><b>Details</b>: id, coefficients, units, validity range, transformation, the tool's own fields (e.g. the age type in site index, the bark side in taper), source, fit summary, dates and problems.</li>
<li><b>Edit</b> opens the set in the <b>Set editor</b> below; the editor is the same as on the tool's own page (same checks, mandatory source). New sets can be entered there too. <b>Copy</b> makes a new set with the same coefficients (e.g. to change its source or scope for another region); <b>Delete</b> asks first and cannot be undone.</li>
</ul>
</section>
