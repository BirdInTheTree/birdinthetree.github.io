<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { theme } from '$lib/stores/app.js';
  import { sortPlotlines } from '$lib/charts/helpers.js';

  export let data = null;

  let container;

  function render() {
    if (!browser || !container || !data) return;

    // Dynamic import avoids SSR issues
    import('d3').then((d3) => {
      drawHeatmap(d3, data);
    });
  }

  function drawHeatmap(d3, seriesData) {
    container.innerHTML = '';

    const plotlines = sortPlotlines(seriesData.plotlines || []);
    const plIds = plotlines.map((p) => p.id);
    const plNames = plotlines.map((p) => p.name);
    const n = plIds.length;
    const idToIdx = {};
    plIds.forEach((id, i) => { idToIdx[id] = i; });

    // Build symmetric interaction matrix
    const matrix = Array.from({ length: n }, () => Array(n).fill(0));

    for (const ep of seriesData.episodes || []) {
      // Interactions (lines arrays)
      for (const inter of ep.interactions || []) {
        const lines = (inter.lines || []).filter((l) => l in idToIdx);
        for (let i = 0; i < lines.length; i++) {
          for (let j = i + 1; j < lines.length; j++) {
            matrix[idToIdx[lines[i]]][idToIdx[lines[j]]]++;
            matrix[idToIdx[lines[j]]][idToIdx[lines[i]]]++;
          }
        }
      }
      // also_affects links
      for (const ev of ep.events || []) {
        const src = ev.storyline;
        if (!src || !(src in idToIdx) || !ev.also_affects) continue;
        for (const tgt of ev.also_affects) {
          if (tgt in idToIdx && tgt !== src) {
            matrix[idToIdx[src]][idToIdx[tgt]]++;
            matrix[idToIdx[tgt]][idToIdx[src]]++;
          }
        }
      }
    }

    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#a9b1d6' : '#1a1a1a';
    const bg = isDark ? '#1a1b26' : '#ffffff';

    const margin = { top: 40, right: 60, bottom: 160, left: 200 };
    const cellSize = Math.min(80, Math.max(50, 600 / n));
    const width = margin.left + margin.right + n * cellSize;
    const height = margin.top + margin.bottom + n * cellSize;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', bg);

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 24)
      .attr('text-anchor', 'middle')
      .attr('fill', fg)
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('Storyline Convergence — how storylines interact');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxVal = Math.max(1, ...matrix.flat());
    const colorScale = d3.scaleSequential(d3.interpolatePurples).domain([0, maxVal]);

    // Cells
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const val = matrix[i][j];
        g.append('rect')
          .attr('x', j * cellSize)
          .attr('y', i * cellSize)
          .attr('width', cellSize - 1)
          .attr('height', cellSize - 1)
          .attr('fill', val > 0 ? colorScale(val) : (isDark ? '#24283b' : '#f9fafb'))
          .attr('rx', 2)
          .append('title')
          .text(`${plNames[i]} × ${plNames[j]}: ${val}`);

        // Value label
        if (val > 0) {
          g.append('text')
            .attr('x', j * cellSize + cellSize / 2)
            .attr('y', i * cellSize + cellSize / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('fill', fg)
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .text(val);
        }
      }
    }

    // Diagonal mask
    for (let i = 0; i < n; i++) {
      g.append('rect')
        .attr('x', i * cellSize)
        .attr('y', i * cellSize)
        .attr('width', cellSize - 1)
        .attr('height', cellSize - 1)
        .attr('fill', bg)
        .attr('rx', 2);
    }

    // Y-axis labels
    g.selectAll('.y-label')
      .data(plNames)
      .enter()
      .append('text')
      .attr('x', -6)
      .attr('y', (_, i) => i * cellSize + cellSize / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'central')
      .attr('fill', fg)
      .attr('font-size', '16px')
      .text((d) => d);

    // X-axis labels — horizontal, no rotation
    g.selectAll('.x-label')
      .data(plNames)
      .enter()
      .append('text')
      .attr('x', (_, i) => i * cellSize + cellSize / 2)
      .attr('y', n * cellSize + 12)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'hanging')
      .attr('fill', fg)
      .attr('font-size', '16px')
      .text((d) => d.length > 12 ? d.slice(0, 11) + '\u2026' : d)
      .append('title')
      .text((d) => d);

    // Color scale legend (right side)
    const legendH = n * cellSize;
    const legendW = 16;
    const legendX = n * cellSize + 30;
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
    // Legend labels
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
