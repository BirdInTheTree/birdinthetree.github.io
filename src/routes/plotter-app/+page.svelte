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
  import PlotlineDetail from '$lib/components/PlotlineDetail.svelte';
  import EventDetail from '$lib/components/EventDetail.svelte';

  $: cast = $seriesData?.cast || [];

  let selectedPlotline = null;
  let selectedEvent = null;
  let selectedEpisode = null;

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
  <title>tvplot app</title>
</svelte:head>

<div class="page">
  <div class="sticky-top">
    <div class="toolbar">
      <h1><a href="https://github.com/BirdInTheTree/tvplotlines" class="toolbar-title-link">tvplot app</a></h1>
      <div class="toolbar-actions">
        <SeriesSelect />
        {#if $seriesData?.context?.format}
          <span class="context-badge">{$seriesData.context.format}</span>
        {/if}
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

  <Grid
    data={$seriesData}
    {cast}
    on:selectPlotline={(e) => { selectedPlotline = e.detail; }}
    on:selectEvent={(e) => { selectedEvent = e.detail.event; selectedEpisode = e.detail.episode; }}
  />
</div>

{#if selectedPlotline}
  <PlotlineDetail
    plotline={selectedPlotline}
    data={$seriesData}
    {cast}
    on:close={() => { selectedPlotline = null; }}
  />
{/if}

{#if selectedEvent}
  <EventDetail
    event={selectedEvent}
    episode={selectedEpisode}
    data={$seriesData}
    {cast}
    on:close={() => { selectedEvent = null; selectedEpisode = null; }}
  />
{/if}
