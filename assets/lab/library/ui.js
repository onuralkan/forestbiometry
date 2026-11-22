// Account → Saved results → one result (hesap.php): draws the saved run record as tables and charts (library/view.js)
// and checks its seal. The record comes in the page (#res-data); nothing is fetched.
import { viewOf, inputsView } from './view.js';
import { verifyRecord } from '../core/record.js';
import { svgForDownload } from '../core/chart.js';
import { download } from '../core/export.js';

const box = document.getElementById('res-view'), src = document.getElementById('res-data');
if (box && src) {
  let rec = null; try { rec = JSON.parse(src.textContent); } catch (e) { /* shown below */ }
  if (!rec) box.innerHTML = '<p class="note err">The saved record could not be read.</p>';
  else {
    const v = viewOf(rec);
    box.innerHTML = `<p class="muted small" id="rv-kind">${v.kind === 'tool' ? 'Shown as in the tool, from the saved numbers.' : 'Every table of the saved record; values as the tool wrote them.'} <span id="rv-seal"></span></p>${v.html}${inputsView(rec)}`;
    box.dataset.kind = v.kind;
    // charts: SVG download, as in the tools
    box.querySelectorAll('figure.chartbox').forEach(fg => {
      const svg = fg.querySelector('svg'); if (!svg) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost small'; b.textContent = 'Download SVG';
      b.addEventListener('click', () => download(`${fg.id || 'chart'}.svg`, svgForDownload(svg), 'image/svg+xml'));
      const cap = document.createElement('figcaption'); cap.appendChild(b); fg.appendChild(cap);
    });
    verifyRecord(rec).then(r => {
      const s = document.getElementById('rv-seal'); if (!s) return;
      s.textContent = r.seal === true ? '· Seal holds: the record is unchanged since the tool wrote it.' : r.seal === false ? '· Seal does not hold: the record was changed after the tool wrote it.' : '';
      s.className = r.seal === false ? 'err' : '';
    }).catch(() => {});
  }
}
