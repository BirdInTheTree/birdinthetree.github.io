import { sortPlotlines } from './helpers.js';
import { FUNCTION_COLORS, ALL_FUNCTIONS } from './constants.js';

/**
 * Option A: Mini stacked bars — one horizontal bar per cell,
 * segments colored by plot_fn.
 */
export function buildArcTimelineA(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = (data.episodes || []).sort((a, b) => a.episode.localeCompare(b.episode));

  return { type: 'custom-canvas', render };

  function render(canvas) {
    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#c6c6c6' : '#0e0e0e';
    const fgMuted = isDark ? '#454545' : '#ddd';

    const colW = 130;
    const rowH = 44;
    const barH = 20;
    const segW = 14;
    const epHeaderH = 30;
    const legendH = 40;

    const ctx = canvas.getContext('2d');
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const maxLabelW = Math.max(...plotlines.map(pl => ctx.measureText(pl.name).width));
    const computedLeft = Math.max(200, maxLabelW + 24);

    const totalW = computedLeft + episodes.length * colW + 20;
    const topOffset = epHeaderH;
    const totalH = topOffset + plotlines.length * rowH + legendH;

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
    for (let i = 0; i < episodes.length; i++) {
      ctx.fillText(episodes[i].episode, computedLeft + i * colW + colW / 2, topOffset - 8);
    }

    // Rows
    for (let r = 0; r < plotlines.length; r++) {
      const pl = plotlines[r];
      const y = topOffset + r * rowH + rowH / 2;

      ctx.fillStyle = fg;
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(pl.name, computedLeft - 12, y);

      if (r < plotlines.length - 1) {
        ctx.strokeStyle = fgMuted;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, topOffset + (r + 1) * rowH);
        ctx.lineTo(totalW, topOffset + (r + 1) * rowH);
        ctx.stroke();
      }

      // Vertical dividers
      for (let e = 1; e < episodes.length; e++) {
        ctx.strokeStyle = fgMuted;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(computedLeft + e * colW, topOffset);
        ctx.lineTo(computedLeft + e * colW, topOffset + plotlines.length * rowH);
        ctx.stroke();
      }

      for (let e = 0; e < episodes.length; e++) {
        const events = (episodes[e].events || []).filter(ev =>
          (ev.plotline_id || ev.plotline || ev.storyline) === pl.id
        );
        if (events.length === 0) continue;

        const barX = computedLeft + e * colW + (colW - events.length * segW) / 2;
        const barY = y - barH / 2;

        for (let d = 0; d < events.length; d++) {
          const fn = events[d].plot_fn || events[d].function || 'setup';
          ctx.fillStyle = FUNCTION_COLORS[fn] || '#999';
          ctx.fillRect(barX + d * segW, barY, segW - 1, barH);
        }
      }
    }

    drawLegend(ctx, fg, totalW, topOffset + plotlines.length * rowH + 16);
  }
}

/**
 * Option B: Pixel grid — small colored squares arranged 3-4 per row.
 */
export function buildArcTimelineB(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = (data.episodes || []).sort((a, b) => a.episode.localeCompare(b.episode));

  return { type: 'custom-canvas', render };

  function render(canvas) {
    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#c6c6c6' : '#0e0e0e';
    const fgMuted = isDark ? '#454545' : '#ddd';

    const colW = 130;
    const sqSize = 12;
    const sqGap = 3;
    const sqPerRow = 4;
    const epHeaderH = 30;
    const rowPadding = 12;
    const legendH = 40;

    const ctx = canvas.getContext('2d');
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const maxLabelW = Math.max(...plotlines.map(pl => ctx.measureText(pl.name).width));
    const computedLeft = Math.max(200, maxLabelW + 24);

    // Compute row heights based on max events
    const rowHeights = plotlines.map(pl => {
      let maxEv = 0;
      for (const ep of episodes) {
        const count = (ep.events || []).filter(ev =>
          (ev.plotline_id || ev.plotline || ev.storyline) === pl.id
        ).length;
        if (count > maxEv) maxEv = count;
      }
      const rows = Math.ceil(maxEv / sqPerRow);
      return Math.max(30, rows * (sqSize + sqGap) + rowPadding);
    });

    const totalW = computedLeft + episodes.length * colW + 20;
    const topOffset = epHeaderH;
    const rowTops = [];
    let y = topOffset;
    for (const h of rowHeights) { rowTops.push(y); y += h; }
    const totalH = y + legendH;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = totalW + 'px';
    canvas.style.height = totalH + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalW, totalH);

    ctx.fillStyle = fg;
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let i = 0; i < episodes.length; i++) {
      ctx.fillText(episodes[i].episode, computedLeft + i * colW + colW / 2, topOffset - 8);
    }

    for (let r = 0; r < plotlines.length; r++) {
      const pl = plotlines[r];
      const rowTop = rowTops[r];
      const rowH = rowHeights[r];
      const rowCenter = rowTop + rowH / 2;

      ctx.fillStyle = fg;
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(pl.name, computedLeft - 12, rowCenter);

      if (r < plotlines.length - 1) {
        ctx.strokeStyle = fgMuted;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, rowTop + rowH);
        ctx.lineTo(totalW, rowTop + rowH);
        ctx.stroke();
      }

      for (let e = 1; e < episodes.length; e++) {
        ctx.strokeStyle = fgMuted;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(computedLeft + e * colW, topOffset);
        ctx.lineTo(computedLeft + e * colW, y);
        ctx.stroke();
      }

      for (let e = 0; e < episodes.length; e++) {
        const events = (episodes[e].events || []).filter(ev =>
          (ev.plotline_id || ev.plotline || ev.storyline) === pl.id
        );
        if (events.length === 0) continue;

        const gridW = sqPerRow * (sqSize + sqGap);
        const startX = computedLeft + e * colW + (colW - gridW) / 2;
        const gridRows = Math.ceil(events.length / sqPerRow);
        const gridH = gridRows * (sqSize + sqGap);
        const startY = rowCenter - gridH / 2;

        for (let d = 0; d < events.length; d++) {
          const fn = events[d].plot_fn || events[d].function || 'setup';
          const col = d % sqPerRow;
          const row = Math.floor(d / sqPerRow);
          const sx = startX + col * (sqSize + sqGap);
          const sy = startY + row * (sqSize + sqGap);
          ctx.fillStyle = FUNCTION_COLORS[fn] || '#999';
          ctx.beginPath();
          ctx.roundRect(sx, sy, sqSize, sqSize, 2);
          ctx.fill();
        }
      }
    }

    drawLegend(ctx, fg, totalW, y + 16);
  }
}

