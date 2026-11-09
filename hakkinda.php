<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
$A = SITE_AUTHOR;
site_top([
    'title' => $tr ? 'Hakkında' : 'About',
    'desc'  => $tr ? 'forestbiometry.online platformunun yazarı ve sorumlusu.' : 'Author and responsible person of the forestbiometry.online platform.',
]);
?>
  <section class="card about" aria-labelledby="h-author">
    <h2 id="h-author" class="b-h2"><?= $tr ? 'Yazar ve sorumlu' : 'Author and responsible person' ?></h2>
    <dl class="kv">
      <dt><?= $tr ? 'Ad' : 'Name' ?></dt><dd><?= h($A['name']) ?></dd>
      <?php if ($A['email'] !== ''): ?>
      <dt><?= $tr ? 'E-posta' : 'Email' ?></dt><dd><a href="mailto:<?= h($A['email']) ?>"><?= h($A['email']) ?></a></dd>
      <?php endif; ?>
      <?php if ($A['orcid'] !== ''): ?>
      <dt>ORCID</dt><dd><a href="https://orcid.org/<?= h($A['orcid']) ?>" rel="me">https://orcid.org/<?= h($A['orcid']) ?></a></dd>
      <?php endif; ?>
    </dl>
  </section>
  <section class="card about" aria-labelledby="h-data">
    <h2 id="h-data" class="b-h2"><?= $tr ? 'Verileriniz' : 'Your data' ?></h2>
    <p><?= $tr ? 'Araçlar tarayıcınızda çalışır. Yüklediğiniz tablolar sunucuya gönderilmez; oturumlar yalnızca bu tarayıcının yerel deposunda (IndexedDB) tutulur ve araçlardaki silme düğmeleriyle kaldırılabilir. Sitede kullanıcı hesabı, veritabanı ve izleme kodu yoktur; yalnızca dil ve tema tercihiniz tarayıcınızda saklanır.'
                   : 'The tools run in your browser. Tables you load are not sent to the server; sessions are kept only in this browser\'s local storage (IndexedDB) and can be removed with the delete buttons in the tools. The site has no user accounts, no database and no tracking code; only your language and theme choice are stored in your browser.' ?></p>
  </section>
<?php site_bottom();
