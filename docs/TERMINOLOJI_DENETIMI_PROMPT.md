# Comprehensive Turkish Forestry Terminology and Language Audit

You are acting as a senior Turkish-language scientific editor specializing in forest engineering, forest biometrics, forest management, forest mensuration, forest inventory, forest growth and yield modeling, and statistical terminology.

Your task is to conduct a comprehensive terminology and language audit of **all Turkish-language user-facing content** in the existing Forest Biometrics web application.

The objective is to identify inaccurate translations, nonstandard forestry terminology, misleading technical expressions, and inconsistencies in Turkish scientific language.

**This is an editorial audit only. Do not implement corrections in the application.**

## 1. Scope of the Audit

Examine the entire repository and identify all Turkish-language text visible or accessible to users, including:

- Homepage and landing pages.
- Navigation menus and dropdowns.
- Tool names and category labels.
- Individual calculator and analysis pages.
- Input field labels and placeholders.
- Parameter names and definitions.
- Tool descriptions and explanatory paragraphs.
- Help sections, instructions, and tooltips.
- Tables, charts, legends, and axis labels.
- Statistical output descriptions.
- Validation messages, warnings, and errors.
- Export labels, report headings, and generated output text.
- Dynamically generated interface strings.
- Localization files, translation dictionaries, and relevant JavaScript or PHP string constants.
- Relevant user-facing documentation and instructional content.

Include content embedded in HTML, PHP, JavaScript, JSON, Markdown, and other relevant project files.

Exclude source-code identifiers, internal variable names, function names, and developer comments unless they directly affect user-facing terminology.

Do not audit English-only content unless it is necessary to determine the correct meaning of a Turkish translation.

## 2. Primary Focus: Forestry Terminology

Pay particular attention to terminology used in Turkish forestry literature, especially:

### Forest Mensuration and Forest Inventory

- Tree diameter and diameter at breast height.
- Tree height and stand height.
- Basal area.
- Stand density.
- Stand age.
- Site index and site quality.
- Base age and reference age.
- Stand volume.
- Growing stock.
- Merchantable volume.
- Volume equations and volume tables.
- Forest inventory sampling.
- Sample plots and sampling methods.

### Forest Growth and Yield

- Site index curves.
- Dominant height.
- Stand development.
- Growth and increment.
- Yield prediction.
- Stand density indices.
- Mortality and survival.
- Growth models and yield tables.

### Forest Biometrics and Statistical Modeling

- Diameter distributions.
- Probability density and cumulative distribution functions.
- Parameter estimation.
- Parameter recovery and parameter prediction.
- Model fitting.
- Model calibration.
- Model validation.
- Goodness-of-fit.
- Residuals and prediction errors.
- Bias and precision.
- Confidence intervals and prediction intervals.
- Random and fixed effects.
- Mixed-effects models.
- Nonlinear regression.
- Optimization algorithms.
- Bootstrap methods.
- Statistical diagnostics.

### Biomass and Allometric Modeling

- Aboveground and belowground biomass.
- Biomass components.
- Allometric equations.
- Component additivity.
- Biomass expansion factors.
- Carbon stock and carbon estimation.
- System estimation methods.

These categories are illustrative rather than exhaustive. Audit all forestry-related technical terminology found in the application.

## 3. Example of a Known Terminology Problem

A known issue exists in the site index section.

The English term **"base age"** has been translated as **"dayanak yaş"**, whereas **"standart yaş"** is the preferred term in this project's Turkish forestry terminology.

Locate this occurrence and identify any similar translation problems throughout the application.

Important: Do not mechanically replace every occurrence of "reference age", "base age", or related terms with "standart yaş". Determine the intended meaning from the scientific context.

Treat this example as an indication of the type of problem being investigated, not as a universal replacement rule.

## 4. Editorial Evaluation Principles

For each potentially problematic expression, evaluate:

1. **Scientific accuracy:** Does the Turkish expression preserve the meaning of the original concept?
2. **Disciplinary convention:** Is the expression consistent with established Turkish forest engineering terminology?
3. **Terminological consistency:** Is the same concept expressed consistently throughout the application?
4. **Clarity:** Is the expression understandable to its intended academic and professional audience?
5. **Contextual appropriateness:** Is the terminology correct for the particular analytical method or application?
6. **Language quality:** Is the wording natural, grammatically correct, and professionally written in Turkish?

Do not assume that a literal translation is scientifically correct.

Also, do not assume that every unfamiliar term is incorrect. Some technical expressions may have multiple accepted Turkish equivalents.

Distinguish between:

- Scientifically incorrect terminology.
- Nonstandard or questionable terminology.
- Inconsistent terminology.
- Grammatically incorrect or unnatural Turkish.
- Stylistic improvements that are optional rather than necessary.

Prioritize genuine scientific and terminological problems over minor stylistic preferences.

## 5. Terminology Verification

Where possible, verify technical terms against reliable sources, prioritizing:

1. Turkish university textbooks and academic teaching materials in forest engineering.
2. Turkish forestry terminology dictionaries and established reference works.
3. Peer-reviewed Turkish forestry publications.
4. Publications and terminology used by the General Directorate of Forestry (OGM).
5. Relevant Turkish technical standards and official academic terminology.
6. Authoritative international forestry references for clarification of the original English meaning.

Use external sources when available and permitted.

Do not fabricate citations, bibliographic references, or claims of verification.

If an authoritative source cannot be accessed, clearly label the recommendation as an editorial assessment rather than a verified terminology correction.

