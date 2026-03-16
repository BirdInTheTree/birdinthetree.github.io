<script>
  import { onMount } from 'svelte';
  import { loadManifest, loadSeriesData } from '$lib/data/index.js';
  import {
    manifest,
    currentSeries,
    seriesData,
    isLoading,
    selectedChars,
    activeFunctions,
    theme
  } from '$lib/stores/app.js';
  import SeriesSelect from '$lib/components/SeriesSelect.svelte';
  import Filters from '$lib/components/Filters.svelte';
  import Grid from '$lib/components/Grid.svelte';

  $: cast = $seriesData?.cast || [];

  // Load new series data when currentSeries changes
  $: if ($currentSeries) {
    loadCurrentSeries($currentSeries);
  }

  async function loadCurrentSeries(slug) {
    const entry = $manifest.find((s) => s.slug === slug);
    if (!entry) return;

    isLoading.set(true);
    // Clear filters on series change
    selectedChars.set(new Set());
    activeFunctions.set(new Set());

    const data = await loadSeriesData(entry.file);
    seriesData.set(data);
    isLoading.set(false);
  }

  function toggleTheme() {
    theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  onMount(async () => {
    const items = await loadManifest();
    manifest.set(items);
    if (items.length > 0) {
      currentSeries.set(items[0].slug);
    }
  });
</script>

<svelte:head>
  <title>Plotter App</title>
</svelte:head>

<div class="page">
  <div class="sticky-top">
    <div class="toolbar">
      <h1>Plotter</h1>
      <div class="toolbar-actions">
        <SeriesSelect />
        <a href="/plotter-app/analytics" class="btn">Analytics</a>
        <button class="btn" on:click={toggleTheme}>
          {$theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>
    </div>

    {#if $seriesData}
      <Filters data={$seriesData} {cast} />
    {/if}
  </div>

  <Grid data={$seriesData} {cast} />
</div>
