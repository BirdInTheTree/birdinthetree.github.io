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
  import CharacterNetwork from '$lib/components/CharacterNetwork.svelte';

  import { buildPlotlineSpan } from '$lib/charts/plotlineSpan.js';
  import { buildEpisodeBalance } from '$lib/charts/episodeBalance.js';
  import { buildTensionCurves } from '$lib/charts/tensionCurves.js';
  import { buildFunctionDistribution } from '$lib/charts/functionDistribution.js';

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
    // Only load manifest if not already loaded (user may come from grid page)
    if ($manifest.length === 0) {
      const items = await loadManifest();
      manifest.set(items);
      if (items.length > 0 && !$currentSeries) {
        currentSeries.set(items[0].slug);
      }
    }
  });

  $: spanChart = $seriesData ? buildPlotlineSpan($seriesData) : null;
  $: balanceChart = $seriesData ? buildEpisodeBalance($seriesData) : null;
  $: tensionChart = $seriesData ? buildTensionCurves($seriesData) : null;
  $: fnDistChart = $seriesData ? buildFunctionDistribution($seriesData) : null;

  const charts = [
    {
      key: 'span',
      title: 'Plotline Span',
      desc: 'Which episodes each plotline appears in. Wider bars mean the plotline runs through more of the season.',
      type: 'bar'
    },
    {
      key: 'balance',
      title: 'Episode Balance',
      desc: 'How many events each plotline gets per episode. Uneven distribution can reveal episodes dominated by a single plotline.',
      type: 'bar'
    },
    {
      key: 'tension',
      title: 'Tension Curves',
      desc: 'Narrative intensity per plotline across episodes, based on event function weights (setup=1, escalation=2, turning point=3, climax=4).',
      type: 'line'
    },
    {
      key: 'convergence',
      title: 'Convergence Map',
      desc: 'Where plotlines intersect via shared events (also_affects links). Clusters of convergence often mark key turning points.',
      type: 'd3-heatmap'
    },
    {
      key: 'fnDist',
      title: 'Function Distribution',
      desc: 'Breakdown of narrative functions across the season. A healthy season arc typically starts heavy on setup and ends heavy on climax/resolution.',
      type: 'bar'
    },
    {
      key: 'network',
      title: 'Character Network',
      desc: 'How often characters appear together in events. Thicker lines mean more shared scenes.',
      type: 'd3-force'
    }
  ];

  function getChartConfig(key) {
    if (key === 'span') return spanChart;
    if (key === 'balance') return balanceChart;
    if (key === 'tension') return tensionChart;
    if (key === 'fnDist') return fnDistChart;
    return null;
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
            {:else if chart.type === 'd3-force'}
              <CharacterNetwork data={$seriesData} />
            {:else}
              {@const cfg = getChartConfig(chart.key)}
              {#if cfg}
                <ChartCanvas
                  type={chart.key === 'tension' ? 'line' : 'bar'}
                  data={cfg.data}
                  options={cfg.options}
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
