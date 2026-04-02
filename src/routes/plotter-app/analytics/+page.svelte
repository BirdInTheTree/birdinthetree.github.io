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
  import Scorecard from '$lib/components/Scorecard.svelte';
  import ArcMap from '$lib/components/ArcMap.svelte';
  import EpisodePulse from '$lib/components/EpisodePulse.svelte';
  import ConvergenceMoments from '$lib/components/ConvergenceMoments.svelte';
  import CharacterWeight from '$lib/components/CharacterWeight.svelte';

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
    <div class="analytics-sections">
      <section class="chart-card"><Scorecard data={$seriesData} /></section>
      <section class="chart-card"><ArcMap data={$seriesData} /></section>
      <section class="chart-card"><EpisodePulse data={$seriesData} /></section>
      <section class="chart-card"><ConvergenceMoments data={$seriesData} /></section>
      <section class="chart-card"><CharacterWeight data={$seriesData} /></section>
    </div>
  {:else}
    <p>Select a series to view analytics.</p>
  {/if}
</div>

<style>
  .analytics-sections {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
</style>
