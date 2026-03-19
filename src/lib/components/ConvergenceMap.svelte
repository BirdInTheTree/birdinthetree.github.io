<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { theme } from '$lib/stores/app.js';
  import { buildConvergenceMatrix } from '$lib/charts/postprocess.js';

  export let data = null;

  let container;

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

    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#c6c6c6' : '#0e0e0e';
    const bg = isDark ? '#202020' : '#ffffff';
    const emptyBg = isDark ? '#151515' : '#f9fafb';
    const diagonalBg = isDark ? '#343434' : '#e5e7eb';

    // Row/column totals
    const rowTotals = matrix.map((row) => row.reduce((s, v) => s + v, 0));
    const colTotals = Array.from({ length: n }, (_, j) =>
      matrix.reduce((s, row) => s + row[j], 0)
    );

    const cellSize = Math.min(80, Math.max(50, 600 / n));
    const totalColW = 70;
    const totalRowH = 30;
    const margin = { top: 40, right: 80, bottom: 80, left: 200 };
    const width = margin.left + n * cellSize + totalColW + margin.right;
    const height = margin.top + n * cellSize + totalRowH + margin.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', bg);

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 24)
      .attr('text-anchor', 'middle')
      .attr('fill', fg)
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('Directed Convergence \u2014 also_affects links between storylines');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxVal = Math.max(1, ...matrix.flat());
    const colorScale = d3.scaleSequential(d3.interpolatePurples).domain([0, maxVal]);

    // Cells
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          g.append('rect')
            .attr('x', j * cellSize).attr('y', i * cellSize)
            .attr('width', cellSize - 1).attr('height', cellSize - 1)
            .attr('fill', diagonalBg).attr('rx', 2);
          continue;
        }

        const val = matrix[i][j];
        g.append('rect')
          .attr('x', j * cellSize).attr('y', i * cellSize)
          .attr('width', cellSize - 1).attr('height', cellSize - 1)
          .attr('fill', val > 0 ? colorScale(val) : emptyBg)
          .attr('rx', 2)
          .append('title')
          .text(`${plotlineNames[i]} \u2192 ${plotlineNames[j]}: ${val}`);

        g.append('text')
          .attr('x', j * cellSize + cellSize / 2)
          .attr('y', i * cellSize + cellSize / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', fg)
          .attr('font-size', '16px')
          .attr('font-weight', val > 0 ? 'bold' : 'normal')
          .text(val > 0 ? val : '\u2014');
      }
    }

    // Row totals — "sends"
    for (let i = 0; i < n; i++) {
      g.append('text')
        .attr('x', n * cellSize + 10)
        .attr('y', i * cellSize + cellSize / 2)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'central')
        .attr('fill', fg)
        .attr('font-size', '16px')
        .text(`\u2192 ${rowTotals[i]}`);
    }

    // Column totals — "receives"
    for (let j = 0; j < n; j++) {
      g.append('text')
        .attr('x', j * cellSize + cellSize / 2)
        .attr('y', n * cellSize + totalRowH)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'auto')
        .attr('fill', fg)
        .attr('font-size', '16px')
        .text(`\u2193 ${colTotals[j]}`);
    }

    // Y-axis labels
    g.selectAll('.y-label')
      .data(plotlineNames)
      .enter()
      .append('text')
      .attr('x', -6)
      .attr('y', (_, i) => i * cellSize + cellSize / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'central')
      .attr('fill', fg)
      .attr('font-size', '16px')
      .text((d) => d);

    // X-axis labels — horizontal, truncated
    g.selectAll('.x-label')
      .data(plotlineNames)
      .enter()
      .append('text')
      .attr('x', (_, i) => i * cellSize + cellSize / 2)
      .attr('y', n * cellSize + totalRowH + 16)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'hanging')
      .attr('fill', fg)
      .attr('font-size', '16px')
      .text((d) => d.length > 12 ? d.slice(0, 11) + '\u2026' : d)
      .append('title')
      .text((d) => d);

    // Color scale legend
    const legendH = n * cellSize;
    const legendW = 16;
    const legendX = n * cellSize + totalColW + 10;
    const legendSteps = 10;
    for (let i = 0; i < legendSteps; i++) {
      const val = maxVal * (1 - i / legendSteps);
      g.append('rect')
        .attr('x', legendX)
        .attr('y', (i / legendSteps) * legendH)
        .attr('width', legendW)
        .attr('height', legendH / legendSteps + 1)
        .attr('fill', colorScale(val));
    }
    g.append('text').attr('x', legendX + legendW + 6).attr('y', 4)
      .attr('fill', fg).attr('font-size', '16px').attr('dominant-baseline', 'hanging').text(maxVal);
    g.append('text').attr('x', legendX + legendW + 6).attr('y', legendH)
      .attr('fill', fg).attr('font-size', '16px').attr('dominant-baseline', 'auto').text('0');
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
    min-height: 400px;
  }
</style>
