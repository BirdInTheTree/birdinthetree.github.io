import { sortPlotlines } from './helpers.js';
import { FUNCTION_COLORS, ALL_FUNCTIONS } from './constants.js';

/**
 * Option A: Timeline dots — one row per plotline, dots colored by plot_fn.
 * Horizontal strip chart. Tufte: maximum data, minimum ink.
 */
export function buildPlotlineTimeline(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = (data.episodes || []).sort((a, b) => a.episode.localeCompare(b.episode));
  const epCodes = episodes.map(ep => ep.episode);

  return { type: 'custom-canvas', render: renderTimeline };

  function renderTimeline(canvas) {
    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#c6c6c6' : '#0e0e0e';
    const fgMuted = isDark ? '#555' : '#ccc';
    const bgColor = isDark ? '#151515' : '#ffffff';

    const dotR = 7;
    const dotGap = 4;
    const rowH = 40;
    const leftMargin = 200;
    const colW = 80;
    const topMargin = 30;

    const ctx = canvas.getContext('2d');
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const maxLabelW = Math.max(...plotlines.map(pl => ctx.measureText(pl.name).width));
    const computedLeft = Math.max(leftMargin, maxLabelW + 20);

    const totalW = computedLeft + epCodes.length * colW + 40;
    const totalH = topMargin + plotlines.length * rowH + 60;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = totalW + 'px';
    canvas.style.height = totalH + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalW, totalH);

    // Episode headers
    ctx.fillStyle = fg;
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let i = 0; i < epCodes.length; i++) {
      ctx.fillText(epCodes[i].replace(/S\d+/, ''), computedLeft + i * colW + colW / 2, topMargin - 4);
    }

    // Rows
    for (let r = 0; r < plotlines.length; r++) {
      const pl = plotlines[r];
      const y = topMargin + r * rowH + rowH / 2;

      // Label
      ctx.fillStyle = fg;
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(pl.name, computedLeft - 12, y);

      // Horizontal guide line
      ctx.strokeStyle = fgMuted;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(computedLeft, y);
      ctx.lineTo(computedLeft + epCodes.length * colW, y);
      ctx.stroke();

      // Dots per episode
      for (let e = 0; e < episodes.length; e++) {
        const ep = episodes[e];
        const events = (ep.events || []).filter(ev =>
          (ev.plotline_id || ev.plotline || ev.storyline) === pl.id
        );
        if (events.length === 0) continue;

        const cx = computedLeft + e * colW + colW / 2;
        const startY = y - ((events.length - 1) * (dotR * 2 + dotGap)) / 2;

        for (let d = 0; d < events.length; d++) {
          const ev = events[d];
          const fn = ev.plot_fn || ev.function || 'setup';
          const color = FUNCTION_COLORS[fn] || '#999';
          const dy = startY + d * (dotR * 2 + dotGap);

          ctx.beginPath();
          ctx.arc(cx, dy, dotR, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();

          // Dark outline for light dots
          ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Legend at bottom
    const legendY = topMargin + plotlines.length * rowH + 20;
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let lx = computedLeft;
    for (const fn of ALL_FUNCTIONS) {
      ctx.beginPath();
      ctx.arc(lx + 6, legendY, 5, 0, Math.PI * 2);
      ctx.fillStyle = FUNCTION_COLORS[fn] || '#999';
      ctx.fill();
      ctx.fillStyle = fg;
      const label = fn.replace(/_/g, ' ');
      ctx.fillText(label, lx + 16, legendY);
      lx += ctx.measureText(label).width + 30;
    }
  }
}
