<section class="card guide-sec">
<?= $sec('record-verifier', 'Record Verifier') ?>
<p>When a tool's results are downloaded as JSON, a shared <b>run record</b> (<code>run-record/1</code>) is written: the tool's id and version, the commit of the site's deployed source code, the time, the language, the settings, the results, the SHA-256 fingerprint of every input file and the record's seal. This page opens and checks such a record. The record and the files never leave the browser.</p>
<p><b>What it does not do:</b> it does not redo the calculation (that is done on the tool's own page with the same inputs and settings); the seal is not a signature: it shows changes but does not prevent forgery; data packages, the coefficient library and stand model files are not records and open in their own tools.</p>
<h3>Downloading a record (every tool)</h3>
<ul>
<li>A tool's JSON button (<b>Run record (JSON)</b> in tools that had no JSON button) downloads the record. The former JSON content is kept as it was; the shared fields are added.</li>
<li>With <b>Include the input data in the record</b> unchecked, the record holds only the fingerprint of each input; checked, the data itself goes in too and the record reproduces on its own. The choice holds for every JSON button of the page and is remembered in this browser. If you share the record, you share the data.</li>
<li>Fingerprint: SHA-256 of a file's bytes as read; of the UTF-8 bytes for a pasted table; of the canonical JSON form (RFC 8785) for an approved data package.</li>
</ul>
<h3>Verification</h3>
<ul>
<li><b>Choose a record (.json)</b>: the seal is checked (has the record changed since download), the tool, version, tool ids and commit are shown; a different version of the tool on the site is reported. The commit link leads to the source code that produced the record.</li>
<li>The <b>Inputs</b> table shows each input's role, size, fingerprint and reading options (encoding, delimiter, header row, worksheet). If the record holds the data, it is checked against its fingerprint and can be downloaded.</li>
<li><b>Check the files you have</b>: choose your original data files; each one is compared with the inputs of the record. A single different byte breaks the match (e.g. a CSV opened and saved again in Excel).</li>
<li>JSON files downloaded before DI-07 open too: their tool, version and time are read; they have no seal or fingerprints.</li>
</ul>
</section>
