import { RANK_ORDER, STORYLINE_PALETTE } from './constants.js';

/** Sort plotlines by rank: A < B < C < runner. */
export function sortPlotlines(plotlines) {
  return [...plotlines].sort(
    (a, b) => (RANK_ORDER[a.rank] ?? 99) - (RANK_ORDER[b.rank] ?? 99)
  );
}

/** Assign distinct palette colors to plotlines in rank order. */
export function buildColorMap(plotlines) {
  const map = {};
  plotlines.forEach((pl, i) => {
    map[pl.id] = STORYLINE_PALETTE[i % STORYLINE_PALETTE.length];
  });
  return map;
}

/** Build { charId: charName } lookup from cast array. */
export function buildCastMap(data) {
  const map = {};
  for (const c of data.cast || []) {
    map[c.id] = c.name;
  }
  return map;
}

/** Draw a rounded rectangle path on a canvas context. */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** WCAG luminance check — returns true if color is dark (needs white text). */
export function isDarkColor(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}
