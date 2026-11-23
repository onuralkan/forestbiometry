# Administration panel: plan (22 Nov 2026)

User request (22 Nov 2026): a comprehensive administration panel to manage ordinary users: approval/rejection, blocking,
daily and monthly interpretation quotas, and whatever else such a panel needs. Builds on the account service
(`inc/account.php`, PROJECT.md §3). Page: `administration.php` (administrator only; `admin.php` stays unused because the old
site's `admin.php` must keep answering 404).

## Fixed principles
- **Privacy stays as promised** (`privacy.php`): the administrator sees counts, sizes, dates and states, never the
  content of a user's saved results or interpretations. The panel has no "view as user".
- Every administrator action asks for confirmation where it destroys something and is written to an **audit log**
  (time, action, account, before → after, reason).
- Settings changed in the panel are stored in the database and override the private `config.php` defaults; secrets
  (API key, ORCID client secret) stay only in `config.php`.
- Server-rendered forms with the form token (CSRF), as on the Account page; works without JavaScript.

## Stage 1: account management and limits — done 22 Nov 2026 (`administration.php`, tests/account/e2e.mjs §5b)
1. **Overview**: accounts by state, waiting accounts with quick approve / reject, interpretations today and this month,
   storage in use, newest backup and its age.
2. **Account list**: search (name, ORCID), filter by state, sort (sign-up, last seen, use); links to the account page.
3. **Account page**: state with a reason shown to the user (approved, waiting, rejected, blocked; block until a date or
   indefinitely, lifted automatically when the date passes); personal monthly and daily quota (or the site default);
   extra interpretations for the current month; reset this month's / today's use; a private administrator note;
   use by month and by day (last 30 days); storage (counts and sizes only); delete the account with everything it keeps
   (typing the ORCID iD to confirm); the audit entries of the account.
4. **Site settings**: default monthly quota, default daily quota (0 = no daily limit), per-minute limit; sign-up mode
   (approval required / automatic approval / closed to new accounts); interpretation service on or off with a message
   to users; an announcement shown on the Account page and in the interpretation card.
5. **Audit log** page with CSV download.
6. Users see what concerns them: daily and monthly use and limits, the reason of a block or rejection, the end of a
   temporary block, the announcement; the service-off message in the card.
7. Privacy notice updated (what the server now also keeps: daily use counts, reasons, administrator notes, audit log).

## Stage 2: monitoring and cost control — done 22 Nov 2026 (Usage view, caps and prices in Settings; tests §5c)
- Each interpretation call logged (time, account, outcome: ok / upstream error / refusal / rate / quota, input and
  output tokens from the API's usage field, duration); failures are visible in the panel.
- Token totals per day and month; an estimated cost only from prices the administrator enters (none built in).
- **Site-wide monthly cap** of interpretations (or tokens): the service stops for everyone when reached.
- Top users this month; accounts approaching the 24-month deletion; manual run of the retention rule.

## Stage 3: convenience — done 22 Nov 2026 (user decision, 22 Nov 2026: no additional administrators; the single administrator of `config.php`)
- Bulk actions on the list (approve / reject selected).
- Added at the user's request (22 Nov 2026): an on/off switch of the interpretation per tool and for the whole service
  on the Overview, for example when the API balance runs out.
- CSV export of accounts and of use.
- Additional administrators (roles in the database) — only if the user wants it; for now the single administrator of
  `config.php`.

## Open decisions for the user
- Default daily quota (stage 1 ships with 0 = none, monthly 30 as before).
- Whether additional administrators are wanted (stage 3).
- Prices per million tokens for the cost estimate (stage 2; entered in the panel).
