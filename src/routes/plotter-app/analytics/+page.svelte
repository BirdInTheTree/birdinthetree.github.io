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

  import { buildEpisodeBalance } from '$lib/charts/episodeBalance.js';

  $: if ($currentSeries) {
    loadCurrentSeries($currentSeries);
  }

  async function loadCurrentSeries(slug) {
    const entry = $manifest.find((s) => s.slug === slug);
    if (!entry) return;
    isLoading.set(true);
    const result = await loadSeriesData(slug, entry.file);
    seriesData.set(result.data);
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

  $: balanceChart = $seriesData ? buildEpisodeBalance($seriesData) : null;
</script>

<svelte:head>
  <title>tvplot app — analytics</title>
</svelte:head>

<div class="page">
  <div class="toolbar">
    <h1><a href="https://github.com/BirdInTheTree/tvplotlines" class="toolbar-title-link">tvplot app</a> <span style="font-weight: 400; opacity: 0.6;">/ analytics</span></h1>
    <div class="toolbar-actions">
      <SeriesSelect />
      <a href="/plotter-app/" class="btn">Grid View</a>
      <button class="btn" on:click={toggleTheme}>
        {$theme === 'light' ? 'Dark' : 'Light'}
      </button>
    </div>
  </div>

  {#if $isLoading}
    <p>Loading...</p>
  {:else if $seriesData}
    <div class="charts-list">
      <div class="chart-card">
        <div class="chart-card-header">
          <h2 class="chart-title">Episode Balance</h2>
          <p class="chart-description">Event count per plotline per episode. Each color is a plotline. Bar height shows total event density.</p>
        </div>
        <div class="chart-body">
          {#if balanceChart}
            <ChartCanvas
              type="bar"
              data={balanceChart.data}
              options={balanceChart.options}
              plugins={balanceChart.plugins}
            />
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <p>Select a series to view analytics.</p>
  {/if}
</div>
