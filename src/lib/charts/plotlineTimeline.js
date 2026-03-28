import { sortPlotlines } from './helpers.js';
import { FUNCTION_COLORS, ALL_FUNCTIONS } from './constants.js';

/**
 * Arc Timeline: one row per plotline, dots colored by plot_fn.
 * Horizontal strip chart. Row height adapts to max events per cell.
 */
export function buildPlotlineTimeline(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = (data.episodes || []).sort((a, b) => a.episode.localeCompare(b.episode));
  const epCodes = episodes.map(ep => ep.episode);

  return { type: 'custom-canvas', render: renderTimeline };

  function renderTimeline(canvas) {
    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#c6c6c6' : '#0e0e0e';
    const fgMuted = isDark ? '#454545' : '#ddd';

    const dotR = 6;
    const dotSpacing = dotR * 2 + 3;
    const colW = 130;
    const rowPadding = 16;
    const legendH = 30;
    const epHeaderH = 30;

    const ctx = canvas.getContext('2d');
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const maxLabelW = Math.max(...plotlines.map(pl => ctx.measureText(pl.name).width));
    const computedLeft = Math.max(200, maxLabelW + 24);

    // Measure legend width
    let legendTotalW = 0;
    for (const fn of ALL_FUNCTIONS) {
      legendTotalW += ctx.measureText(fn.replace(/_/g, ' ')).width + 28;
    }

    const totalW = Math.max(computedLeft + epCodes.length * colW + 20, legendTotalW + 40);

    // Compute row heights
    const rowHeights = plotlines.map(pl => {
      let maxEvents = 0;
      for (const ep of episodes) {
        const count = (ep.events || []).filter(ev =>
          (ev.plotline_id || ev.plotline || ev.storyline) === pl.id
        ).length;
        if (count > maxEvents) maxEvents = count;
      }
      return Math.max(dotSpacing * 2, maxEvents * dotSpacing + rowPadding);
    });

    // Layout: episode headers → rows → legend (bottom)
    const topOffset = epHeaderH;
    const rowTops = [];
    let y = topOffset;
    for (const h of rowHeights) {
      rowTops.push(y);
      y += h;
    }
    const totalH = y + legendH + 10;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = totalW + 'px';
    canvas.style.height = totalH + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalW, totalH);

    // Episode headers
    ctx.fillStyle = fg;
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let i = 0; i < epCodes.length; i++) {
      ctx.fillText(epCodes[i], computedLeft + i * colW + colW / 2, topOffset - 8);
    }

    // Vertical dividers between episodes
    ctx.strokeStyle = fgMuted;
    ctx.lineWidth = 0.5;
    for (let e = 1; e < epCodes.length; e++) {
      const x = computedLeft + e * colW - colW / 2 + colW / 2;
      ctx.beginPath();
      ctx.moveTo(computedLeft + e * colW, topOffset);
      ctx.lineTo(computedLeft + e * colW, y);
      ctx.stroke();
    }

    // Rows
    for (let r = 0; r < plotlines.length; r++) {
      const pl = plotlines[r];
      const rowTop = rowTops[r];
      const rowH = rowHeights[r];
      const rowCenter = rowTop + rowH / 2;

      // Label
      ctx.fillStyle = fg;
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(pl.name, computedLeft - 12, rowCenter);

      // Divider line at bottom of row
      if (r < plotlines.length - 1) {
        ctx.strokeStyle = fgMuted;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, rowTop + rowH);
        ctx.lineTo(totalW, rowTop + rowH);
        ctx.stroke();
      }

      // Dots per episode
      for (let e = 0; e < episodes.length; e++) {
        const ep = episodes[e];
        const events = (ep.events || []).filter(ev =>
          (ev.plotline_id || ev.plotline || ev.storyline) === pl.id
        );
        if (events.length === 0) continue;

        const cx = computedLeft + e * colW + colW / 2;
        const startY = rowCenter - ((events.length - 1) * dotSpacing) / 2;

        for (let d = 0; d < events.length; d++) {
          const ev = events[d];
          const fn = ev.plot_fn || ev.function || 'setup';
          const color = FUNCTION_COLORS[fn] || '#999';
          const dy = startY + d * dotSpacing;

          ctx.beginPath();
          ctx.arc(cx, dy, dotR, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Legend — bottom, centered
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const legendY = y + legendH / 2;
    let lx = (totalW - legendTotalW) / 2;
    for (const fn of ALL_FUNCTIONS) {
      const label = fn.replace(/_/g, ' ');
      ctx.beginPath();
      ctx.arc(lx + 6, legendY, 5, 0, Math.PI * 2);
      ctx.fillStyle = FUNCTION_COLORS[fn] || '#999';
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.fillText(label, lx + 16, legendY);
      lx += ctx.measureText(label).width + 28;
    }
  }
}
