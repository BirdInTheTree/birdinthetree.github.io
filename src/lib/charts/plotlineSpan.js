import { sortPlotlines, buildColorMap, buildCastMap } from './helpers.js';

/**
 * Plotline span grid — custom canvas rendering.
 *
 * Returns a render function instead of Chart.js config.
 * Each row = plotline, each column = episode.
 * Cells show event count with plotline-colored background.
 * Gaps where the plotline is not active.
 */
export function buildPlotlineSpan(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = data.episodes || [];
  const episodeNames = episodes.map((ep) => ep.episode);
  const epIdx = {};
  episodeNames.forEach((name, i) => { epIdx[name] = i; });
  const colors = buildColorMap(plotlines);
  const cast = buildCastMap(data);

  // Count events per plotline per episode
  const eventCounts = {};
  for (const ep of episodes) {
    for (const ev of ep.events || []) {
      const sl = ev.storyline;
      if (!sl) continue;
      if (!eventCounts[sl]) eventCounts[sl] = {};
      eventCounts[sl][ep.episode] = (eventCounts[sl][ep.episode] || 0) + 1;
    }
  }

  // Reversed so A-rank plotlines appear at top
  const reversed = [...plotlines].reverse();
  const rankAlpha = { A: 1.0, B: 0.7, C: 0.45, runner: 0.3 };

  return { type: 'custom-canvas', render: renderGrid };

  /**
   * Draw the grid directly onto a canvas element.
   * Called from the analytics page with a canvas reference.
   */
  function renderGrid(canvas) {
    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#a9b1d6' : '#1a1a1a';
    const bg = isDark ? '#1a1b26' : '#ffffff';
    const gridLine = isDark ? '#3b4261' : '#e5e7eb';

    const nRows = reversed.length;
    const nCols = episodeNames.length;

    // Sizing
    const leftMargin = 240;
    const topMargin = 80;
    const cellW = 60;
    const cellH = 40;
    const gap = 3;

    const totalW = leftMargin + nCols * (cellW + gap) + 20;
    const totalH = topMargin + nRows * (cellH + gap) + 20;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = totalW + 'px';
    canvas.style.height = totalH + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, totalW, totalH);

    // Title
    ctx.fillStyle = fg;
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Span Timeline — when each storyline is active', totalW / 2, 22);

    // Episode labels (top)
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    for (let c = 0; c < nCols; c++) {
      const x = leftMargin + c * (cellW + gap) + cellW / 2;
      ctx.save();
      ctx.translate(x, topMargin - 8);
      ctx.rotate(-Math.PI / 6);
      ctx.fillStyle = fg;
      ctx.textAlign = 'right';
      ctx.fillText(episodeNames[c], 0, 0);
      ctx.restore();
    }

    // Row labels and cells
    for (let r = 0; r < nRows; r++) {
      const pl = reversed[r];
      const rank = pl.rank || '?';
      const driver = cast[pl.driver] || pl.driver || '';
      const label = `[${rank}] ${pl.name} (${driver})`;

      const y = topMargin + r * (cellH + gap);

      // Row label
      ctx.fillStyle = fg;
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, leftMargin - 12, y + cellH / 2);

      const span = new Set(pl.span || []);
      const plCounts = eventCounts[pl.id] || {};
      const maxCount = Math.max(1, ...Object.values(plCounts));
      const baseAlpha = rankAlpha[pl.rank] ?? 0.5;
      const baseColor = colors[pl.id] || '#999';

      for (let c = 0; c < nCols; c++) {
        const epName = episodeNames[c];
        const x = leftMargin + c * (cellW + gap);

        if (!span.has(epName)) {
          // Empty cell — light border
          ctx.strokeStyle = gridLine;
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, cellW, cellH);
          continue;
        }

        const count = plCounts[epName] || 0;
        const weightFactor = maxCount > 0 ? Math.max(0.4, count / maxCount) : 0.4;
        const alpha = baseAlpha * weightFactor;

        // Colored cell
        ctx.globalAlpha = alpha;
        ctx.fillStyle = baseColor;
        roundRect(ctx, x, y, cellW, cellH, 4);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Event count number
        if (count > 0) {
          ctx.fillStyle = alpha > 0.5 ? '#ffffff' : (isDark ? '#cdd6f4' : '#1a1a1a');
          ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(count), x + cellW / 2, y + cellH / 2);
        }
      }
    }
  }
}

/** Draw a rounded rectangle path. */
function roundRect(ctx, x, y, w, h, r) {
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
