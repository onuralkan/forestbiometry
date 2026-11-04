# onuralkan.com.tr — install guide

Plain PHP 7.4 or newer (8.x recommended). No database, no framework, no plugins to update.

## 1. Upload
1. Log in to your hosting panel (cPanel / Plesk / DirectAdmin) → **File Manager** → open `public_html`
   (Plesk: `httpdocs`).
2. Delete the host's placeholder `index.html` if there is one.
3. Upload `onuralkan-site.zip` and **Extract** it there. You should end up with
   `public_html/index.php`, `public_html/admin.php`, `public_html/assets/`, … — not
   `public_html/site/index.php`. If it extracted into a subfolder, move the contents up one level.
4. Hidden files matter: make sure `.htaccess`, `.user.ini`, `data/.htaccess`, `files/.htaccess`,
   `inc/.htaccess` came along (File Manager → Settings → "Show hidden files").

## 2. Permissions
`data/` and `files/` must be writable by PHP. On most shared hosts 755 already works.
If uploading gives "cannot write / check permissions", set those two folders to 755
(or 775 if your host insists). Never 777.

## 3. First login
Open **https://onuralkan.com.tr/admin.php**. The first visit asks you to choose a password
(10+ characters). Do this right after uploading — until you do, whoever opens that page first gets to choose it.

Then: **Profil** tab → check name, title, bio, add Scholar/ORCID links and a photo.

## 4. HTTPS
Done (4 Nov 2026). Güzel Hosting installed a free Let's Encrypt certificate (renews itself every 90 days),
and `.htaccess` now sends every http:// visit to https://. If the certificate ever fails to renew,
use cPanel → Let's Encrypt™ SSL → Issue, or ask Güzel Hosting support. A backup of the previous
`.htaccess` is on the server as `.htaccess.bak`.

## 5. Upload size
Default limit is 50 MB per file. If the panel says the limit is 2 MB or 8 MB, the host is ignoring
`.user.ini`: raise `upload_max_filesize` and `post_max_size` in **Select PHP Version → Options**
or **MultiPHP INI Editor** (cPanel), or **PHP Settings** (Plesk).

## Day-to-day
- `admin.php` → **Ders notları**: pick/type course name, title, drop file, **Yükle**.
  Typing an existing course name groups the file under it.
- **Yayınlar**: title, authors, venue, year, DOI; PDF is optional.
- Edit / Sil on every item. Deleting also deletes the file.
- 5 wrong passwords → login locked for 15 minutes.
- Forgot the password? Delete `data/auth.php` via File Manager, then open admin.php to set a new one.
  (Your content stays.)

## Two-step verification (2FA)
Admin → Profil → İki adımlı doğrulama → Kurulumu başlat. Scan the QR code with an authenticator app
(Google/Microsoft Authenticator, Aegis, 1Password), type the 6-digit code, then **save the 8 recovery codes**
(they are shown once). From then on, login asks for password + code. A recovery code can be typed into the
same code box; each works once. Codes cannot be reused, and the 5-attempt lockout covers codes too.

Lost phone **and** recovery codes: in cPanel File Manager delete `data/auth.php`, then immediately open
admin.php and set a new password (the setup screen is open to anyone until you do). Content is kept.
Since cPanel access can do this, turn on Two-Step Verification for cPanel itself as well.

## Supplements (Ekler)
Tool pages, listed in the front-page sidebar ("Ekler" box under "Son Dakika") and in the masthead ("Ekler").
To add a future tool, add one line to `paper_supplements()` in `inc/paper.php`; it then appears in the sidebar and in every tool's footer. They run
entirely in the visitor's browser: no data is sent to the server, nothing to configure.
- `mescere.php`: stand calculator (N, G, Dg, Lorey height, h100, volume per ha; Näslund heights for unmeasured trees; CSV export).
- `weibull.php`: diameter distribution laboratory: Weibull, gamma, normal, lognormal and Johnson SB, each with its own
  sliders, live stand, moments and a shape verdict. The fitting section compares eight estimators (Weibull moments/ML/percentile,
  gamma moments/ML, normal, lognormal, SB with ξ and λ fixed) by KS D, Reynolds error index and AIC; checked against scipy.
  Settings live in the URL, so a link like `weibull.php#d=sb&gm=0&dl=0.5&xi=6&lm=35` opens that distribution (handy in class);
  old `#a=..&b=..&g=..` Weibull links still work.
- `bulmaca.php`: daily crossword (same puzzle for everyone on the same day; "Rastgele bulmaca" for a new one).
  **To add words or clues**, edit `assets/bulmaca-kelimeler.js` (uppercase Turkish letters, no spaces, 3–13 letters).

## Backups
Everything lives in two folders: `data/` (texts) and `files/` (uploads). Download both now and then.

## Publishers
Only upload versions you're allowed to share (preprint / accepted manuscript / open-access PDF).
Otherwise just give the DOI.
