<script>
  import { createEventDispatcher } from 'svelte';
  import EventCard from './EventCard.svelte';
  import { sortedPlotlines, sortedEpisodes, selectedChars, activeFunctions, isLoading } from '$lib/stores/app.js';
  import { plotlineCharacters, resolveCharacterName, isGuest } from '$lib/helpers.js';

  export let data;
  export let cast;

  const dispatch = createEventDispatcher();

  // Build event grid lookup: (plotlineId, episodeCode) -> events[]
  $: eventGrid = buildEventGrid(data, $selectedChars, $activeFunctions);

  function buildEventGrid(data, selectedChars, activeFns) {
    const grid = new Map();
    if (!data?.episodes) return grid;

    const hasCharFilter = selectedChars.size > 0;
    const hasFnFilter = activeFns.size > 0;

    for (const ep of data.episodes) {
      for (const event of ep.events || []) {
        const storyline = event.plotline_id || event.plotline || event.storyline;
        if (!storyline) continue;

        // Filter by active function types
        if (hasFnFilter && !activeFns.has(event.function)) continue;

        // Filter by selected characters
        if (hasCharFilter) {
          const eventChars = event.characters || [];
          const hasMatch = eventChars.some((c) => selectedChars.has(c));
          if (!hasMatch) continue;
        }

        const key = `${storyline}|${ep.episode}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(event);
      }
    }
    return grid;
  }

  function getEvents(plotlineId, episodeCode) {
    return eventGrid.get(`${plotlineId}|${episodeCode}`) || [];
  }

  function getPlotlineChars(plotlineId) {
    return plotlineCharacters(data, plotlineId);
  }

  function truncateTheme(theme) {
    if (!theme) return '';
    return theme.length > 80 ? theme.slice(0, 80) + '\u2026' : theme;
  }
</script>

{#if $isLoading}
  <div class="grid-container">
    <p style="padding: 2rem; text-align: center;">Loading...</p>
  </div>
{:else if data}
  <div class="grid-container">
    <table class="timeline-grid">
      <thead>
        <tr>
          <th class="sticky-col header-cell">Plotline</th>
          {#each $sortedEpisodes as ep}
            <th class="header-cell">
              <div class="ep-code">{ep.episode}</div>
              <div class="ep-theme">Theme: {truncateTheme(ep.theme)}</div>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each $sortedPlotlines as pl}
          <tr>
            <td
              class="sticky-col plotline-cell"
              on:click={() => dispatch('selectPlotline', pl)}
              on:keydown={(e) => e.key === 'Enter' && dispatch('selectPlotline', pl)}
              role="button"
              tabindex="0"
            >
              <div class="plotline-name">{pl.name}</div>
              <span class="rank-badge rank-{pl.rank.toLowerCase()}">{pl.rank}</span>
              <div class="plotline-characters">
                {#each getPlotlineChars(pl.id) as charId, i}
                  <span class:guest-char={isGuest(charId)}
                    >{resolveCharacterName(charId, cast)}</span
                  >{#if i < getPlotlineChars(pl.id).length - 1},&nbsp;{/if}
                {/each}
              </div>
            </td>
            {#each $sortedEpisodes as ep}
              {@const events = eventGrid.get(`${pl.id}|${ep.episode}`) || []}
              <td class="event-cell" class:empty-cell={events.length === 0}>
                {#each events as event}
                  <EventCard {event} on:select={() => dispatch('selectEvent', { event, episode: ep.episode })} />
                {/each}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
