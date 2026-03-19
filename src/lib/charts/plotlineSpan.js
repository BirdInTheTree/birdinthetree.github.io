import { sortPlotlines, buildColorMap, roundRect } from './helpers.js';

/**
 * Plotline span grid — table with totals.
 * A-rank at top. Stretches to fill container width.
 */
export function buildPlotlineSpan(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = (data.episodes || []).sort((a, b) => a.episode.localeCompare(b.episode));
  const episodeNames = episodes.map((ep) => ep.episode);
  const episodeThemes = episodes.map((ep) => ep.theme || '');
  const colors = buildColorMap(plotlines);

  const eventCounts = {};
  for (const ep of episodes) {
    for (const ev of ep.events || []) {
      const sl = ev.plotline || ev.storyline;
      if (!sl) continue;
      if (!eventCounts[sl]) eventCounts[sl] = {};
      eventCounts[sl][ep.episode] = (eventCounts[sl][ep.episode] || 0) + 1;
    }
  }

  const rankAlpha = { A: 0.85, B: 0.6, C: 0.4, runner: 0.25 };

  return { type: 'custom-canvas', render: renderGrid };

  function renderGrid(canvas) {
    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#c6c6c6' : '#0e0e0e';
    const fgSub = isDark ? '#8a8a8a' : '#666';
    const gridLine = isDark ? '#343434' : '#d1d5db';
    const totalBg = isDark ? '#343434' : '#f0f0f0';

    const nRows = plotlines.length;
    const nCols = episodeNames.length;

    // Compute left margin from longest label
    const containerW = canvas.parentElement?.clientWidth || 1000;
    const measureCtx = canvas.getContext('2d');
    measureCtx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const maxLabelW = Math.max(...plotlines.map((pl) => measureCtx.measureText(`[${pl.rank}] ${pl.name}`).width));
    const leftMargin = Math.max(220, maxLabelW + 20);
    const totalColW = 70;
    const gap = 3;
    const availW = containerW - leftMargin - totalColW - gap - 10;
    const cellW = Math.max(70, Math.floor(availW / nCols) - gap);
    const cellH = 42;
    const headerH = 28;
    const themeH = 24;
    const topMargin = headerH + themeH;

    const gridW = nCols * (cellW + gap) + totalColW + gap;
    const totalW = leftMargin + gridW + 10;
    const totalH = topMargin + (nRows + 1) * (cellH + gap) + 10;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = totalW + 'px';
    canvas.style.height = totalH + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Transparent background (inherits from page)
    ctx.clearRect(0, 0, totalW, totalH);

    // Episode code headers
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = fg;
    for (let c = 0; c < nCols; c++) {
      const x = leftMargin + c * (cellW + gap) + cellW / 2;
      ctx.fillText(episodeNames[c], x, headerH);
    }
    const totalColX = leftMargin + nCols * (cellW + gap);
    ctx.fillText('Total', totalColX + totalColW / 2, headerH);

    // Theme row
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = fgSub;
    ctx.textBaseline = 'top';
    for (let c = 0; c < nCols; c++) {
      const x = leftMargin + c * (cellW + gap) + cellW / 2;
      const theme = episodeThemes[c];
      const maxChars = Math.floor(cellW / 9);
      const truncated = theme.length > maxChars ? 'Theme: ' + theme.slice(0, maxChars - 7) + '\u2026' : 'Theme: ' + theme;
      ctx.fillText(truncated, x, headerH + 4);
    }

    // Data rows
    for (let r = 0; r < nRows; r++) {
      const pl = plotlines[r];
      const label = `[${pl.rank}] ${pl.name}`;
      const y = topMargin + r * (cellH + gap);

      ctx.fillStyle = fg;
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, leftMargin - 10, y + cellH / 2);

      const span = new Set(pl.span || []);
      const plCounts = eventCounts[pl.id] || {};
      const maxCount = Math.max(1, ...Object.values(plCounts));
      const baseAlpha = rankAlpha[pl.rank] ?? 0.5;
      const baseColor = colors[pl.id] || '#999';
      let rowTotal = 0;

      for (let c = 0; c < nCols; c++) {
        const epName = episodeNames[c];
        const x = leftMargin + c * (cellW + gap);

        if (!span.has(epName)) {
          ctx.strokeStyle = gridLine;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellW, cellH);
          continue;
        }

        const count = plCounts[epName] || 0;
        rowTotal += count;
        const intensity = maxCount > 0 ? Math.max(0.35, count / maxCount) : 0.35;
        const alpha = baseAlpha * intensity;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = baseColor;
        roundRect(ctx, x, y, cellW, cellH, 3);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        if (count > 0) {
          ctx.fillStyle = alpha > 0.5 ? '#ffffff' : (isDark ? '#c6c6c6' : '#333');
          ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(count), x + cellW / 2, y + cellH / 2);
        }
      }

      // Row total
      ctx.fillStyle = totalBg;
      roundRect(ctx, totalColX, y, totalColW, cellH, 3);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(rowTotal), totalColX + totalColW / 2, y + cellH / 2);
    }

    // Total row
    const totalRowY = topMargin + nRows * (cellH + gap);
    ctx.fillStyle = fg;
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('Total', leftMargin - 10, totalRowY + cellH / 2);

    let grandTotal = 0;
    for (let c = 0; c < nCols; c++) {
      const epName = episodeNames[c];
      let colTotal = 0;
      for (const pl of plotlines) {
        colTotal += (eventCounts[pl.id] || {})[epName] || 0;
      }
      grandTotal += colTotal;
      const x = leftMargin + c * (cellW + gap);
      ctx.fillStyle = totalBg;
      roundRect(ctx, x, totalRowY, cellW, cellH, 3);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(colTotal), x + cellW / 2, totalRowY + cellH / 2);
    }

    // Grand total
    ctx.fillStyle = totalBg;
    roundRect(ctx, totalColX, totalRowY, totalColW, cellH, 3);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(grandTotal), totalColX + totalColW / 2, totalRowY + cellH / 2);
  }
}
