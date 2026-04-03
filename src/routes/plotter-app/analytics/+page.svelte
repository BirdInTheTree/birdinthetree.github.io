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
    <nav class="section-nav">
      <a href="#scorecard">Scorecard</a>
      <a href="#arc-map">Arc Map</a>
      <a href="#pulse">Episode Pulse</a>
      <a href="#convergence">Convergence</a>
      <a href="#characters">Characters</a>
    </nav>
    <div class="analytics-sections">
      <section class="chart-card" id="scorecard">
        <div class="chart-card-header">
          <h2 class="chart-title">Season Scorecard</h2>
          <p class="chart-description">What is this season about, and what are its building blocks?</p>
        </div>
        <div class="chart-body">
          <Scorecard data={$seriesData} />
        </div>
      </section>

      <section class="chart-card" id="arc-map">
        <div class="chart-card-header">
          <h2 class="chart-title">Arc Map</h2>
          <p class="chart-description">Where does tension rise and fall for each plotline across episodes?</p>
        </div>
        <div class="chart-body">
          <ArcMap data={$seriesData} />
        </div>
      </section>

      <section class="chart-card" id="pulse">
        <div class="chart-card-header">
          <h2 class="chart-title">Episode Pulse</h2>
          <p class="chart-description">How balanced is each episode? Which plotlines dominate?</p>
        </div>
        <div class="chart-body">
          <EpisodePulse data={$seriesData} />
        </div>
      </section>

      <section class="chart-card" id="convergence">
        <div class="chart-card-header">
          <h2 class="chart-title">Convergence Moments</h2>
          <p class="chart-description">Where do storylines collide? What are the key dramatic intersections?</p>
        </div>
        <div class="chart-body">
          <ConvergenceMoments data={$seriesData} />
        </div>
      </section>

      <section class="chart-card" id="characters">
        <div class="chart-card-header">
          <h2 class="chart-title">Character Weight</h2>
          <p class="chart-description">Who carries the story? How are characters distributed across plotlines?</p>
        </div>
        <div class="chart-body">
          <CharacterWeight data={$seriesData} />
        </div>
      </section>
    </div>
  {:else}
    <p>Select a series to view analytics.</p>
  {/if}
</div>

<style>
  .section-nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .section-nav a {
    color: var(--accent);
    text-decoration: none;
    font-size: 1rem;
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
  }

  .section-nav a:hover {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
  }

  .analytics-sections {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
</style>
