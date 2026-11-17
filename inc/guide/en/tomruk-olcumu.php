<section class="card guide-sec">
<?= $sec('tomruk-olcumu', 'Log Scaling') ?>
<p>Gives log volume in two ways: by the board-foot log rules of North American trade (Scribner, Doyle, International ⅛ and ¼ inch; Kershaw et al. 2016 §7.3) and in m³ from the end and middle diameters (Smalian, Huber, Newton; Table 6.1). Measurements are entered in cm and m; they are converted to inches and feet for the board-foot rules, whose result is labelled in board feet.</p>
<p><b>What it does not do:</b> defect deductions (net scale), the Spaulding, Maine and combination rules, national metric log standards.</p>
<h3>Logs</h3>
<ul>
<li><b>One log</b> or a <b>Log table</b>: small-end diameter (inside bark, cm) and length (m) are required; the large-end and middle diameters are optional (for the cubic volume and splitting long logs). The simulated table is for trying out only.</li>
</ul>
<h3>Rules and results</h3>
<ul>
<li>Rules: Scribner (7.3), Doyle (7.5), International ⅛ inch (7.7–7.10; 8, 12, 16 and 20 ft only) and International ¼ inch (Grosenbaugh; any length). Several can be chosen together.</li>
<li><b>Scaling conventions</b> (§7.4.1): the diameter is rounded to the nearest inch (can be switched off); the scaling length is rounded down to whole or even feet; a log longer than an optional maximum scaling length is split, the longer segment at the butt when it does not divide evenly, and the diameter at the point of separation is taken as linear between the small and large ends. The International rules can be rounded to 5 board feet.</li>
<li>Results: per log the scaling length and diameter, the board feet of each rule or why it was not computed, Smalian, Huber and Newton m³; totals. Downloads: Excel (Info, Logs, Segments), CSV, JSON run record.</li>
</ul>
</section>
