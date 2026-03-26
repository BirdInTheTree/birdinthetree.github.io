import { sortPlotlines, buildColorMap, roundRect, isDarkColor } from './helpers.js';
import { buildAllArcs } from './postprocess.js';
import { ALL_FUNCTIONS, LEGACY_FUNCTIONS, FUNCTION_WEIGHTS } from './constants.js';

/**
 * Fractal Arc Map: season arc (top row) + storyline arcs (one row per plotline).
 * Columns = narrative phases. Cell intensity = event density.
 */
export function buildArcMap(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const colors = buildColorMap(plotlines);
  const arcs = buildAllArcs(data);

  // Determine which functions appear in data
  const funcsInData = new Set();
  for (const phases of arcs.values()) {
    for (const p of phases) funcsInData.add(p.function);
  }
  // Display order: arc progression from setup through resolution
  const DISPLAY_ORDER = {
    setup: 1, seed: 1.5, catalyst: 2,
    escalation: 3, turning_point: 4, crisis: 5,
    climax: 6, cliffhanger: 6.5, resolution: 7
  };
  const columns = [...ALL_FUNCTIONS, ...LEGACY_FUNCTIONS]
    .filter((f) => funcsInData.has(f))
    .sort((a, b) => (DISPLAY_ORDER[a] || 0) - (DISPLAY_ORDER[b] || 0));

  // ACT assignments based on arc weight
  const ACT_MAP = {
    setup: 1, seed: 1, catalyst: 1,
    escalation: 2, turning_point: 2, crisis: 2,
    climax: 3, cliffhanger: 3, resolution: 3
  };

  // Merge non-consecutive phases of same function into one cell
  function mergePhases(phases) {
    const merged = {};
    for (const p of phases) {
      if (!merged[p.function]) {
        merged[p.function] = { episodes: new Set(), eventCount: 0 };
      }
      for (const ep of p.episodes) merged[p.function].episodes.add(ep);
      merged[p.function].eventCount += p.eventCount;
    }
    return merged;
  }

  return { type: 'custom-canvas', render: renderArcMap };

  function renderArcMap(canvas) {
    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#c6c6c6' : '#0e0e0e';
    const fgMuted = isDark ? '#8a8a8a' : '#7f7f7f';
    const accentBlue = isDark ? '#2d82cd' : '#468eeb';

    const nRows = plotlines.length + 1; // +1 for season row
    const nCols = columns.length;

    const cellW = 140;
    const cellH = 52;
    const gap = 3;
    const actHeaderH = 28;
    const colHeaderH = 30;
    const headerH = actHeaderH + colHeaderH;
    const leftMargin = 240;
    const seasonLabelW = leftMargin;

    // Measure left margin from labels
    const measureCtx = canvas.getContext('2d');
    measureCtx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const maxLabelW = Math.max(
      ...plotlines.map((pl) => measureCtx.measureText(`[${pl.rank}] ${pl.name}`).width),
      measureCtx.measureText('Season Arc').width
    );
    const computedLeftMargin = Math.max(leftMargin, maxLabelW + 20);

    const totalW = computedLeftMargin + nCols * (cellW + gap) + 10;
    const totalH = headerH + nRows * (cellH + gap) + 10;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = totalW + 'px';
    canvas.style.height = totalH + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalW, totalH);

    // ACT headers
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = fgMuted;

    const actGroups = {};
    columns.forEach((fn, i) => {
      const act = ACT_MAP[fn] || 2;
      if (!actGroups[act]) actGroups[act] = { start: i, end: i };
      actGroups[act].end = i;
    });

    for (const [act, range] of Object.entries(actGroups)) {
      const startX = computedLeftMargin + range.start * (cellW + gap);
      const endX = computedLeftMargin + range.end * (cellW + gap) + cellW;
      const centerX = (startX + endX) / 2;
      ctx.fillText(`ACT ${act}`, centerX, actHeaderH - 4);

      // Divider line under ACT label
      ctx.strokeStyle = fgMuted;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(startX, actHeaderH);
      ctx.lineTo(endX, actHeaderH);
      ctx.stroke();
    }

    // Column headers — function names
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = fg;
    ctx.textBaseline = 'bottom';
    for (let c = 0; c < nCols; c++) {
      const x = computedLeftMargin + c * (cellW + gap) + cellW / 2;
      const label = columns[c].replace(/_/g, ' ');
      ctx.fillText(label, x, headerH - 4);
    }

    // Season arc row (first row)
    const aPlotline = plotlines.find((pl) => pl.rank === 'A');
    const seasonPhases = aPlotline ? mergePhases(arcs.get(aPlotline.id) || []) : {};
    const seasonY = headerH;

    // Season label
    ctx.fillStyle = fg;
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('Season Arc', computedLeftMargin - 10, seasonY + cellH / 2);

    // Season cells — blue gradient by weight
    for (let c = 0; c < nCols; c++) {
      const fn = columns[c];
      const x = computedLeftMargin + c * (cellW + gap);
      const phase = seasonPhases[fn];

      if (phase) {
        const weight = FUNCTION_WEIGHTS[fn] || 3;
        const intensity = Math.max(0.25, weight / 6);
        ctx.globalAlpha = intensity;
        ctx.fillStyle = accentBlue;
        roundRect(ctx, x, seasonY, cellW, cellH, 3);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Cell text
        const eps = [...phase.episodes].sort();
        const range = eps.length === 1 ? eps[0] : `${eps[0]}..${eps[eps.length - 1]}`;
        const textColor = intensity > 0.5 ? '#ffffff' : fg;
        ctx.fillStyle = textColor;
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(range, x + cellW / 2, seasonY + cellH / 2 - 8);
        ctx.fillText(`${phase.eventCount} events`, x + cellW / 2, seasonY + cellH / 2 + 10);
      } else {
        // Empty cell
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = fgMuted;
        ctx.lineWidth = 1;
        roundRect(ctx, x, seasonY, cellW, cellH, 3);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = fgMuted;
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2014', x + cellW / 2, seasonY + cellH / 2);
      }
    }

    // Divider line between season and storylines
    const dividerY = seasonY + cellH + gap;
    ctx.strokeStyle = fgMuted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(computedLeftMargin, dividerY - 1);
    ctx.lineTo(computedLeftMargin + nCols * (cellW + gap), dividerY - 1);
    ctx.stroke();

    // Storyline rows
    for (let r = 0; r < plotlines.length; r++) {
      const pl = plotlines[r];
      const y = headerH + (r + 1) * (cellH + gap);
      const baseColor = colors[pl.id] || '#999';
      const phases = mergePhases(arcs.get(pl.id) || []);
      const maxCount = Math.max(1, ...Object.values(phases).map((p) => p.eventCount));

      // Row label
      ctx.fillStyle = fg;
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`[${pl.rank}] ${pl.name}`, computedLeftMargin - 10, y + cellH / 2);

      // Cells
      for (let c = 0; c < nCols; c++) {
        const fn = columns[c];
        const x = computedLeftMargin + c * (cellW + gap);
        const phase = phases[fn];

        if (phase) {
          const intensity = Math.max(0.3, phase.eventCount / maxCount);
          ctx.globalAlpha = intensity;
          ctx.fillStyle = baseColor;
          roundRect(ctx, x, y, cellW, cellH, 3);
          ctx.fill();
          ctx.globalAlpha = 1.0;

          // Cell text
          const eps = [...phase.episodes].sort();
          const range = eps.length === 1 ? eps[0] : `${eps[0]}..${eps[eps.length - 1]}`;
          const effectiveAlpha = intensity;
          const textColor = (effectiveAlpha > 0.5 && isDarkColor(baseColor)) ? '#ffffff' : fg;
          ctx.fillStyle = textColor;
          ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(range, x + cellW / 2, y + cellH / 2 - 8);
          ctx.fillText(`${phase.eventCount} ev`, x + cellW / 2, y + cellH / 2 + 10);
        } else {
          // Empty cell
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = fgMuted;
          ctx.lineWidth = 1;
          roundRect(ctx, x, y, cellW, cellH, 3);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }
}
