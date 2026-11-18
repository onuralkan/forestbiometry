// "R code" button (PROJECT.md §9, user decision 10 Nov 2026; started 18 Nov 2026): shared pieces of the R scripts the
// model tools write. A script reproduces the tool's analysis with the same settings on the user's own file: it never
// embeds the data (the file name and the reading options are written into it), states the R packages it uses, and
// explains in comments the steps whose R counterpart is defined differently. Every tool's script is run in CI against
// the tool's own numbers (tests/rcode/, scripts/rcode-check.sh).
// No DOM. Strings only; the tool's rcode.js puts the pieces together.

/** R string literal. */
export const rStr = s => '"' + String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
/** R number literal at full precision (the shortest round-trip form of the double); NA for null/NaN. */
export const rNum = x => (typeof x === 'number' && Number.isFinite(x) ? (Object.is(x, -0) ? '0' : String(x)) : 'NA');
/** c(...) of numbers, strings or integers. */
export const rVec = (xs, f = rNum) => 'c(' + (xs || []).map(f).join(', ') + ')';
/** Comment block, every line prefixed with "# ". */
export const rComment = text => String(text).split('\n').map(l => ('# ' + l).trimEnd()).join('\n');

/**
 * Head of a script: what produced it, how to run it, the packages (with the version R reports at run time).
 * o = { title, tool: { id, version }, site, created, lang, packages: ['nlme', …], notes: [lines] }
 */
export function header(o) {
  const tr = o.lang === 'tr', pk = o.packages || [];
  const lines = [
    `${o.title}`,
    tr ? `Üreten: ${o.tool.id} ${o.tool.version}, ${o.site || 'https://forestbiometry.online'}; ${o.created}` : `Written by ${o.tool.id} ${o.tool.version}, ${o.site || 'https://forestbiometry.online'}; ${o.created}`,
    tr ? 'Bu betik aracın yaptığı analizi aynı ayarlarla R\'da yeniden yapar. Veri betiğe gömülmez: aşağıdaki dosya adını kendi dosyanızın yoluyla değiştirin.'
       : 'This script redoes the tool\'s analysis in R with the same settings. The data are not embedded: change the file name below to the path of your file.',
    tr ? `Paketler: ${pk.length ? pk.join(', ') : 'yalnızca temel R (stats, utils)'}. Sürümler çalıştırınca yazdırılır.`
       : `Packages: ${pk.length ? pk.join(', ') : 'base R only (stats, utils)'}. Their versions are printed when the script runs.`,
    ...(o.notes || []),
  ];
  const libs = pk.map(p => `suppressPackageStartupMessages(library(${p}))`);
  return [rComment(lines.join('\n')), '', ...libs,
    `cat(R.version.string${pk.map(p => `, "; ${p}", as.character(packageVersion(${rStr(p)}))`).join('')}, "\\n")`, ''].join('\n');
}

/**
 * Reading the table as the tool's importer did, every cell as text (the numbers are parsed later by fb_num with the
 * decimal separator chosen in the tool). imp = the tool's import record { kind: 'csv'|'txt'|'tsv'|'paste'|'xlsx'|
 * 'dataset', name, encoding, delim, detected, header, sheet }. Defines `dat` (data frame of text) and `row_no` (the row
 * numbers of the source file, as the tool reports them). For 'paste' and 'dataset' sources the tool offers the table
 * as a CSV file next to the script (see tableCsv); the script then reads that file. Excel: a cell that holds a number is
 * a number in the tool whatever the decimal separator, so in R it is written as text with the chosen separator (17
 * significant digits, the same double) and read back by fb_num like every other cell.
 */
