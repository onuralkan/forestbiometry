# forestbiometry.online

**Ormancılık Biyometrisi Araçları / Forest Biometrics Tools**: browser-based tools for forest inventory and biometrics data.
Author and responsible person: Onur Alkan. Plain PHP 7.4 or newer (8.x recommended), no database, no server-side user data.

## How it gets online
Every push to `main` runs the numerical tests in GitHub Actions and, if they pass, uploads the changed files to the
forestbiometry.online document root through the cPanel API over HTTPS (`.github/workflows/deploy.yml`,
`.github/deploy-cpanel.sh`). One-time setup:
1. cPanel → **Security → Manage API Tokens** → create a token (e.g. `github_deploy`).
2. GitHub → repository → **Settings → Secrets and variables → Actions** → secret `CPANEL_TOKEN` = that token.
3. Fill in `CP_HOST`, `CP_USER` and `DIR` at the top of `.github/workflows/deploy.yml`. While any is empty, uploads are skipped.

The upload refuses to write into a folder that is neither this site (`inc/site.php`) nor an empty cPanel document root,
never deletes anything on the server, and keeps the server's cPanel PHP-version block in `.htaccess`.

Fallback: `sh scripts/build-zip.sh` → `../forestbiometry.zip` → cPanel **File Manager** → `public_html` → Upload → Extract
(show hidden files; `.htaccess` and `inc/.htaccess` must come along).

## HTTPS
cPanel → **SSL/TLS Status** (AutoSSL) or **Let's Encrypt SSL** must cover `forestbiometry.online` and `www.forestbiometry.online`;
`.htaccess` then sends every http:// visit to https://.

## Author details
`SITE_AUTHOR` in `inc/site.php` (name, email, ORCID). Empty fields are not shown.

## Development
See `CLAUDE.md`, `docs/PROJECT.md`, `docs/METHODS.md`, `docs/PROGRESS.md` and `tests/README.md`.
