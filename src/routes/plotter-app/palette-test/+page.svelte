<script>
  import { onMount } from 'svelte';
  import { loadManifest, loadSeriesData } from '$lib/data/index.js';
  import { manifest, currentSeries, seriesData, isLoading } from '$lib/stores/app.js';
  import { ALL_FUNCTIONS } from '$lib/charts/constants.js';
  import { sortPlotlines } from '$lib/charts/helpers.js';

  const PALETTES = {
    wong: {
      name: 'Wong 2011 (Nature)',
      colors: {
        setup: '#999999',
        inciting_incident: '#56B4E9',
        escalation: '#E69F00',
        turning_point: '#0072B2',
        crisis: '#D55E00',
        climax: '#CC79A7',
        resolution: '#009E73'
      }
    },
    dark2: {
      name: 'ColorBrewer Dark2',
      colors: {
        setup: '#a6761d',
        inciting_incident: '#1b9e77',
        escalation: '#e6ab02',
        turning_point: '#7570b3',
        crisis: '#d95f02',
        climax: '#e7298a',
        resolution: '#66a61e'
      }
    },
    tableau: {
      name: 'Tableau 10',
      colors: {
        setup: '#76b7b2',
        inciting_incident: '#4e79a7',
        escalation: '#edc948',
        turning_point: '#b07aa1',
        crisis: '#f28e2b',
        climax: '#e15759',
        resolution: '#59a14f'
      }
    }
  };

  $: data = $seriesData;
  $: plotlines = data ? sortPlotlines(data.plotlines || []) : [];
  $: episodes = data ? [...(data.episodes || [])].sort((a, b) => a.episode.localeCompare(b.episode)) : [];

  onMount(async () => {
    if ($manifest.length === 0) {
      const items = await loadManifest();
      manifest.set(items);
      if (items.length > 0 && !$currentSeries) {
        currentSeries.set(items[0].slug);
      }
    }
  });

  $: if ($currentSeries) {
    loadCurrent($currentSeries);
  }

  async function loadCurrent(slug) {
    const entry = $manifest.find(s => s.slug === slug);
    if (!entry) return;
    isLoading.set(true);
    const result = await loadSeriesData(slug, entry.file);
    seriesData.set(result.data);
    isLoading.set(false);
  }

  function getEvents(pl, ep) {
    return (ep.events || []).filter(ev =>
      (ev.plotline_id || ev.plotline || ev.storyline) === pl.id
    );
  }
</script>

<svelte:head>
  <title>Palette comparison</title>
</svelte:head>

<div style="padding: 2rem; max-width: 100%;">
  <h1 style="margin-bottom: 2rem;">Palette Comparison</h1>

  {#if data}
    {#each Object.entries(PALETTES) as [key, palette]}
      <div style="margin-bottom: 3rem;">
        <h2 style="margin-bottom: 1rem;">{palette.name}</h2>

        <!-- Legend -->
        <div style="display: flex; gap: 1.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
          {#each ALL_FUNCTIONS as fn}
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 20px; height: 20px; border-radius: 50%; background: {palette.colors[fn]};"></div>
              <span style="font-size: 16px;">{fn.replace(/_/g, ' ')}</span>
            </div>
          {/each}
        </div>

        <!-- Dot chart -->
        <div style="overflow-x: auto;">
          <table style="border-collapse: separate; border-spacing: 0;">
            <thead>
              <tr>
                <th style="text-align: right; padding: 0.5rem 1rem; min-width: 180px;"></th>
                {#each episodes as ep}
                  <th style="text-align: center; padding: 0.5rem; min-width: 100px; font-size: 16px;">{ep.episode}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each plotlines as pl}
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="text-align: right; padding: 0.5rem 1rem; font-size: 16px; font-weight: bold;">{pl.name}</td>
                  {#each episodes as ep}
                    {@const events = getEvents(pl, ep)}
                    <td style="text-align: center; padding: 0.5rem; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
                        {#each events as ev}
                          <div style="width: 16px; height: 16px; border-radius: 50%; background: {palette.colors[ev.plot_fn || ev.function] || '#999'};"></div>
                        {/each}
                      </div>
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/each}
  {:else}
    <p>Loading...</p>
  {/if}
</div>
