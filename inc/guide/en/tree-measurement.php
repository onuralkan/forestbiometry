<section class="card guide-sec">
<?= $sec('tree-measurement', 'Tree Measurement') ?>
<p>Computes height, diameter and basal area, bark, crown, form factors, age and increment from single-tree measurements. The formulas come from mensuration books: Hamilton (1975) <i>Forest Mensuration Handbook</i>, Graves (1906) <i>Forest Mensuration</i> van Laar and Akça (2007) <i>Forest Mensuration</i> and Kershaw et al. (2016) <i>Forest Mensuration</i>. There are six tabs; results update as the fields change.</p>
<p><b>What it does not do:</b> the stem length of a leaning tree (no formula in the source); bark models along the stem; crown-ratio regression models and the crown competition factor (CCF; it is computed in the Stand Structure tool); stem analysis (sections along the whole stem); species form-factor tables or form-quotient constants (the site ships no values).</p>
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
<li>Downloads: Excel (Info, Height, Stem, Tree list, Bark, Crown, Form, Age and increment, Core) and a JSON run record.</li>
</ul>
<h3>Bark</h3>
<ul>
<li><b>Bark at one point</b>: the over-bark diameter and bark gauge readings on several sides (single, mm; averaged), girths over and under bark at the same place (peripheral bark thickness (c<sub>ob</sub> − c<sub>ub</sub>)/2π), or the under-bark diameter and bark readings. Result: single and double bark thickness, under-bark diameter (over-bark diameter − double bark), both basal areas, the bark area and its share. With a log length the diameters are taken as the log's mid diameter, and the bark volume is the difference of the over- and under-bark volumes (Hamilton).</li>
<li><b>Bark factor from sample trees</b>: over- and under-bark diameters of trees from the same stand (typed or with <b>Paste two columns</b>). k = Σd<sub>ub</sub>/Σd<sub>ob</sub> (Meyer; ratio of means, van Laar and Akça), the inverse 1/k and, with at least three trees, the least-squares line. Rows with the under-bark diameter larger than the over-bark one are reported by number and left out.</li>
<li><b>Compute under-bark diameters</b>: a typed k, k from the sample trees, the line from the sample trees, or a <b>coefficient set</b>. Forms of a set: d<sub>ub</sub> = k·D, d<sub>ub</sub> = a + b·D, single or double bark thickness (mm) = a + b·D and ln(bark, mm) = a + b·ln D (with a back-transformation correction). D is in cm; if your source uses other units, convert the coefficients before entering them. The sets also appear in the Coefficient Library. The method is applied to one diameter and to the tree list loaded in the "Diameter and basal area" tab: total basal area over and under bark and the bark share; trees that cannot be computed are reported by row.</li>
<li>The site contains no bark coefficients or bark tables: k and the equations come from your sample trees or from a source whose citation you enter.</li>
</ul>
<h3>Crown</h3>
<ul>
<li><b>Crown projection</b>: crown radii from the stem in several directions, or two crown diameters (the widest and one at right angles), in m. From radii: mean radius, crown width (2 × mean radius) and the area of the circle with the quadratic mean radius; with radii at random or systematic azimuths this area is unbiased whatever the crown shape (Gregoire and Valentine; Kershaw et al.). At least 4 directions are recommended; 4–8 radii for the stand, 8–16 for single trees (van Laar and Akça). From two diameters: the circle of the mean diameter and the ellipse with the two diameters as axes.</li>
<li><b>Crown length and crown ratio</b>: tree height − height of the crown base; the ratio as a per cent of the height. With the dbh, the ratio of crown diameter to dbh. The definition of the crown base varies between studies; record the one you use.</li>
<li><b>Crown surface and volume</b>: from crown width and length, the outer surface (base excluded) and volume of a cone, a paraboloid and a cylinder (Hamilton's geometric formulae; the paraboloid formula printed in van Laar and Akça lacks a term and is not used).</li>
<li><b>Crown cover</b>: crown widths of the trees on a plot and the plot area; total crown projection area / plot area (Kershaw et al.). It can exceed 1 where crowns overlap; it differs from canopy cover, the share of ground covered.</li>
</ul>
<h3>Age and increment</h3>
<ul>
<li><b>Tree age</b>: rings counted + the years the tree needed to reach that height (enter them from your own data). Lorey's <b>economic age</b> (rings outside the core of suppression + the average age of such cores) and, for trees without annual rings, diameter / mean annual diameter growth.</li>
<li><b>Increment core</b>: ring widths on a core taken at breast height, bark to pith, in mm. With the diameter now, the double bark thickness if it is outside bark and the years to reach 1.3 m: the inside-bark diameter and the age of every past year (the table shows every tenth year, all years are in Excel); for a chosen n years, the periodic annual diameter growth and Pressler's growth percent. If the core does not reach the pith, the age is a lower bound; widths longer than the radius are warned.</li>
<li><b>Mean age of a stand</b>: diameter groups; arithmetic, weighted by number, by basal area or by volume (Smalian). <b>Growth percent</b>: from the value now and n years ago with three principals (past, present, mean/Pressler); mean annual growth.</li>
</ul>
</section>
