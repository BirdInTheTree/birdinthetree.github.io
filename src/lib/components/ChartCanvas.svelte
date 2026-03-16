<script>
  import { onMount, onDestroy } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { theme } from '$lib/stores/app.js';

  Chart.register(...registerables);

  export let type = 'bar';
  export let data = { labels: [], datasets: [] };
  export let options = {};

  let canvas;
  let chart = null;
  let mounted = false;

  /** Read CSS custom properties for chart theming. */
  function getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      bg: style.getPropertyValue('--chart-bg').trim() || '#ffffff',
      fg: style.getPropertyValue('--chart-fg').trim() || '#1a1a1a',
      grid: style.getPropertyValue('--chart-grid').trim() || '#e5e7eb'
    };
  }

  /** Apply theme colors to chart options (mutates a copy). */
  function themedOptions(opts) {
    const { fg, grid } = getThemeColors();
    const merged = structuredClone(opts);

    // Apply to all scale axes
    if (merged.scales) {
      for (const axis of Object.values(merged.scales)) {
        if (!axis.ticks) axis.ticks = {};
        axis.ticks.color = fg;
        if (axis.title) axis.title.color = fg;
        if (!axis.grid) axis.grid = {};
        axis.grid.color = grid;
      }
    }

    // Legend text color
    if (merged.plugins?.legend?.labels) {
      merged.plugins.legend.labels.color = fg;
    } else if (merged.plugins?.legend) {
      merged.plugins.legend.labels = { ...merged.plugins.legend.labels, color: fg };
    }

    return merged;
  }

  function createChart() {
    if (!canvas) return;
    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type,
      data: structuredClone(data),
      options: themedOptions(options)
    });
  }

  onMount(() => {
    mounted = true;
    createChart();
  });

  onDestroy(() => {
    if (chart) chart.destroy();
    unsubTheme();
  });

  // Re-render when data or options change (skip before mount to avoid double init)
  $: if (mounted && canvas && data) {
    createChart();
  }

  // Re-render on theme change — delay lets CSS variables update first
  const unsubTheme = theme.subscribe(() => {
    if (mounted && canvas) setTimeout(createChart, 50);
  });
</script>

<div class="chart-canvas-wrapper">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-canvas-wrapper {
    position: relative;
    width: 100%;
    min-height: 300px;
  }
</style>
