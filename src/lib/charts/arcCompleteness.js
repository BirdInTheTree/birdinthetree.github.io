import { sortPlotlines, buildColorMap, roundRect, isDarkColor } from './helpers.js';
import { computeArcCompleteness } from './postprocess.js';
import { ALL_FUNCTIONS, LEGACY_FUNCTIONS } from './constants.js';

/**
 * Arc Completeness chart: which narrative phases each plotline covers.
 * Filled cells = phase present, empty = missing. Score on right.
 */
export function buildArcCompletenessChart(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const colors = buildColorMap(plotlines);
  const completeness = computeArcCompleteness(data);

  // Detect which functions actually appear in data
  const allFuncsInData = new Set();
  for (const funcs of completeness.values()) {
    for (const f of funcs) allFuncsInData.add(f);
  }
  const columns = [...ALL_FUNCTIONS, ...LEGACY_FUNCTIONS].filter(
    (f) => allFuncsInData.has(f)
  );

  return { type: 'custom-canvas', render: renderCompleteness };

  function renderCompleteness(canvas) {
    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#c6c6c6' : '#0e0e0e';
    const fgMuted = isDark ? '#8a8a8a' : '#7f7f7f';
    const gridLine = isDark ? '#343434' : '#dddddd';

    const nRows = plotlines.length;
    const nCols = columns.length;

    const cellW = 100;
    const cellH = 36;
    const gap = 3;
    const headerH = 50;
    const leftMargin = 240;
    const scoreColW = 60;

    const totalW = leftMargin + nCols * (cellW + gap) + scoreColW + 20;
    const totalH = headerH + nRows * (cellH + gap) + 10;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = totalW + 'px';
    canvas.style.height = totalH + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalW, totalH);

    // Column headers — function names
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = fg;
    for (let c = 0; c < nCols; c++) {
      const x = leftMargin + c * (cellW + gap) + cellW / 2;
      const label = columns[c].replace(/_/g, ' ');
      ctx.fillText(label, x, headerH - 4);
    }
    // Score header
    const scoreX = leftMargin + nCols * (cellW + gap) + scoreColW / 2;
    ctx.fillText('Score', scoreX, headerH - 4);

    // Rows
    for (let r = 0; r < nRows; r++) {
      const pl = plotlines[r];
      const y = headerH + r * (cellH + gap);
      const plFuncs = completeness.get(pl.id) || new Set();
      const baseColor = colors[pl.id] || '#999';
      const presentCount = columns.filter((f) => plFuncs.has(f)).length;

      // Row label
      ctx.fillStyle = fg;
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`[${pl.rank}] ${pl.name}`, leftMargin - 10, y + cellH / 2);

      // Cells
      for (let c = 0; c < nCols; c++) {
        const x = leftMargin + c * (cellW + gap);
        const fn = columns[c];
        const present = plFuncs.has(fn);

        if (present) {
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = baseColor;
          roundRect(ctx, x, y, cellW, cellH, 3);
          ctx.fill();
          ctx.globalAlpha = 1.0;

          // Checkmark or function name inside
          const textColor = isDarkColor(baseColor) ? '#ffffff' : '#0e0e0e';
          ctx.fillStyle = textColor;
          ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\u2713', x + cellW / 2, y + cellH / 2);
        } else {
          // Empty cell — dashed outline
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = fgMuted;
          ctx.lineWidth = 1;
          roundRect(ctx, x, y, cellW, cellH, 3);
          ctx.stroke();
          ctx.setLineDash([]);

          // Dash symbol
          ctx.fillStyle = fgMuted;
          ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\u2014', x + cellW / 2, y + cellH / 2);
        }
      }

      // Score column
      const scoreLabel = `${presentCount}/${nCols}`;
      ctx.fillStyle = fg;
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(scoreLabel, scoreX, y + cellH / 2);
    }
  }
}