export function readBlock(imp, lang, fileName, decimal = '.') {
  const tr = lang === 'tr', kind = imp && imp.kind, header = !imp || imp.header !== false;
  const file = String(fileName || (imp && imp.name) || 'data.csv').replace(/\s+\([^)]*\)$/, '');   // the sample's label "(simulated)" is not part of its file name
  if (kind === 'xlsx') {
    return [rComment(tr ? 'Veri: Excel dosyası (readxl paketi gerekir); sayılar seçilen ondalık ayırıcıyla metne yazılır, sonra bütün hücreler metin olarak okunur.' : 'Data: Excel file (needs the readxl package); numbers written as text with the chosen decimal separator, every cell then read as text.'),
      `data_file <- ${rStr(file)}`,
      `xl <- readxl::read_excel(data_file, sheet = ${rStr(imp.sheet || 1)}, col_names = ${header ? 'TRUE' : 'FALSE'}, col_types = "list", .name_repair = "minimal")`,
      `xl_cell <- function(v) if (is.null(v) || length(v) == 0 || (length(v) == 1 && is.na(v))) "" else if (is.numeric(v)) sub(".", ${rStr(decimal)}, sprintf("%.17g", v), fixed = TRUE) else as.character(v)`,
      `dat <- as.data.frame(lapply(xl, function(col) vapply(col, xl_cell, "")), check.names = FALSE, stringsAsFactors = FALSE)`,
      `row_no <- seq_len(nrow(dat)) + ${header ? 1 : 0}`, ''].join('\n');
  }
  const csvLike = kind === 'paste' || kind === 'dataset';
  const delim = csvLike ? ',' : (imp && (imp.delim || imp.detected)) || ',';
  const enc = csvLike ? 'UTF-8' : imp && imp.encoding ? String(imp.encoding).toUpperCase().replace('WINDOWS-', 'windows-') : 'UTF-8';
  const note = csvLike
    ? (tr ? 'Veri: aracın betikle birlikte indirdiği CSV dosyası (tablo tarayıcıdaydı; aynı tablo, virgülle ayrılmış, UTF-8).' : 'Data: the CSV file the tool downloads with this script (the table was in the browser; the same table, comma-separated, UTF-8).')
    : (tr ? `Veri: metin dosyası; ayırıcı ${JSON.stringify(delim)}, karakter kodlaması ${enc}, ${header ? 'ilk satır başlık' : 'başlık satırı yok'}; bütün hücreler metin olarak okunur.`
          : `Data: text file; delimiter ${JSON.stringify(delim)}, encoding ${enc}, ${header ? 'first row is a header' : 'no header row'}; every cell read as text.`);
  return [rComment(note),
    `data_file <- ${rStr(csvLike ? csvName(imp) : file)}`,
    `dat <- read.table(data_file, sep = ${rStr(delim)}, header = ${header ? 'TRUE' : 'FALSE'}, quote = "\\"", comment.char = "", colClasses = "character",`,
    `                  na.strings = character(0), check.names = FALSE, strip.white = FALSE, blank.lines.skip = TRUE, fileEncoding = ${rStr(enc)})`,
    `row_no <- seq_len(nrow(dat)) + ${header ? 1 : 0}`, ''].join('\n');
}
/** File name of the CSV offered next to the script for 'paste' and 'dataset' sources. */
export const csvName = imp => String((imp && imp.name) || 'data').replace(/\.[a-z0-9]+$/i, '').replace(/[^\w.-]+/g, '_') + '.csv';
/**
 * The tool's table (headers + rows of cells) as CSV text: a cell holding a number at full precision with the given
 * decimal separator (the shown text of a number may be rounded), every other cell as the text the tool shows.
 */
export function tableCsv(src, cellText, decimal = '.') {
  const q = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const cell = c => c == null ? '' : c.t === 'n' && typeof c.v === 'number' && !c.date ? String(c.v).replace('.', decimal) : cellText(c);
  return [src.headers.map(q).join(','), ...src.rows.map(r => src.headers.map((_, k) => q(cell(r[k]))).join(','))].join('\n') + '\n';
}

/**
 * fb_num: the tool's number reading (core/num.js parseNumber) in R: trimmed text, the minus sign "−" as "-", no spaces
 * inside, only the chosen decimal separator; empty → NA with status "empty", anything else unreadable → NA with status
 * "bad" (never guessed). Returns list(value, status).
 */
export const FB_NUM = `fb_num <- function(x, dec) {
  t <- gsub("\\u2212", "-", trimws(x), fixed = TRUE)
  re <- if (dec == ",") "^[+-]?([0-9]+(,[0-9]*)?|,[0-9]+)([eE][+-]?[0-9]+)?$" else "^[+-]?([0-9]+(\\\\.[0-9]*)?|\\\\.[0-9]+)([eE][+-]?[0-9]+)?$"
  ok <- grepl(re, t)
  v <- rep(NA_real_, length(t)); v[ok] <- as.numeric(if (dec == ",") sub(",", ".", t[ok], fixed = TRUE) else t[ok])
  list(value = v, status = ifelse(t == "", "empty", ifelse(ok, "ok", "bad")))
}`;

/** fb_out: when the environment variable FB_RCODE_OUT names a file, the results are written there (used by the site's tests). */
export const FB_OUT = `fb_out <- function(x) {
  f <- Sys.getenv("FB_RCODE_OUT"); if (!nzchar(f)) return(invisible(NULL))
  v <- unlist(x); write.csv(data.frame(name = names(v), value = format(v, digits = 17)), f, row.names = FALSE)
}`;

/**
 * fb_model(rhs, params, vars): a model formula for nls with the derivatives from R's own deriv (symbolic), as
 * .y ~ fn(params, vars); for a formula deriv cannot differentiate (e.g. abs) the plain formula, where nls uses numerical
 * derivatives (said aloud). fb_grad(m, th, pt): the gradient with respect to the parameters at a point.
 */
export const fbModel = lang => `fb_model <- function(rhs, params, vars) {
  fn <- tryCatch(deriv(rhs, params, function.arg = c(params, vars)), error = function(e) NULL)
  if (is.null(fn)) message(${rStr(lang === 'tr' ? 'deriv bu formülün türevini alamıyor (örneğin abs); nls sayısal türev kullanır' : 'deriv cannot differentiate this formula (e.g. abs); nls uses numerical derivatives')})
  form <- if (is.null(fn)) call("~", quote(.y), rhs) else call("~", quote(.y), as.call(c(quote(fn), lapply(c(params, vars), as.name))))
  list(rhs = rhs, params = params, fn = fn, form = as.formula(form))
}
fb_grad <- function(m, th, pt) {
  if (!is.null(m$fn)) return(attr(do.call(m$fn, c(as.list(th), pt)), "gradient"))
  attr(numericDeriv(m$rhs, names(th), list2env(c(as.list(th), pt)), central = TRUE), "gradient")
}`;
