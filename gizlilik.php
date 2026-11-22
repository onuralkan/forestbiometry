<?php
// Privacy notice (21 Nov 2026; 22 Nov 2026 user decision: raw data never on the server, saved results and interpretations
// may be kept for their owner): what the site keeps, in the browser and, for accounts, on the server.
require __DIR__ . '/inc/site.php';
site_top(['title' => 'Privacy', 'desc' => 'What Forest Biometry keeps in your browser and on its server.']);
?>
  <section class="card about" aria-labelledby="p-tools">
    <h2 id="p-tools" class="b-h2">The tools</h2>
    <p>Every calculation runs in your browser. Your raw data, that is the tables and files you load, and the sessions of the tools, your data packages and coefficient sets are kept only in this browser (IndexedDB and localStorage) and are never sent to the server. The red "Delete all data and reset the site" button on every tool page removes them. Without an account, nothing of your work reaches the server.</p>
  </section>
  <section class="card about" aria-labelledby="p-ai">
    <h2 id="p-ai" class="b-h2">Accounts: AI interpretations and saved results</h2>
    <p>With an account (sign in with ORCID; accounts are approved by the site's author) you can ask for an AI interpretation of a result with Anthropic's Claude model and keep analysis results on this site. Both happen only when you press the button.</p>
    <ul>
      <li><b>Never sent or kept:</b> raw data. The server refuses a result that carries input data (a run record made with "Include the input data"); saved results list each input only by its SHA-256 fingerprint.</li>
      <li><b>Interpretations:</b> the summary of one result (the tool's settings and result tables, the same content as its JSON run record without the input data) goes to this site's server, which forwards it to Anthropic's API. The answer is shown to you and kept in your account with the summary it was written from (Account → Interpretations). Anthropic processes the request under its commercial terms and privacy policy (<a href="https://www.anthropic.com/legal/privacy">anthropic.com/legal/privacy</a>).</li>
      <li><b>Saved results:</b> "Save to my account" next to a tool's "Run record (JSON)" button keeps that run record, without input data, in your account (Account → Saved results), with a title and note you can edit. Limits: 200 results and 20 MB per account, 2 MB per result.</li>
      <li><b>What else the server keeps:</b> your ORCID iD and the name ORCID returns, the state of your account (waiting, approved, blocked), the dates you signed up and were last signed in, and the number of interpretations per month. A session cookie keeps you signed in until you close the browser or sign out.</li>
      <li><b>Who can read it:</b> only you, through your account. The data are stored unencrypted in the site's database outside the web folder; the site's author, as its administrator, has technical access to that database and its backups.</li>
      <li><b>How long:</b> until you delete them. An account not signed in for 24 months is deleted with everything it keeps. Nightly backups of the database are kept for 30 days, so a deleted item disappears from them within 30 days.</li>
      <li><b>Your control:</b> on the <a href="hesap.php">Account page</a> you can download everything the account keeps as one JSON file, delete single items, delete all saved results and interpretations, or delete the account, which removes its records at once. To ask anything about them, write to the author (see <a href="hakkinda.php">About</a>).</li>
    </ul>
  </section>
<?php site_bottom();
