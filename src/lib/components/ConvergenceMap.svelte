<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { theme } from '$lib/stores/app.js';
  import { buildConvergenceMatrix } from '$lib/charts/postprocess.js';
  import { sortPlotlines, buildColorMap } from '$lib/charts/helpers.js';

  export let data = null;

  let container;

  /** Parse hex to [r, g, b]. */
  function parseHex(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ];
  }

  /**
   * Blend row (source) and column (target) plotline colors.
   * Row color dominates (70%), column tints (30%).
   * Then fade toward bg based on value intensity t.
   */
  function blendCell(rowHex, colHex, bg, t) {
    const [r1, g1, b1] = parseHex(rowHex);
    const [r2, g2, b2] = parseHex(colHex);
    const [rb, gb, bb] = parseHex(bg);
    // Row dominates, column tints
    const mr = r1 * 0.7 + r2 * 0.3;
    const mg = g1 * 0.7 + g2 * 0.3;
    const mb = b1 * 0.7 + b2 * 0.3;
    // Fade toward background by intensity
    const mix = (c, b) => Math.round(c * t + b * (1 - t));
    const toHex = (v) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0');
    return `#${toHex(mix(mr, rb))}${toHex(mix(mg, gb))}${toHex(mix(mb, bb))}`;
  }

  /** Check if blended color is dark enough to need white text. */
  function needsWhiteText(hex) {
    const [r, g, b] = parseHex(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
  }

  function render() {
    if (!browser || !container || !data) return;

    import('d3').then((d3) => {
      drawHeatmap(d3, data);
    });
  }

  function drawHeatmap(d3, seriesData) {
    container.innerHTML = '';

    const { matrix, plotlineNames } = buildConvergenceMatrix(seriesData);
    const n = plotlineNames.length;
    if (n === 0) return;

    const plotlines = sortPlotlines(seriesData.plotlines || []);
    const colors = buildColorMap(plotlines);
    const plColors = plotlines.map(pl => colors[pl.id] || '#888');

    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#c6c6c6' : '#0e0e0e';
    const bg = isDark ? '#151515' : '#ffffff';
    const emptyBg = isDark ? '#1a1a1a' : '#f9fafb';
    const diagonalBg = isDark ? '#252525' : '#f0f0f0';

    const rowTotals = matrix.map((row) => row.reduce((s, v) => s + v, 0));
    const colTotals = Array.from({ length: n }, (_, j) =>
      matrix.reduce((s, row) => s + row[j], 0)
    );

    const measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const maxNameW = Math.max(...plotlineNames.map(name => measureCtx.measureText(name).width));
    const cellW = Math.max(90, maxNameW + 20);
    const cellH = 60;
    const totalColW = 60;
    const totalRowH = 26;
    const margin = { top: 10, right: 10, bottom: 50, left: 180 };
    const width = margin.left + n * cellW + totalColW + margin.right;
    const height = margin.top + n * cellH + totalRowH + margin.bottom;

    const maxVal = Math.max(1, ...matrix.flat());

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', bg);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Cells
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          g.append('rect')
            .attr('x', j * cellW).attr('y', i * cellH)
            .attr('width', cellW - 1).attr('height', cellH - 1)
            .attr('fill', diagonalBg).attr('rx', 2);
          continue;
        }

        const val = matrix[i][j];
        let cellColor;
        if (val > 0) {
          // Sqrt scale so small values are still visible
          const t = Math.max(0.35, Math.sqrt(val / maxVal));
          cellColor = blendCell(plColors[i], plColors[j], bg, t);
        } else {
          cellColor = emptyBg;
        }

        g.append('rect')
          .attr('x', j * cellW).attr('y', i * cellH)
          .attr('width', cellW - 1).attr('height', cellH - 1)
          .attr('fill', cellColor)
          .attr('rx', 2)
          .append('title')
          .text(`${plotlineNames[i]} \u2192 ${plotlineNames[j]}: ${val}`);

        const textColor = val > 0 && needsWhiteText(cellColor) ? '#ffffff' : fg;
        g.append('text')
          .attr('x', j * cellW + cellW / 2)
          .attr('y', i * cellH + cellH / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', val > 0 ? textColor : (isDark ? '#555' : '#bbb'))
          .attr('font-size', '14px')
          .attr('font-weight', val > 0 ? 'bold' : 'normal')
          .text(val > 0 ? val : '\u2014');
      }
    }

    // Row totals
    for (let i = 0; i < n; i++) {
      g.append('text')
        .attr('x', n * cellW + 8)
        .attr('y', i * cellH + cellH / 2)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'central')
        .attr('fill', fg)
        .attr('font-size', '14px')
        .text(`\u2192 ${rowTotals[i]}`);
    }

    // Column totals
    for (let j = 0; j < n; j++) {
      g.append('text')
        .attr('x', j * cellW + cellW / 2)
        .attr('y', n * cellH + totalRowH)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'auto')
        .attr('fill', fg)
        .attr('font-size', '14px')
        .text(`\u2193 ${colTotals[j]}`);
    }

    // Y-axis labels (colored by plotline)
    for (let i = 0; i < n; i++) {
      g.append('text')
        .attr('x', -6)
        .attr('y', i * cellH + cellH / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'central')
        .attr('fill', fg)
        .attr('font-size', '14px')
        .text(plotlineNames[i]);
    }

    // X-axis labels
    for (let i = 0; i < n; i++) {
      g.append('text')
        .attr('x', i * cellW + cellW / 2)
        .attr('y', n * cellH + totalRowH + 14)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'hanging')
        .attr('fill', fg)
        .attr('font-size', '14px')
        .text(plotlineNames[i]);
    }
  }

  let mounted = false;

  onMount(() => {
    mounted = true;
    render();
  });

  onDestroy(() => unsubTheme());

  $: if (mounted && browser && container && data) render();

  const unsubTheme = theme.subscribe(() => {
    if (mounted && browser && container && data) setTimeout(render, 50);
  });
</script>

<div bind:this={container} class="convergence-map"></div>

<style>
  .convergence-map {
    width: 100%;
    overflow-x: auto;
  }
</style>
