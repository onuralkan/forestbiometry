<?php
require __DIR__ . '/inc/site.php';
$A = SITE_AUTHOR;
site_top([
    'title' => 'About',
    'desc'  => 'Author and responsible person of the forestbiometry.online platform.',
]);
?>
  <section class="card about" aria-labelledby="h-author">
    <h2 id="h-author" class="b-h2"><?= 'Author and responsible person' ?></h2>
    <dl class="kv">
      <dt><?= 'Name' ?></dt><dd><?= h($A['name']) ?></dd>
      <?php if ($A['email'] !== ''): ?>
      <dt><?= 'Email' ?></dt><dd><a href="mailto:<?= h($A['email']) ?>"><?= h($A['email']) ?></a></dd>
      <?php endif; ?>
      <?php if ($A['orcid'] !== ''): ?>
      <dt>ORCID</dt><dd><a href="https://orcid.org/<?= h($A['orcid']) ?>" rel="me">https://orcid.org/<?= h($A['orcid']) ?></a></dd>
      <?php endif; ?>
    </dl>
  </section>
  <section class="card about" aria-labelledby="h-cite">
    <h2 id="h-cite" class="b-h2"><?= 'How to cite' ?></h2>
    <p><?= 'If you used this platform in your work, please cite it. For the whole platform (APA 7):' ?></p>
    <p class="cite-inline" id="cite-inline"></p>
    <p><?= 'If you used a single tool, the "Cite" button on the tool\'s page gives that tool and its version. Other formats (MLA, Chicago, Harvard, IEEE, Vancouver, BibTeX, RIS) are there too.' ?></p>
    <p class="b-actions"><button type="button" class="btn" data-cite-open><?= site_icon('cite') ?><?= 'All citation formats' ?></button></p>
  </section>
  <section class="card about" aria-labelledby="h-tests">
    <h2 id="h-tests" class="b-h2"><?= 'How the calculations are tested' ?></h2>
    <p><?= 'Every scientific calculation is tested by automatic tests that compare it with an independent reference: output of R packages, worked examples from the sources, or code written apart from the calculation. The numeric and browser tests run before every release; a change that fails them is not uploaded.' ?></p>
    <p><?= 'A passing test shows that the tool gives the same result as the reference; it does not show that the method suits your data and purpose. Each method\'s assumptions are in the tool\'s guide section; its formulas and the status of its source (checked in the primary source, checked against an R package\'s documentation, taken from a secondary source, reference confirmed in a secondary source, or not yet verified) are in the methods document.' ?></p>
    <p class="b-actions"><a class="btn ghost" href="https://github.com/onuralkan/forestbiometry/blob/main/docs/METHODS.md"><?= 'Methods document (METHODS.md, in Turkish)' ?></a>
      <a class="btn ghost" href="https://github.com/onuralkan/forestbiometry/tree/main/tests"><?= 'Tests and references' ?></a>
      <a class="btn ghost" href="kaynakca.php"><?= 'References' ?></a></p>
  </section>
  <section class="card about" aria-labelledby="h-data">
    <h2 id="h-data" class="b-h2"><?= 'Your data' ?></h2>
    <p><?= 'The tools run in your browser. Tables you load are not sent to the server; sessions are kept only in this browser\'s local storage (IndexedDB) and can be removed with the delete buttons in the tools. The site has no user accounts, no database and no tracking code; only your language and theme choice are stored in your browser.' ?></p>
  </section>
<?php site_bottom();