Where multiple accepted Turkish expressions exist, document the alternatives and explain the recommended choice.

## 6. Repository-Wide Audit Procedure

Perform the audit systematically.

### Step 1: Inventory

Identify all files and modules containing Turkish-language user-facing content.

Create a coverage inventory so that no major application module is accidentally overlooked.

### Step 2: Extract and Review

Inspect Turkish strings in their actual scientific and interface context.

Do not rely exclusively on automated keyword searches.

Review dynamically constructed labels and messages wherever technically feasible.

### Step 3: Identify Problems

Record every substantive terminology problem, questionable translation, or relevant inconsistency.

Avoid reporting duplicates unnecessarily. If the same problem appears in multiple locations, group occurrences while preserving all relevant file references.

### Step 4: Verify and Classify

Determine the correct or preferred Turkish equivalent.

Classify each finding by:

**Severity**
- Critical: Scientifically incorrect or potentially misleading.
- Major: Nonstandard terminology or significant inconsistency.
- Minor: Language, grammar, or clarity problem.
- Optional: Stylistic improvement only.

**Confidence**
- High: Strongly supported by established terminology or authoritative references.
- Medium: Reasonable recommendation, but terminology varies.
- Low: Requires expert review or additional source verification.

### Step 5: Quality Control

Before finalizing the report:

- Check for repeated findings.
- Verify that suggested corrections preserve scientific meaning.
- Ensure consistency across related modules.
- Separate verified errors from debatable terminology choices.
- Confirm that every reported issue corresponds to an actual expression in the repository.
- Identify any files or modules that could not be reviewed.

## 7. Deliverable: A Single Comprehensive Markdown Report

Create one Markdown file in the repository root:

**TURKISH_TERMINOLOGY_AUDIT.md**

The report must be written entirely in professional academic Turkish.

Use the following structure:

### 1. Yönetici Özeti

Summarize the overall terminology quality, major issues, and recommended editorial priorities.

### 2. İnceleme Kapsamı

List reviewed modules and files.

Include a coverage table indicating which modules were fully reviewed, partially reviewed, or could not be assessed.

### 3. Kritik Terminoloji Hataları

List scientifically incorrect or potentially misleading expressions.

### 4. Önemli Terminoloji ve Tutarlılık Sorunları

Identify nonstandard expressions, inconsistent translations, and terminology discrepancies.

### 5. Dil Bilgisi ve Anlatım Sorunları

Include substantive grammatical, syntactic, and clarity problems.

### 6. Önerilen Terminoloji Sözlüğü

Develop a consistent bilingual terminology glossary relevant to the actual application.

### 7. Modül Bazında Bulgular

Organize findings by application module or functional area.

### 8. Önceliklendirilmiş Düzeltme Planı

Suggest an efficient order for future editorial corrections.

### 9. Kaynaklar ve Doğrulama Durumu

List genuine sources consulted, verified terminology, unresolved ambiguities, and issues requiring expert judgment.

## 8. Required Finding Format

Each finding must contain:

| Field | Description |
|---|---|
| ID | Unique finding identifier |
| Module | Relevant application module |
| File / Location | Exact relative file path and line number where possible |
| Current Turkish | Exact problematic expression |
| Original English | Original term, if identifiable |
| Recommended Turkish | Proposed correction |
| Problem Type | Translation, terminology, consistency, grammar, or clarity |
| Severity | Critical, Major, Minor, Optional |
| Confidence | High, Medium, Low |
| Explanation | Concise scientific or linguistic justification |
| Source | Verifiable reference, where available |

Use Markdown tables where practical. If explanations are lengthy, provide them beneath the corresponding finding.

Do not invent file paths, line numbers, English originals, or source references.

For recurring problems, cite all relevant occurrences or clearly indicate that the listed locations are representative rather than exhaustive.

## 9. Strict Git and File Modification Restrictions

You must work only on your currently assigned Git branch.

Before proceeding:

- Verify the current branch using `git branch --show-current`.
- Inspect the working tree using `git status`.
- Identify and preserve any existing uncommitted changes.
- Do not switch branches.
- Do not modify application code or existing documentation.
- Do not change any translation strings in the application.
- Do not modify scientific calculations, configuration files, or dependencies.
- Do not create additional Git worktrees.
- Do not commit any changes.
- Do not push anything to GitHub.
- Do not create pull requests.
- Do not merge or rebase branches.
- Do not deploy or publish anything.
- Do not run destructive Git commands.

**The only permitted new or modified file is `TURKISH_TERMINOLOGY_AUDIT.md`.**

If that file already exists, preserve its contents and report the conflict instead of overwriting it.

Keep the completed Markdown report uncommitted and unpushed in the current working environment.

## 10. Completion Requirements

Do not stop after reviewing a few representative pages.

The goal is a comprehensive repository-wide review of Turkish user-facing terminology.

Continue systematically until all accessible relevant modules have been assessed.

If complete coverage is technically impossible, explicitly document the limitations rather than claiming that the audit was exhaustive.

In your final response, report:

1. Number of files and modules reviewed.
2. Total number of unique findings.
3. Findings by severity.
4. The five most important terminology problems.
5. Location of the completed Markdown report.
6. Any unresolved terminology questions requiring expert review.
7. Confirmation that no application files were modified and no commit or push was performed.

**Begin by verifying the active Git branch and repository state. Then perform the complete terminology audit and create the Markdown report. Do not implement any corrections.**
