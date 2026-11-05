// Small SVG chart helpers shared by the tools (no library). Colours come from CSS variables
// (--c1…--c6 in lab.css), so charts follow the theme; svgForDownload() inlines them.
import { esc } from './i18n.js';

/** "Nice" axis ticks from 0 to max. */
export function niceTicks(max, n = 5) {
  if (!(max > 0)) return [0, 1];
  const raw = max / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  const out = []; for (let v = 0; v <= max + step * 1e-9; v += step) out.push(+v.toPrecision(12));
  if (out[out.length - 1] < max) out.push(+(out[out.length - 1] + step).toPrecision(12));
  return out;
}

/**
 * Grouped vertical bar chart.
 * o = { title, categories:[string], series:[{ name, values:[number|null] }], xLabel, yLabel, fmt:(v)=>string, width?, height? }
 */
export function barChart(o) {
  const W = o.width || 760, H = o.height || 340, L = 64, R = 14, T = o.series.length > 1 ? 34 : 14, B = 64;
  const pw = W - L - R, ph = H - T - B, nc = o.categories.length, ns = o.series.length;
  const max = Math.max(0, ...o.series.flatMap(s => s.values.filter(v => v != null)));
  const ticks = niceTicks(max), top = ticks[ticks.length - 1] || 1;
  const y = v => T + ph - (v / top) * ph, band = pw / Math.max(1, nc), bw = Math.min(46, band * 0.8 / ns);
  const fmt = o.fmt || (v => String(v));
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(o.title)}"><title>${esc(o.title)}</title>`;
  for (const t of ticks) s += `<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="ch-tick" x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`;
  const rot = nc > 10 || o.categories.some(c => String(c).length > 6);
  o.categories.forEach((c, i) => {
    const x0 = L + i * band + (band - bw * ns) / 2;
    o.series.forEach((se, k) => {
      const v = se.values[i]; if (v == null) return;
      s += `<rect class="ch-s${k % 6}" x="${x0 + k * bw}" y="${y(v)}" width="${Math.max(1, bw - 1)}" height="${Math.max(0, T + ph - y(v))}"><title>${esc(c)}: ${esc(se.name)} ${esc(fmt(v))}</title></rect>`;
    });
    const cx = L + i * band + band / 2, ty = T + ph + 14;
    s += rot ? `<text class="ch-tick" transform="translate(${cx},${ty}) rotate(-40)" text-anchor="end">${esc(c)}</text>` : `<text class="ch-tick" x="${cx}" y="${ty}" text-anchor="middle">${esc(c)}</text>`;
  });
  s += `<line class="ch-axis" x1="${L}" x2="${W - R}" y1="${T + ph}" y2="${T + ph}"/>`;
  if (o.yLabel) s += `<text class="ch-lab" transform="translate(14,${T + ph / 2}) rotate(-90)" text-anchor="middle">${esc(o.yLabel)}</text>`;
  if (o.xLabel) s += `<text class="ch-lab" x="${L + pw / 2}" y="${H - 6}" text-anchor="middle">${esc(o.xLabel)}</text>`;
  if (ns > 1) { let lx = L; o.series.forEach((se, k) => { s += `<rect class="ch-s${k % 6}" x="${lx}" y="10" width="12" height="12"/><text class="ch-tick" x="${lx + 17}" y="20">${esc(se.name)}</text>`; lx += 30 + se.name.length * 7.2; }); }
  return s + '</svg>';
}

/** Standalone SVG with the current theme colours written in (for download). */
export function svgForDownload(svgEl) {
  const cs = getComputedStyle(svgEl), v = n => cs.getPropertyValue(n).trim();
  const css = `.ch-grid{stroke:${v('--line2')};stroke-width:1}.ch-axis{stroke:${v('--ink')};stroke-width:1}.ch-tick{fill:${v('--muted')};font:12px system-ui,sans-serif}`
    + `.ch-lab{fill:${v('--ink')};font:600 12.5px system-ui,sans-serif}` + [1, 2, 3, 4, 5, 6].map((k, i) => `.ch-s${i}{fill:${v('--c' + k)}}`).join('');
  const clone = svgEl.cloneNode(true);
  clone.insertAdjacentHTML('afterbegin', `<style>${css}</style><rect width="100%" height="100%" fill="${v('--surface')}"/>`);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + clone.outerHTML;
}
