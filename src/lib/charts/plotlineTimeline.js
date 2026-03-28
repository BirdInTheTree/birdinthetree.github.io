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
    const colW = 100;
    const topMargin = 40;
    const rowPadding = 16;

    const ctx = canvas.getContext('2d');
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const maxLabelW = Math.max(...plotlines.map(pl => ctx.measureText(pl.name).width));
    const computedLeft = Math.max(200, maxLabelW + 24);

    // Compute max events per cell for each plotline to set row height
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

    const totalW = computedLeft + epCodes.length * colW + 20;
    const rowTops = [];
    let y = topMargin;
    for (const h of rowHeights) {
      rowTops.push(y);
      y += h;
    }
    const legendH = 40;
    const totalH = y + legendH;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = totalW + 'px';
    canvas.style.height = totalH + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalW, totalH);

    // Episode headers
    ctx.fillStyle = fg;
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let i = 0; i < epCodes.length; i++) {
      ctx.fillText(epCodes[i], computedLeft + i * colW + colW / 2, topMargin - 8);
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

    // Legend — two rows if needed
    const legendY = y + 16;
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let lx = computedLeft;
    for (const fn of ALL_FUNCTIONS) {
      const label = fn.replace(/_/g, ' ');
      const labelW = ctx.measureText(label).width + 28;
      if (lx + labelW > totalW - 20) {
        // Don't wrap — just stop (canvas doesn't support wrapping well)
        break;
      }
      ctx.beginPath();
      ctx.arc(lx + 6, legendY, 5, 0, Math.PI * 2);
      ctx.fillStyle = FUNCTION_COLORS[fn] || '#999';
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.fillText(label, lx + 16, legendY);
      lx += labelW;
    }
  }
}
