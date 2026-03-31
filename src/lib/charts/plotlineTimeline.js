import { sortPlotlines, buildColorMap, roundRect } from './helpers.js';

/** Blend hex color toward bg by factor t (1 = full color, 0 = full bg). */
function blendColor(hex, bgHex, t) {
  const parse = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16)
  ];
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(bgHex);
  const mix = (a, b) => Math.round(a * t + b * (1 - t));
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`;
}

/**
 * Span Timeline: one row per plotline, columns per episode.
 * Each cell is a rounded rectangle colored by plotline, opacity by event count.
 * Shows event count inside. Empty cells are blank.
 */
export function buildPlotlineTimeline(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = (data.episodes || []).sort((a, b) => a.episode.localeCompare(b.episode));
  const epCodes = episodes.map(ep => ep.episode);
  const colors = buildColorMap(plotlines);

  // Pre-compute event counts per plotline per episode
  const counts = [];
  let globalMax = 1;
  for (const pl of plotlines) {
    const row = [];
    let rowMax = 0;
    for (const ep of episodes) {
      const count = (ep.events || []).filter(ev =>
        (ev.plotline_id || ev.plotline || ev.storyline) === pl.id
      ).length;
      row.push(count);
      if (count > rowMax) rowMax = count;
    }
    counts.push({ row, max: rowMax });
    if (rowMax > globalMax) globalMax = rowMax;
  }

  return { type: 'custom-canvas', render: renderTimeline };

  function renderTimeline(canvas) {
    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#c6c6c6' : '#000000';
    const fgMuted = isDark ? '#454545' : '#d0d0d0';

    const cellH = 60;
    const cellGap = 1;
    const rowH = cellH + cellGap;
    const epHeaderH = 30;
    const radius = 6;

    const ctx = canvas.getContext('2d');
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const maxLabelW = Math.max(...plotlines.map(pl => ctx.measureText(pl.name).width));
    const computedLeft = Math.max(160, maxLabelW + 20);

    // Fill available container width
    const containerW = canvas.parentElement?.clientWidth || 800;
    const totalW = Math.max(containerW, computedLeft + epCodes.length * 60 + 10);
    const cellW = Math.floor((totalW - computedLeft - 10) / epCodes.length) - cellGap;
    const totalH = epHeaderH + plotlines.length * rowH + 10;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = totalW + 'px';
    canvas.style.height = totalH + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalW, totalH);

    // Episode headers
    ctx.fillStyle = fg;
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let i = 0; i < epCodes.length; i++) {
      const cx = computedLeft + i * (cellW + cellGap) + cellW / 2;
      ctx.fillText(epCodes[i], cx, epHeaderH - 6);
    }

    // Rows
    for (let r = 0; r < plotlines.length; r++) {
      const pl = plotlines[r];
      const rowTop = epHeaderH + r * rowH;
      const baseColor = colors[pl.id] || '#888';
      const rowMax = counts[r].max || 1;

      // Row label
      ctx.fillStyle = fg;
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(pl.name, computedLeft - 12, rowTop + cellH / 2);

      // Cells
      for (let e = 0; e < episodes.length; e++) {
        const count = counts[r].row[e];
        if (count === 0) continue;

        const x = computedLeft + e * (cellW + cellGap);
        const y = rowTop;

        // Blend color with background based on event count
        const t = Math.max(0.3, count / rowMax);
        const blended = blendColor(baseColor, isDark ? '#151515' : '#ffffff', t);

        ctx.fillStyle = blended;
        roundRect(ctx, x, y, cellW, cellH, radius);
        ctx.fill();

        // Number inside cell
        ctx.fillStyle = t > 0.5 ? '#ffffff' : fg;
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(count), x + cellW / 2, y + cellH / 2);
      }
    }
  }
}