/**
 * Option C: Bubble chart — one circle per cell,
 * size = event count, color = dominant function.
 */
export function buildArcTimelineC(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = (data.episodes || []).sort((a, b) => a.episode.localeCompare(b.episode));

  return { type: 'custom-canvas', render };

  function render(canvas) {
    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#c6c6c6' : '#0e0e0e';
    const fgMuted = isDark ? '#454545' : '#ddd';

    const colW = 130;
    const rowH = 50;
    const maxR = 20;
    const epHeaderH = 30;
    const legendH = 40;

    const ctx = canvas.getContext('2d');
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const maxLabelW = Math.max(...plotlines.map(pl => ctx.measureText(pl.name).width));
    const computedLeft = Math.max(200, maxLabelW + 24);

    // Find global max event count for sizing
    let globalMax = 1;
    for (const pl of plotlines) {
      for (const ep of episodes) {
        const count = (ep.events || []).filter(ev =>
          (ev.plotline_id || ev.plotline || ev.storyline) === pl.id
        ).length;
        if (count > globalMax) globalMax = count;
      }
    }

    const totalW = computedLeft + episodes.length * colW + 20;
    const topOffset = epHeaderH;
    const totalH = topOffset + plotlines.length * rowH + legendH;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = totalW + 'px';
    canvas.style.height = totalH + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalW, totalH);

    ctx.fillStyle = fg;
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let i = 0; i < episodes.length; i++) {
      ctx.fillText(episodes[i].episode, computedLeft + i * colW + colW / 2, topOffset - 8);
    }

    for (let r = 0; r < plotlines.length; r++) {
      const pl = plotlines[r];
      const y = topOffset + r * rowH + rowH / 2;

      ctx.fillStyle = fg;
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(pl.name, computedLeft - 12, y);

      if (r < plotlines.length - 1) {
        ctx.strokeStyle = fgMuted;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, topOffset + (r + 1) * rowH);
        ctx.lineTo(totalW, topOffset + (r + 1) * rowH);
        ctx.stroke();
      }

      for (let e = 1; e < episodes.length; e++) {
        ctx.strokeStyle = fgMuted;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(computedLeft + e * colW, topOffset);
        ctx.lineTo(computedLeft + e * colW, topOffset + plotlines.length * rowH);
        ctx.stroke();
      }

      for (let e = 0; e < episodes.length; e++) {
        const events = (episodes[e].events || []).filter(ev =>
          (ev.plotline_id || ev.plotline || ev.storyline) === pl.id
        );
        if (events.length === 0) continue;

        // Dominant function
        const fnCounts = {};
        for (const ev of events) {
          const fn = ev.plot_fn || ev.function || 'setup';
          fnCounts[fn] = (fnCounts[fn] || 0) + 1;
        }
        const dominant = Object.entries(fnCounts).sort((a, b) => b[1] - a[1])[0][0];

        const cx = computedLeft + e * colW + colW / 2;
        const radius = Math.max(6, (events.length / globalMax) * maxR);

        ctx.beginPath();
        ctx.arc(cx, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = FUNCTION_COLORS[dominant] || '#999';
        ctx.fill();

        // Event count inside
        if (radius > 10) {
          ctx.fillStyle = isDark ? '#000' : '#fff';
          ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(events.length), cx, y);
        }
      }
    }

    drawLegend(ctx, fg, totalW, topOffset + plotlines.length * rowH + 16);
  }
}

/** Shared legend renderer — centered, 16px, no bold. */
function drawLegend(ctx, fg, totalW, y) {
  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  let legendTotalW = 0;
  for (const fn of ALL_FUNCTIONS) {
    legendTotalW += ctx.measureText(fn.replace(/_/g, ' ')).width + 28;
  }
  let lx = (totalW - legendTotalW) / 2;

  for (const fn of ALL_FUNCTIONS) {
    const label = fn.replace(/_/g, ' ');
    ctx.beginPath();
    ctx.arc(lx + 6, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = FUNCTION_COLORS[fn] || '#999';
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.fillText(label, lx + 16, y);
    lx += ctx.measureText(label).width + 28;
  }
}
