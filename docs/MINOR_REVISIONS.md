# Forest Biometry | Minor Revision Pool

> **Purpose:** To collect, in a single file, the small improvement and bug-fix requests noticed while using the site. This document will be given to Claude at intervals. The items here are not considered applied or approved unless separately assigned.

**Last updated:** 2026-11-20  
**Scope:** Interface, user experience, text, usability and small functional fixes.  
**Status key:** `Pending` · `Under review` · `Applied` · `Verified` · `Deferred`  
**Priority:** `Low` · `Medium` · `High`

## Revision list

| ID | Area / page | Short request | Priority | Status |
|---|---|---|---|---|
| MR-001 | Dashboard | Add navigation buttons for moving between charts | Medium | Verified |
| MR-002 | Dashboard | Rename the page to Data Visualization | Low | Verified |
| MR-003 | Home page / tool sessions | Add a general button that resets all tool sessions | Medium | Verified |

## Revision details

### MR-001 | Dashboard: Navigation between charts

- **Area / page:** Dashboard
- **Type:** Usability / interface improvement
- **Priority:** Medium
- **Status:** Verified (user approval, 20 Nov 2026; applied 20 Nov 2026; navigation model user choice: sticky jump bar)
- **Current state / observation:** Navigation buttons are wanted to make it easier to move between the charts (*plots*) on the Dashboard page. The current navigation behaviour has not yet been defined in detail.
- **Requested revision:** Add suitable navigation buttons so that the user can move more easily between the charts on the dashboard.
- **Expected behaviour / acceptance criteria:**
  - The user should be able to reach the relevant charts easily with navigation buttons.
  - The function and direction of the buttons should be clear.
  - The existing charts, calculations and other dashboard functions must not break.
  - It should be usable in desktop and mobile views.
- **Implementation note:** The position and names of the buttons and the navigation model (switching between charts, in-page scrolling, etc.) should be decided after the current dashboard structure has been examined. If anything is unclear, a proposal should be presented before implementation.
- **Verification / result:** A row of buttons below the summary tiles and above the charts (Diameter distribution, Species composition, Stems per hectare, Basal area per hectare, Height–diameter, Tree map; only the charts that are drawn) and, on the right, **↑ Filters**. The row stays under the top bar while the page scrolls; a button scrolls to the chart (instantly under the reduced-motion preference), the button of the chart selected and then most visible on screen is highlighted; on a phone the row scrolls sideways within itself and the page has no horizontal scroll. Charts, calculations, filters and exports unchanged. One sentence added to the guide (TR/EN). Test: DI-04 e2e (desktop and phone; normal and `FB_BUNDLE=1`).

---

### MR-002 | Dashboard: Renaming the page

- **Area / page:** Dashboard
- **Type:** Interface text / localisation
- **Priority:** Low
- **Status:** Verified (user approval, 20 Nov 2026; applied 20 Nov 2026)
- **Current state / observation:** The name Dashboard can create the expectation of an overview or control panel for a chart-inspection page.
- **Requested revision:** Change the displayed name of the page to **Data Visualization** in English and **Veri Görselleştirme** in Turkish.
- **Expected behaviour / acceptance criteria:**
  - The page title, the menu and the tool card, if any, should show the same name in the selected language.
  - The current page address, links, charts and calculations must be kept.
- **Verification / result:** Displayed name TR "Veri Görselleştirme", EN "Data Visualization": page title and top line (`data-visualization.php`), side menu and index card (`inc/site.php`), catalogue (`inc/catalog.php`, DI-04), guide (Data Visualization, Workflow, Inventory Data Manager, Report Generator sections), the Inventory Data Manager note and the Report Generator's "Take the records from Data Visualization" button. The address (`data-visualization.php`, `guide.php?k=pano`), session key, downloaded file names (`pano-…`, `dashboard-…`) and calculations unchanged. Tests: DI-04, DI-05, DI-03 and site e2e (normal and `FB_BUNDLE=1`), guide test.

---

### MR-003 | Home page: Resetting all tool sessions

- **Area / page:** Home page / tool sessions
- **Type:** Small functional improvement
- **Priority:** Medium
- **Status:** Verified (user approval, 20 Nov 2026; applied 20 Nov 2026)
- **Requested revision:** Add a **Reset All Tool Sessions** button to the home page.
- **Expected behaviour / acceptance criteria:**
  - The button should return all tool sessions to their starting state without having to open the tools one by one. The existing reset behaviour of each tool should be the basis.
  - A confirmation explaining the scope should be shown before the operation. When cancelled, no session should be reset.
  - The **Reset Session** buttons on the tool pages should, as before, reset only the tool concerned.
- **Verification / result:** In the right column of the home page, above the "What do you want to do?" list, a red-framed **Start over?** box (20 Nov 2026 user corrections: in the first version the box was at the bottom of the side column and the button was blue; in the second version it was moved under the "New here?" box but left a gap in the introduction section); a red **Reset all tool sessions** button (disabled when there are no sessions and no active package); the box shows the number of saved sessions and the name of the active data package. The button deletes all `session:<tool>` keys and **deactivates and deletes the active data package** (user correction; `project:active`, `dataset:approved` and the active project, as `deleteProject` does). The confirmation dialog names the package to be deleted, with a "cannot be undone" warning and a backup suggestion; the other packages in the Inventory Data Manager, the Coefficient Library and downloaded files stay; it warns that a tool open in another tab will save its session again. On cancel nothing is deleted. The tools' own buttons unchanged (the Site Index button keeps the selected set, and the general reset leaves it too). Test: site e2e section 8 (position and colour, cancel, confirmation, deleted and kept keys, English, phone; normal and `FB_BUNDLE=1`).
- **Later change (20 Nov 2026, user decision; home page redesign):** the box was removed from the home page; the bulk reset continues as a red button next to "Reset session" on every tool page (same scope and confirmation; label "Delete all sessions and the active package" when there is an active package).
- **Full reset (20 Nov 2026, user decision):** the button deletes not only the sessions and the active package but everything the site keeps in this browser (all packages, coefficient sets, preferences; the language and downloaded files stay); label **Delete all data and reset the site**.

---

---

## Template for adding a new revision

Copy the block below and continue with the next number (`MR-004`, `MR-005` …). Also add a row to the summary table above.

```markdown
### MR-NNN | Short title

- **Area / page:**
- **Type:** Interface / usability / text / bug fix / other
- **Priority:** Low / Medium / High
- **Status:** Pending
- **Current state / observation:**
- **Requested revision:**
- **Expected behaviour / acceptance criteria:**
  -
- **Implementation note:**
- **Verification / result:** _To be filled in after implementation._
```

## Implementation instructions for Claude

When this file is given to Claude for a revision round:

1. First examine the current state of the project and the relevant pages; check whether the requests in the list are still valid.
2. Apply **only the** `Pending` **items explicitly selected by the user for that round**. Do not change unselected items.
3. For items that are unclear or have alternative solutions, propose a short approach and do not assume important behaviour decisions without user approval.
4. Keep the existing architecture; do not make unrelated refactoring, new dependencies or changes to scientific calculation algorithms.
5. For each item, summarise the change made, the files affected and the test/preview result. State clearly the points that could not be tested.
6. Update statuses only according to the stage actually reached. Do not give the `Verified` status without user approval or explicit verification.
7. **Do not commit, push, open a PR, merge or deploy unless the user explicitly asks.** Keep the current branch and unrelated changes.

> **Usage note:** You can add new requests to this file over time. In a revision round, make the scope clear by saying, for example, "apply items MR-001–MR-005".
