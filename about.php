<?php
require __DIR__ . '/inc/site.php';
$A = SITE_AUTHOR;
site_top([
    'title' => 'About',
    'desc'  => 'Developer of the forestbiometry.online platform and how to cite it.',
]);
?>
  <section class="card about" aria-labelledby="h-author">
    <h2 id="h-author" class="b-h2"><?= 'Developer' ?></h2>
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
  <section class="card about" aria-labelledby="h-data">
    <h2 id="h-data" class="b-h2"><?= 'Your data' ?></h2>
    <p><?= 'The tools run in your browser. Tables you load are not sent to the server; sessions are kept only in this browser\'s local storage (IndexedDB) and can be removed with the delete buttons in the tools. The site has no tracking code. Optional accounts (sign in with ORCID) can ask for an AI interpretation of a result and keep results without input data on the server; raw data are never sent (see the <a href="privacy.php">privacy notice</a>). Only your theme and sidebar choices are stored in your browser.' ?></p>
  </section>
<?php site_bottom();
