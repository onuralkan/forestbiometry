<section class="card guide-sec">
<?= $sec('agac-olcumu', 'Tree Measurement') ?>
<p>Computes height, diameter and basal area, and form factors from single-tree measurements. The formulas come from mensuration books: Hamilton (1975) <i>Forest Mensuration Handbook</i>, Graves (1906) <i>Forest Mensuration</i> and van Laar and Akça (2007) <i>Forest Mensuration</i>. There are four tabs; results update as the fields change.</p>
<p><b>What it does not do:</b> the stem length of a leaning tree (no formula in the source); bark and crown (sources awaited); stem analysis (sections along the whole stem); species form-factor tables or form-quotient constants (the site ships no values).</p>
<h3>Height</h3>
<ul>
<li><b>Tangent</b>: horizontal distance and the angles to the top and the base, in degrees or percent. Angles are measured from the horizontal; if the base is below the eye, enter its angle with a minus sign. If the distance was measured along sloping ground, tick the box and enter the ground slope: it is made horizontal.</li>
<li><b>Rangefinder</b>: distance along the line of sight from the eye to the base (or to a point of the stem); the horizontal distance follows from it and the angle to that point (Hamilton Fig. 19).</li>
<li><b>Shadow</b> and <b>two-pole</b> methods (Graves): similar triangles.</li>
<li>With several rows you get the mean height and the range of the readings (Hamilton: take two or three readings and average them). A distance shorter than the height or a very steep sight to the top is noted.</li>
</ul>
<h3>Diameter, basal area and form factor</h3>
<ul>
<li><b>One stem</b>: one or more readings, diameter or girth, in cm, mm, m or inches. Several diameters are averaged, or two diameters are taken as the axes of an ellipse. Rounding: none, to the millimetre or down to the whole centimetre (Hamilton). The rules for measuring diameter at breast height are listed in the tab.</li>
<li><b>Tree list</b>: a table or pasted cells; a diameter or girth column, an optional number-of-trees column. Number of trees, total and mean basal area, arithmetic mean diameter and the diameter of the tree of mean basal area (Graves).</li>
<li><b>Form factor</b> F = V/(B·H): breast height, absolute, absolute above 1.3 m and normal; form height F·H. <b>Form exponent</b>: r from two diameters and their distances from the tip, the solid it describes, 1/(r + 1) and, with the height, the breast-height form factor. <b>Form quotient</b> q = d/D; with a species constant c, F = q − c.</li>
<li>Downloads: Excel (Info, Height, Stem, Tree list, Form, Age and increment, Core) and a JSON run record.</li>
</ul>
<h3>Age and increment</h3>
<ul>
<li><b>Tree age</b>: rings counted + the years the tree needed to reach that height (enter them from your own data). Lorey's <b>economic age</b> (rings outside the core of suppression + the average age of such cores) and, for trees without annual rings, diameter / mean annual diameter growth.</li>
<li><b>Increment core</b>: ring widths on a core taken at breast height, bark to pith, in mm. With the diameter now, the double bark thickness if it is outside bark and the years to reach 1.3 m: the inside-bark diameter and the age of every past year (the table shows every tenth year, all years are in Excel); for a chosen n years, the periodic annual diameter growth and Pressler's growth percent. If the core does not reach the pith, the age is a lower bound; widths longer than the radius are warned.</li>
<li><b>Mean age of a stand</b>: diameter groups; arithmetic, weighted by number, by basal area or by volume (Smalian). <b>Growth percent</b>: from the value now and n years ago with three principals (past, present, mean/Pressler); mean annual growth.</li>
</ul>
</section>
