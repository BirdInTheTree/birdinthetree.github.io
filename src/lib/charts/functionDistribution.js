import { ALL_FUNCTIONS, FUNCTION_COLORS } from './constants.js';

/**
 * Function distribution as small multiples — one mini horizontal bar
 * chart per episode, rendered via custom canvas.
 *
 * Each mini chart shows function types as horizontal bars with counts.
 * Matches the Python original (matplotlib subplots with barh).
 */
export function buildFunctionDistribution(data) {
  const episodes = data.episodes || [];

  return { type: 'custom-canvas', render: renderSmallMultiples };

  function renderSmallMultiples(canvas) {
    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#a9b1d6' : '#1a1a1a';
    const bg = isDark ? '#1a1b26' : '#ffffff';
    const labelColor = isDark ? '#a9b1d6' : '#333333';

    const nEps = episodes.length;
    const cols = Math.min(4, nEps);
    const rows = Math.ceil(nEps / cols);

    // Mini chart dimensions
    const chartW = 260;
    const chartH = 200;
    const marginLeft = 110;
    const marginTop = 30;
    const marginBottom = 10;
    const marginRight = 40;
    const gapX = 30;
    const gapY = 20;

    const totalW = cols * (marginLeft + chartW + marginRight + gapX);
    const totalH = 50 + rows * (marginTop + chartH + marginBottom + gapY);

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
    ctx.fillText('Function Distribution — dramatic beat types per episode', totalW / 2, 28);

    const nFuncs = ALL_FUNCTIONS.length;
    const barHeight = Math.floor((chartH - 10) / nFuncs) - 3;

    for (let i = 0; i < nEps; i++) {
      const ep = episodes[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const originX = col * (marginLeft + chartW + marginRight + gapX) + marginLeft;
      const originY = 50 + row * (marginTop + chartH + marginBottom + gapY) + marginTop;

      // Episode title
      ctx.fillStyle = fg;
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ep.episode, originX + chartW / 2, originY - 10);

      // Count functions
      const funcCounts = {};
      for (const ev of ep.events || []) {
        const fn = ev.function || '';
        funcCounts[fn] = (funcCounts[fn] || 0) + 1;
      }

      const values = ALL_FUNCTIONS.map((f) => funcCounts[f] || 0);
      const maxVal = Math.max(5, ...values.map((v) => v + 1));

      for (let f = 0; f < nFuncs; f++) {
        const y = originY + f * (barHeight + 3);
        const v = values[f];
        const barW = (v / maxVal) * chartW;
        const fnName = ALL_FUNCTIONS[f].replace(/_/g, ' ');

        // Function label
        ctx.fillStyle = fg;
        ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(fnName, originX - 8, y + barHeight / 2);

        // Bar
        if (v > 0) {
          ctx.fillStyle = FUNCTION_COLORS[ALL_FUNCTIONS[f]] || '#999';
          ctx.strokeStyle = '#666666';
          ctx.lineWidth = 0.5;
          roundRect(ctx, originX, y, barW, barHeight, 3);
          ctx.fill();
          ctx.stroke();

          // Value label
          ctx.fillStyle = labelColor;
          ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(v), originX + barW + 4, y + barHeight / 2);
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
