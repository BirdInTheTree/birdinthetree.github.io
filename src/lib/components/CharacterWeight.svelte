<script>
  import { buildCastMap, isDarkColor } from '$lib/charts/helpers.js';

  export let data;

  $: castMap = data ? buildCastMap(data) : {};
  $: characters = buildCharacters(data, castMap);

  function buildCharacters(data, castMap) {
    if (!data?.episodes) return [];

    // Count events and plotlines per character
    const charEvents = {};
    const charPlotlines = {};

    for (const ep of data.episodes) {
      for (const ev of ep.events || []) {
        const plId = ev.plotline_id || ev.plotline || ev.storyline;
        for (const charId of ev.characters || []) {
          charEvents[charId] = (charEvents[charId] || 0) + 1;
          if (!charPlotlines[charId]) charPlotlines[charId] = new Set();
          if (plId) charPlotlines[charId].add(plId);
        }
      }
    }

    return Object.entries(charEvents)
      .filter(([, count]) => count >= 2)
      .map(([id, count]) => ({
        id,
        name: castMap[id] || id,
        events: count,
        plotlineCount: charPlotlines[id]?.size || 0
      }))
      .sort((a, b) => b.events - a.events);
  }

  $: maxEvents = characters.length > 0 ? characters[0].events : 1;
</script>

<div class="character-weight">
  {#each characters as char}
    <div class="char-row">
      <div class="char-name">{char.name}</div>
      <div class="bar-container">
        <div
          class="bar"
          style="width: {(char.events / maxEvents) * 100}%;"
        >
          <span class="bar-count">{char.events}</span>
        </div>
      </div>
      <div class="plotline-dots" title="{char.plotlineCount} plotlines">
        {#each Array(char.plotlineCount) as _}
          <span class="dot"></span>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .character-weight {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .char-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .char-name {
    flex-shrink: 0;
    width: 130px;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text);
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bar-container {
    flex: 1;
    min-width: 0;
  }

  .bar {
    display: flex;
    align-items: center;
    min-height: 22px;
    background: var(--accent);
    border-radius: 3px;
    padding: 0 0.4rem;
    transition: width 0.2s;
  }

  .bar-count {
    font-size: 0.72rem;
    font-weight: 700;
    color: #fff;
  }

  :global(:root:not(.dark)) .bar-count {
    color: #fff;
  }

  .plotline-dots {
    flex-shrink: 0;
    display: flex;
    gap: 3px;
    align-items: center;
    min-width: 40px;
  }

  .dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--text-faint);
  }
</style>
