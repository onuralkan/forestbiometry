<section class="card guide-sec">
<?= $sec('volume-equations', 'Volume Equations') ?>
<p>Fits tree volume equations to your trees of known volume (diameter at breast height D, height H, volume V). The forms are the standard and local volume equations of Kershaw et al. (2016) §6.2; the site ships no coefficients.</p>
<p><b>What it does not do:</b> equations with a form variable, nonlinear fitting (V = b1·D^b2·H^b3 is fitted in its logarithmic form), mixed-effects models, printing volume tables.</p>
<h3>Data</h3>
<ul>
<li><b>Tree table</b>: columns D (cm), H (m; not needed by the local equations), V (m³) and the bark side of the volume. The simulated table is for trying out only.</li>
<li>Or <b>Use the sent volumes</b>: if you linked the approved data in the Stem Section Volume tool and used "Send the volumes", the trees of the active package (D, H) are joined with the sent over- or under-bark volumes.</li>
</ul>
<h3>Equations and results</h3>
<ul>
<li>Forms: <b>constant form factor</b> V = b1·D²H, <b>combined variable</b> V = b0 + b1·D²H, <b>logarithmic</b> ln V = ln b1 + b2·ln D + b3·ln H, <b>local</b> V = b0 + b1·D² and <b>local logarithmic</b> ln V = ln b0 + b1·ln D. Choose several to compare them.</li>
<li>Optional <b>weight</b> for the forms on the volume scale: error variance proportional to X^k (X = D²H or D²); if k is left empty it is estimated from the residuals (Parresol 1999). For logarithmic forms choose the back-transformation correction: none or Baskerville exp(s²/2).</li>
<li>Results: a comparison table (RMSE, bias, MAE, R²; the Model Evaluation tool's definitions, on the volume scale), coefficients and standard errors of each form, observed–predicted and residual charts. Trees with a missing value are left out with their row numbers.</li>
<li><b>Save the set</b>: the chosen form is saved to the coefficient library with a source description (validity range: the sample's D and H range). <b>Send and open Model Evaluation</b>: the observed and predicted volumes go to the Model Evaluation tool with the columns chosen.</li>
<li>Downloads: Excel (Info, Comparison, Coefficients, Trees), trees and predictions as CSV, JSON run record. <b>R code (.R)</b>: a script that redoes the run in base R (<code>lm</code>): the same trees for each form, the same weights (k from the unweighted residuals when estimated) and back-transformation correction, the same measures on the volume scale. The data are not embedded; you change the file name at the top of the script to the path of your file (Stem Section Volume results come along as a CSV file). The site's tests check in R at every release that this code gives the tool's numbers.</li>
</ul>
</section>
