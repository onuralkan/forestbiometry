<?php
// Privacy notice (21 Nov 2026): what the site keeps, in the browser and, for the AI interpretation service, on the server.
require __DIR__ . '/inc/site.php';
site_top(['title' => 'Privacy', 'desc' => 'What Forest Biometry keeps in your browser and on its server.']);
?>
  <section class="card about" aria-labelledby="p-tools">
    <h2 id="p-tools" class="b-h2">The tools</h2>
    <p>Every calculation runs in your browser. The tables you load, the sessions of the tools, your data packages and coefficient sets are kept only in this browser (IndexedDB and localStorage) and are not sent to the server. The red "Delete all data and reset the site" button on every tool page removes them.</p>
  </section>
  <section class="card about" aria-labelledby="p-ai">
    <h2 id="p-ai" class="b-h2">The AI interpretation service</h2>
    <p>Some tools can write an interpretation of their results with Anthropic's Claude model. This needs an account (sign in with ORCID) and happens only when you press the interpretation button.</p>
    <ul>
      <li><b>What is sent:</b> the summary of that one result (the tool's settings and result tables, the same content as its JSON run record without the input data). The tool's rows are not sent.</li>
      <li><b>Where it goes:</b> to this site's server, which forwards it to Anthropic's API and returns the answer to your browser. The server does not store the summary or the answer. Anthropic processes it under its commercial terms and privacy policy (<a href="https://www.anthropic.com/legal/privacy">anthropic.com/legal/privacy</a>).</li>
      <li><b>What the server keeps about you:</b> your ORCID iD and the name ORCID returns, the state of your account (waiting, approved, blocked), the date you signed up and the number of interpretations per month. A session cookie keeps you signed in until you close the browser or sign out.</li>
      <li><b>Deleting:</b> "Delete my account" on the <a href="hesap.php">Account page</a> removes these records at once. To ask anything about them, write to the author (see <a href="hakkinda.php">About</a>).</li>
    </ul>
  </section>
<?php site_bottom();
