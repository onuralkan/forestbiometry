<?php
// Template of the private settings of the AI interpretation service (inc/account.php). Copy it on the server to
//   <parent of the document root>/forestbiometry-private/config.php
// (outside the web root; the deploy script never touches it) and fill it in. Never commit the filled-in file.
// The folder must be writable by PHP: the account database fb.sqlite is created next to this file.
return [
    // Anthropic API key (console.anthropic.com → API keys). Set a monthly spend limit on its workspace in the Console:
    // that limit is the last safeguard of the balance.
    'anthropic_key'     => 'sk-ant-...',
    'anthropic_model'   => 'claude-opus-5-5',
    // ORCID public API client (orcid.org → Developer tools). Redirect URI: https://forestbiometry.online/auth/orcid.php
    'orcid_client_id'     => 'APP-...',
    'orcid_client_secret' => '...',
    'orcid_base'          => 'https://orcid.org',        // https://sandbox.orcid.org while testing with a sandbox client
    // The administrator's ORCID iD: approved at once, sees the approval list on the Account page.
    'admin_orcid'       => '0000-0001-5798-3421',
    // Defaults of the limits; the administration panel (administration.php → Settings) overrides them in the database.
    'monthly_quota'     => 30,      // interpretations per account per calendar month (UTC)
    'daily_quota'       => 0,       // per account per day (UTC); 0 = no daily limit
    'per_minute'        => 3,       // at most this many requests per account per minute
    'max_request_bytes' => 60000,   // largest result summary accepted
    'max_output_tokens' => 3000,
    // Elsevier API key (dev.elsevier.com) for the literature box of the tool pages, shown to the administrator only
    // (inc/literature.php). Empty: no box. The institution token is optional (Scopus access from outside the campus).
    'elsevier_key'        => '',
    'elsevier_insttoken'  => '',
    // Test servers only: never true on the live site.
    'anthropic_mock'    => false,
    'orcid_mock'        => false,
    'elsevier_mock'     => false,
];
