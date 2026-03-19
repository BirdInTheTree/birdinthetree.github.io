<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { theme } from '$lib/stores/app.js';
  import { sortPlotlines, buildColorMap, buildCastMap } from '$lib/charts/helpers.js';
  import { RANK_ORDER } from '$lib/charts/constants.js';

  export let data = null;

  let container;
  let mounted = false;

  function render() {
    if (!browser || !container || !data) return;

    import('d3').then((d3) => {
      drawNetwork(d3, data);
    });
  }

  /**
   * Bipartite character-storyline network matching the Python implementation.
   * Characters on the left, storylines on the right.
   * Edge weight = number of events where character appears in that storyline.
   */
  function drawNetwork(d3, seriesData) {
    container.innerHTML = '';

    const cast = buildCastMap(seriesData);
    const plotlines = sortPlotlines(seriesData.plotlines || []);
    const plMap = {};
    for (const p of plotlines) plMap[p.id] = p;
    const colors = buildColorMap(plotlines);

    // Count character appearances per storyline
    const charStoryCounts = {};
    const charTotal = {};

    for (const ep of seriesData.episodes || []) {
      for (const ev of ep.events || []) {
        const sl = ev.storyline;
        if (!sl) continue;
        for (const ch of ev.characters || []) {
          if (!charStoryCounts[ch]) charStoryCounts[ch] = {};
          charStoryCounts[ch][sl] = (charStoryCounts[ch][sl] || 0) + 1;
          charTotal[ch] = (charTotal[ch] || 0) + 1;
        }
      }
    }

    // Only characters with 2+ total appearances
    const activeChars = Object.keys(charTotal).filter((ch) => charTotal[ch] >= 2);
    const activeStorylines = plotlines.map((p) => p.id);

    if (activeChars.length === 0) return;

    // Build edges
    const edges = [];
    for (const ch of activeChars) {
      for (const sl of activeStorylines) {
        const w = (charStoryCounts[ch] || {})[sl] || 0;
        if (w > 0) {
          edges.push({ char: ch, story: sl, weight: w });
        }
      }
    }

    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#a9b1d6' : '#1a1a1a';
    const bg = isDark ? '#1a1b26' : '#ffffff';
    const charColor = '#3498DB';
    const rankColors = { A: '#E74C3C', B: '#F39C12', C: '#95A5A6', runner: '#BDC3C7' };

    // Layout: characters on left (x=0), storylines on right (x=3)
    const charSpacing = 1;
    const storySpacing = activeChars.length / Math.max(activeStorylines.length, 1);
    const margin = { top: 40, right: 180, bottom: 20, left: 180 };
    const plotWidth = 400;
    const plotHeight = Math.max(300, activeChars.length * 35);
    const width = margin.left + plotWidth + margin.right;
    const height = margin.top + plotHeight + margin.bottom;

    const charPositions = {};
    activeChars.forEach((ch, i) => {
      charPositions[ch] = {
        x: margin.left,
        y: margin.top + i * (plotHeight / Math.max(activeChars.length - 1, 1))
      };
    });

    const storyPositions = {};
    activeStorylines.forEach((sl, i) => {
      storyPositions[sl] = {
        x: margin.left + plotWidth,
        y: margin.top + i * storySpacing * (plotHeight / Math.max(activeChars.length - 1, 1))
      };
    });

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('background', bg);

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', fg)
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('Character\u2013Storyline Network \u2014 who drives what');

    // Draw edges
    for (const edge of edges) {
      const cp = charPositions[edge.char];
      const sp = storyPositions[edge.story];
      if (!cp || !sp) continue;

      const alpha = Math.min(0.8, 0.2 + edge.weight * 0.1);
      const lineWidth = Math.max(0.5, edge.weight * 0.6);

      svg.append('line')
        .attr('x1', cp.x)
        .attr('y1', cp.y)
        .attr('x2', sp.x)
        .attr('y2', sp.y)
        .attr('stroke', colors[edge.story] || '#999')
        .attr('stroke-opacity', alpha)
        .attr('stroke-width', lineWidth);
    }

    // Draw character nodes (circles on left)
    for (const ch of activeChars) {
      const pos = charPositions[ch];
      const total = charTotal[ch];
      const r = Math.max(6, Math.sqrt(total * 40 / Math.PI));

      svg.append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', r)
        .attr('fill', charColor)
        .attr('stroke', 'white')
        .attr('stroke-width', 1.5)
        .append('title')
        .text(`${cast[ch] || ch}: ${total} appearances`);

      svg.append('text')
        .attr('x', pos.x - r - 6)
        .attr('y', pos.y)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'central')
        .attr('fill', fg)
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text(cast[ch] || ch);
    }

    // Draw storyline nodes (squares on right)
    for (const sl of activeStorylines) {
      const pos = storyPositions[sl];
      if (!pos) continue;
      const rank = plMap[sl]?.rank || 'C';
      const color = rankColors[rank] || '#95A5A6';
      const size = 18;

      svg.append('rect')
        .attr('x', pos.x - size / 2)
        .attr('y', pos.y - size / 2)
        .attr('width', size)
        .attr('height', size)
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 1.5)
        .append('title')
        .text(`${plMap[sl]?.name || sl} [${rank}]`);

      svg.append('text')
        .attr('x', pos.x + size / 2 + 6)
        .attr('y', pos.y)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'central')
        .attr('fill', fg)
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text(`${plMap[sl]?.name || sl} [${rank}]`);
    }

    // Legend for rank colors
    const usedRanks = [...new Set(plotlines.map((p) => p.rank).filter(Boolean))];
    const legendY = height - margin.bottom - usedRanks.length * 20;
    const legendX = width - margin.right + 20;

    usedRanks.forEach((rank, i) => {
      const y = legendY + i * 20;
      svg.append('rect')
        .attr('x', legendX)
        .attr('y', y - 6)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', rankColors[rank] || '#95A5A6');

      svg.append('text')
        .attr('x', legendX + 18)
        .attr('y', y)
        .attr('dominant-baseline', 'central')
        .attr('fill', fg)
        .attr('font-size', '16px')
        .text(`Rank ${rank}`);
    });
  }

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

<div bind:this={container} class="character-network"></div>

<style>
  .character-network {
    width: 100%;
    overflow-x: auto;
    min-height: 400px;
  }
  .character-network :global(svg) {
    max-width: 100%;
  }
</style>
