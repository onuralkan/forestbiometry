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
  const css = `.ch-grid{stroke:${v('--line2')};stroke-width:1}.ch-axis{stroke:${v('--ink')};stroke-width:1}.ch-frame{fill:none;stroke:${v('--line')}}.ch-ref{stroke:${v('--ink')};stroke-width:1.2;stroke-dasharray:6 4}.ch-pts{fill-opacity:.6}.ch-bar{fill:${v('--line')}}.ch-line{fill:none;stroke-width:2}.ch-dash{stroke-dasharray:6 4}` + [1, 2, 3, 4, 5, 6].map((k, i) => `.ch-l${i}{stroke:${v('--c' + k)}}`).join('') + `.ch-tick{fill:${v('--muted')};font:12px system-ui,sans-serif}`
    + `.ch-lab{fill:${v('--ink')};font:600 12.5px system-ui,sans-serif}` + [1, 2, 3, 4, 5, 6].map((k, i) => `.ch-s${i}{fill:${v('--c' + k)}}`).join('');
  const clone = svgEl.cloneNode(true);
  clone.insertAdjacentHTML('afterbegin', `<style>${css}</style><rect width="100%" height="100%" fill="${v('--surface')}"/>`);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + clone.outerHTML;
}

/**
 * Scatter plot. o = { title, points:[[x,y]], xLabel, yLabel, fmt, line11?:bool (y = x), hline?:number (y = c),
 *   equal?:bool (same range on both axes), width?, height? }
 */
export function scatterChart(o) {
  const W = o.width || 560, H = o.height || 460, L = 64, R = 16, T = 14, B = 52;
  const pw = W - L - R, ph = H - T - B, pts = o.points, fmt = o.fmt || (v => String(v));
  if (!pts.length) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(o.title)}"><title>${esc(o.title)}</title></svg>`;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [a, b] of pts) { if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b; }
  if (o.hline != null) { y0 = Math.min(y0, o.hline); y1 = Math.max(y1, o.hline); }
  if (o.equal) { x0 = y0 = Math.min(x0, y0); x1 = y1 = Math.max(x1, y1); }
  const pad = (a, b) => { const d = b - a || Math.abs(a) || 1; return [a - d * 0.05, b + d * 0.05]; };
  [x0, x1] = pad(x0, x1); [y0, y1] = pad(y0, y1);
  const tx = linTicks(x0, x1), ty = linTicks(y0, y1);
  const sx = v => L + (v - x0) / (x1 - x0) * pw, sy = v => T + ph - (v - y0) / (y1 - y0) * ph;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(o.title)}"><title>${esc(o.title)}</title>`;
  for (const t of ty) s += `<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${sy(t)}" y2="${sy(t)}"/><text class="ch-tick" x="${L - 6}" y="${sy(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`;
  for (const t of tx) s += `<line class="ch-grid" x1="${sx(t)}" x2="${sx(t)}" y1="${T}" y2="${T + ph}"/><text class="ch-tick" x="${sx(t)}" y="${T + ph + 16}" text-anchor="middle">${esc(fmt(t))}</text>`;
  s += `<rect class="ch-frame" x="${L}" y="${T}" width="${pw}" height="${ph}"/>`;
  if (o.line11) { const a = Math.max(x0, y0), b = Math.min(x1, y1); if (b > a) s += `<line class="ch-ref" x1="${sx(a)}" y1="${sy(a)}" x2="${sx(b)}" y2="${sy(b)}"/>`; }
  if (o.hline != null) s += `<line class="ch-ref" x1="${L}" x2="${W - R}" y1="${sy(o.hline)}" y2="${sy(o.hline)}"/>`;
  const r = pts.length > 2000 ? 1.6 : pts.length > 300 ? 2.4 : 3.4;
  s += '<g class="ch-s0 ch-pts">' + pts.map(p => `<circle cx="${sx(p[0]).toFixed(1)}" cy="${sy(p[1]).toFixed(1)}" r="${r}"/>`).join('') + '</g>';
  if (o.xLabel) s += `<text class="ch-lab" x="${L + pw / 2}" y="${H - 8}" text-anchor="middle">${esc(o.xLabel)}</text>`;
  if (o.yLabel) s += `<text class="ch-lab" transform="translate(14,${T + ph / 2}) rotate(-90)" text-anchor="middle">${esc(o.yLabel)}</text>`;
  return s + '</svg>';
}
function linTicks(a, b, n = 6) {
  const raw = (b - a) / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  const out = []; for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-9; v += step) out.push(+v.toPrecision(12));
  return out;
}

