<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { theme } from '$lib/stores/app.js';

  export let data = null;

  let container;
  let simulation = null;
  let mounted = false;

  function stopSimulation() {
    if (simulation) {
      simulation.stop();
      simulation = null;
    }
  }

  function render() {
    if (!browser || !container || !data) return;
    stopSimulation();

    import('d3').then((d3) => {
      drawNetwork(d3, data);
    });
  }

  function drawNetwork(d3, seriesData) {
    container.innerHTML = '';

    const cast = {};
    for (const c of seriesData.cast || []) {
      cast[c.id] = c.name;
    }

    // Count character co-occurrences within the same event
    const charTotal = {};
    const cooccurrence = {};

    for (const ep of seriesData.episodes || []) {
      for (const ev of ep.events || []) {
        const chars = ev.characters || [];
        for (const ch of chars) {
          charTotal[ch] = (charTotal[ch] || 0) + 1;
        }
        // Pairwise co-occurrence
        for (let i = 0; i < chars.length; i++) {
          for (let j = i + 1; j < chars.length; j++) {
            const key = [chars[i], chars[j]].sort().join('|');
            cooccurrence[key] = (cooccurrence[key] || 0) + 1;
          }
        }
      }
    }

    // Only include characters with 2+ appearances
    const activeChars = Object.keys(charTotal).filter((ch) => charTotal[ch] >= 2);
    const activeSet = new Set(activeChars);

    const nodes = activeChars.map((ch) => ({
      id: ch,
      label: cast[ch] || ch,
      total: charTotal[ch]
    }));

    const links = [];
    for (const [key, weight] of Object.entries(cooccurrence)) {
      const [a, b] = key.split('|');
      if (activeSet.has(a) && activeSet.has(b)) {
        links.push({ source: a, target: b, weight });
      }
    }

    if (nodes.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? '#a9b1d6' : '#1a1a1a';
    const bg = isDark ? '#1a1b26' : '#ffffff';
    const nodeColor = isDark ? '#7aa2f7' : '#3498DB';
    const linkColor = isDark ? '#565f89' : '#bbb';

    const width = 600;
    const height = Math.max(400, nodes.length * 30);

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('background', bg);

    const maxWeight = Math.max(1, ...links.map((l) => l.weight));

    const linkElements = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', linkColor)
      .attr('stroke-width', (d) => Math.max(1, (d.weight / maxWeight) * 6))
      .attr('stroke-opacity', (d) => Math.min(0.8, 0.2 + d.weight * 0.1));

    // Tooltip on links
    linkElements.append('title')
      .text((d) => {
        const src = cast[d.source.id || d.source] || d.source.id || d.source;
        const tgt = cast[d.target.id || d.target] || d.target.id || d.target;
        return `${src} — ${tgt}: ${d.weight} shared events`;
      });

    const maxTotal = Math.max(1, ...nodes.map((n) => n.total));
    const radiusScale = d3.scaleSqrt().domain([1, maxTotal]).range([6, 22]);

    const nodeElements = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => radiusScale(d.total))
      .attr('fill', nodeColor)
      .attr('stroke', bg)
      .attr('stroke-width', 1.5)
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    nodeElements.append('title')
      .text((d) => `${d.label}: ${d.total} appearances`);

    const labelElements = svg.append('g')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text((d) => d.label)
      .attr('fill', fg)
      .attr('font-size', '11px')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => radiusScale(d.total) + 14);

    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d) => radiusScale(d.total) + 5))
      .on('tick', () => {
        linkElements
          .attr('x1', (d) => d.source.x)
          .attr('y1', (d) => d.source.y)
          .attr('x2', (d) => d.target.x)
          .attr('y2', (d) => d.target.y);
        nodeElements
          .attr('cx', (d) => d.x)
          .attr('cy', (d) => d.y);
        labelElements
          .attr('x', (d) => d.x)
          .attr('y', (d) => d.y);
      });
  }

  onMount(() => {
    mounted = true;
    render();
  });

  onDestroy(() => {
    stopSimulation();
    unsubTheme();
  });

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
