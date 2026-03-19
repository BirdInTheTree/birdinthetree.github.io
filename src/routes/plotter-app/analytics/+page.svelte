<script>
  import { onMount } from 'svelte';
  import { loadManifest, loadSeriesData } from '$lib/data/index.js';
  import {
    manifest,
    currentSeries,
    seriesData,
    isLoading,
    theme
  } from '$lib/stores/app.js';
  import SeriesSelect from '$lib/components/SeriesSelect.svelte';
  import ChartCanvas from '$lib/components/ChartCanvas.svelte';
  import ConvergenceMap from '$lib/components/ConvergenceMap.svelte';

  import { buildArcMap } from '$lib/charts/arcMap.js';
  import { buildEpisodeBalance } from '$lib/charts/episodeBalance.js';
  import { buildArcCompletenessChart } from '$lib/charts/arcCompleteness.js';
  import { buildPlotlineSpan } from '$lib/charts/plotlineSpan.js';

  $: if ($currentSeries) {
    loadCurrentSeries($currentSeries);
  }

  async function loadCurrentSeries(slug) {
    const entry = $manifest.find((s) => s.slug === slug);
    if (!entry) return;
    isLoading.set(true);
    const data = await loadSeriesData(entry.file);
    seriesData.set(data);
    isLoading.set(false);
  }

  function toggleTheme() {
    theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  onMount(async () => {
    if ($manifest.length === 0) {
      const items = await loadManifest();
      manifest.set(items);
      if (items.length > 0 && !$currentSeries) {
        currentSeries.set(items[0].slug);
      }
    }
  });

  $: arcMapChart = $seriesData ? buildArcMap($seriesData) : null;
  $: balanceChart = $seriesData ? buildEpisodeBalance($seriesData) : null;
  $: completenessChart = $seriesData ? buildArcCompletenessChart($seriesData) : null;
  $: spanChart = $seriesData ? buildPlotlineSpan($seriesData) : null;

  const charts = [
    {
      key: 'arcMap',
      title: 'Fractal Arc Map',
      desc: 'How each storyline develops across the season. Columns are narrative phases, rows are plotlines. Season arc (top) follows the A-storyline. Cell intensity reflects event density.',
      type: 'custom-canvas'
    },
    {
      key: 'balance',
      title: 'Episode Balance',
      desc: 'Event count per plotline per episode. Bar height shows total density — a 24-event episode towers over a 5-event one.',
      type: 'bar'
    },
    {
      key: 'convergence',
      title: 'Convergence',
      desc: 'Directed storyline interactions via also_affects links. Row → column shows how many events from source storyline affect target. Asymmetric: A→B ≠ B→A.',
      type: 'd3-heatmap'
    },
    {
      key: 'completeness',
      title: 'Arc Completeness',
      desc: 'Which narrative phases each plotline covers. Filled cells = phase present, empty = missing. Score on right shows structural completeness.',
      type: 'custom-canvas'
    },
    {
      key: 'span',
      title: 'Plotline Span',
      desc: 'Which episodes each plotline appears in. Cells show event counts. Intensity reflects rank and event density.',
      type: 'custom-canvas'
    }
  ];

  function getChartConfig(key) {
    if (key === 'arcMap') return arcMapChart;
    if (key === 'balance') return balanceChart;
    if (key === 'completeness') return completenessChart;
    if (key === 'span') return spanChart;
    return null;
  }

  /**
   * Bind custom canvas charts. Called after the canvas element is inserted
   * into the DOM. Re-renders on data or theme change.
   */
  function bindCanvas(node, config) {
    if (config?.render) config.render(node);

    return {
      update(newConfig) {
        if (newConfig?.render) newConfig.render(node);
      }
    };
  }
</script>

<svelte:head>
  <title>Analytics — Plotter</title>
</svelte:head>

<div class="page">
  <div class="toolbar">
    <h1>Analytics</h1>
    <div class="toolbar-actions">
      <SeriesSelect />
      <a href="/plotter-app" class="btn">Grid View</a>
      <button class="btn" on:click={toggleTheme}>
        {$theme === 'light' ? 'Dark' : 'Light'}
      </button>
    </div>
  </div>

  {#if $isLoading}
    <p>Loading...</p>
  {:else if $seriesData}
    <div class="charts-list">
      {#each charts as chart (chart.key)}
        <div class="chart-card">
          <div class="chart-card-header">
            <h2 class="chart-title">{chart.title}</h2>
            <p class="chart-description">{chart.desc}</p>
          </div>
          <div class="chart-body">
            {#if chart.type === 'd3-heatmap'}
              <ConvergenceMap data={$seriesData} />
            {:else if chart.type === 'custom-canvas'}
              {@const cfg = getChartConfig(chart.key)}
              {#if cfg}
                <div class="custom-canvas-wrapper">
                  <canvas use:bindCanvas={cfg}></canvas>
                </div>
              {/if}
            {:else}
              {@const cfg = getChartConfig(chart.key)}
              {#if cfg}
                <ChartCanvas
                  type="bar"
                  data={cfg.data}
                  options={cfg.options}
                  plugins={cfg.plugins}
                />
              {/if}
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <p>Select a series to view analytics.</p>
  {/if}
</div>

<style>
  .custom-canvas-wrapper {
    overflow-x: auto;
    min-height: 400px;
  }
  .custom-canvas-wrapper canvas {
    display: block;
  }
</style>