/**
 * Continuous x axis with optional bars (histogram) and lines/steps.
 * o = { title, xLabel, yLabel, fmt, xmin, xmax, ymin?, ymax?, bars?: [{ lo, hi, v }],
 *       lines?: [{ name, pts:[[x,y]], step?:bool, dash?:bool, k?:colour index }], width?, height? }
 */
export function plotChart(o) {
  const W = o.width || 680, H = o.height || 380, L = 62, R = 14, T = (o.lines || []).some(l => l.name) ? 34 : 14, B = 52;
  const pw = W - L - R, ph = H - T - B, fmt = o.fmt || (v => String(v));
  let ymax = o.ymax;
  if (ymax == null) { ymax = 0; for (const b of o.bars || []) ymax = Math.max(ymax, b.v); for (const l of o.lines || []) for (const p of l.pts) if (Number.isFinite(p[1]) && p[0] >= o.xmin && p[0] <= o.xmax) ymax = Math.max(ymax, p[1]); ymax = ymax * 1.06 || 1; }
  const ymin = o.ymin || 0, tx = linTicks(o.xmin, o.xmax), ty = linTicks(ymin, ymax);
  const sx = v => L + (v - o.xmin) / (o.xmax - o.xmin) * pw, sy = v => T + ph - (Math.min(v, ymax) - ymin) / (ymax - ymin) * ph;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(o.title)}"><title>${esc(o.title)}</title>`;
  for (const t of ty) s += `<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${sy(t)}" y2="${sy(t)}"/><text class="ch-tick" x="${L - 6}" y="${sy(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`;
  for (const t of tx) s += `<text class="ch-tick" x="${sx(t)}" y="${T + ph + 16}" text-anchor="middle">${esc(fmt(t))}</text>`;
  s += `<defs><clipPath id="clp${W}${H}"><rect x="${L}" y="${T}" width="${pw}" height="${ph}"/></clipPath></defs><g clip-path="url(#clp${W}${H})">`;
  for (const b of o.bars || []) { const x0 = sx(Math.max(b.lo, o.xmin)), x1 = sx(Math.min(b.hi, o.xmax)); if (x1 > x0) s += `<rect class="ch-bar" x="${x0}" y="${sy(b.v)}" width="${Math.max(0, x1 - x0 - 1)}" height="${Math.max(0, T + ph - sy(b.v))}"/>`; }
  (o.lines || []).forEach((l, i) => {
    let d = '';
    l.pts.forEach((p, j) => {
      if (!Number.isFinite(p[1])) return;
      const X = sx(p[0]).toFixed(1), Y = sy(p[1]).toFixed(1);
      if (!d) d = `M${X},${Y}`; else if (l.step) d += `H${X}V${Y}`; else d += `L${X},${Y}`;
    });
    s += `<path class="ch-line ch-l${(l.k ?? i) % 6}${l.dash ? ' ch-dash' : ''}" d="${d}"/>`;
  });
  s += `</g><rect class="ch-frame" x="${L}" y="${T}" width="${pw}" height="${ph}"/>`;
  let lx = L; (o.lines || []).forEach((l, i) => { if (!l.name) return; s += `<line class="ch-line ch-l${(l.k ?? i) % 6}${l.dash ? ' ch-dash' : ''}" x1="${lx}" x2="${lx + 18}" y1="16" y2="16"/><text class="ch-tick" x="${lx + 23}" y="20">${esc(l.name)}</text>`; lx += 34 + l.name.length * 6.8; });
  if (o.xLabel) s += `<text class="ch-lab" x="${L + pw / 2}" y="${H - 8}" text-anchor="middle">${esc(o.xLabel)}</text>`;
  if (o.yLabel) s += `<text class="ch-lab" transform="translate(14,${T + ph / 2}) rotate(-90)" text-anchor="middle">${esc(o.yLabel)}</text>`;
  return s + '</svg>';
}
