<script>
  import { createEventDispatcher } from 'svelte';
  import EventCard from './EventCard.svelte';
  import { sortedPlotlines, sortedEpisodes, selectedChars, activeFunctions, isLoading, plotlineStats } from '$lib/stores/app.js';
  import { plotlineCharacters, resolveCharacterName, isGuest } from '$lib/helpers.js';

  const MAX_CHARS = 3;

  export let data;
  export let cast;
  export let editable = false;
  export let mergeMode = false;
  export let mergeSelection = [];

  const dispatch = createEventDispatcher();

  // Build event grid lookup: (plotlineId, episodeCode) -> events[]
  $: eventGrid = buildEventGrid(data, $selectedChars, $activeFunctions);

  function buildEventGrid(data, selectedChars, activeFns) {
    const grid = new Map();
    if (!data?.episodes) return grid;

    const hasCharFilter = selectedChars.size > 0;
    const hasFnFilter = activeFns.size > 0;

    for (const ep of data.episodes) {
      for (let idx = 0; idx < (ep.events || []).length; idx++) {
        const event = ep.events[idx];
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
        grid.get(key).push({ event, idx });
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
              class:merge-selected={mergeMode && mergeSelection.includes(pl.id)}
              on:click={() => dispatch('selectPlotline', pl)}
              on:keydown={(e) => e.key === 'Enter' && dispatch('selectPlotline', pl)}
              role="button"
              tabindex="0"
            >
              <div class="plotline-name">{pl.name}</div>
              {#if $plotlineStats.has(pl.id)}
                {@const stats = $plotlineStats.get(pl.id)}
                {@const chars = getPlotlineChars(pl.id)}
                <div class="plotline-stats" title="Rank | Span | Events (primary +affected)">
                  <span class="rank-badge rank-{pl.rank.toLowerCase()}">{pl.rank}</span>{#if pl.computed_rank && pl.reviewed_rank && pl.computed_rank !== pl.reviewed_rank}<span class="rank-badge rank-{pl.computed_rank.toLowerCase()} rank-computed">/{pl.computed_rank}</span>{/if}
                  <span class="stat-sep">|</span>
                  <span class="stat-num">{stats.span}/{stats.totalEpisodes}</span>
                  <span class="stat-sep">|</span>
                  <span class="stat-num">{stats.events + stats.affected}{#if stats.affected > 0}<span class="stat-detail">({stats.events}+{stats.affected})</span>{/if}</span>
                </div>
                <div class="plotline-characters">
                  {#each chars.slice(0, MAX_CHARS) as charId, i}
                    <span class:guest-char={isGuest(charId)}>{resolveCharacterName(charId, cast)}</span>{#if i < Math.min(chars.length, MAX_CHARS) - 1},&nbsp;{/if}
                  {/each}
                  {#if chars.length > MAX_CHARS}
                    <span class="chars-more">+{chars.length - MAX_CHARS}</span>
                  {/if}
                </div>
              {/if}
            </td>
            {#each $sortedEpisodes as ep}
              {@const events = eventGrid.get(`${pl.id}|${ep.episode}`) || []}
              <td
                class="event-cell"
                class:empty-cell={events.length === 0}
                class:clickable-empty={editable && events.length === 0}
                on:click={() => {
                  if (editable && events.length === 0) {
                    dispatch('addEvent', { episode: ep.episode, plotlineId: pl.id });
                  }
                }}
                on:keydown={() => {}}
                role={editable && events.length === 0 ? 'button' : undefined}
                tabindex={editable && events.length === 0 ? 0 : undefined}
              >
                {#each events as entry}
                  <EventCard event={entry.event} on:select={() => dispatch('selectEvent', { event: entry.event, episode: ep.episode, eventIndex: entry.idx })} />
                {/each}
                {#if editable && events.length === 0}
                  <span class="add-hint">+</span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
