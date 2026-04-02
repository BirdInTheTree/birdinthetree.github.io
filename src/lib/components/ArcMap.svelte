<script>
  import { sortPlotlines, buildColorMap, isDarkColor } from '$lib/charts/helpers.js';
  import { FUNCTION_TENSION } from '$lib/charts/constants.js';

  export let data;

  $: plotlines = data?.plotlines ? sortPlotlines(data.plotlines) : [];
  $: colorMap = data?.plotlines ? buildColorMap(data.plotlines) : {};
  $: episodes = data?.episodes || [];
  $: grid = buildGrid(plotlines, episodes);

  // Grid columns: 1 for labels + N for episodes
  $: gridCols = `200px repeat(${episodes.length}, 1fr)`;

  /**
   * Build tension grid: for each plotline x episode, compute average tension and event count.
   * Returns { cells: { "plId|epCode": { tension, count } }, maxEvents }
   */
  function buildGrid(plotlines, episodes) {
    const cells = {};
    let maxEvents = 0;

    for (const pl of plotlines) {
      for (const ep of episodes) {
        const key = `${pl.id}|${ep.episode}`;
        const events = (ep.events || []).filter(
          ev => (ev.plotline || ev.storyline || ev.plotline_id) === pl.id
        );

        const count = events.length;
        if (count > maxEvents) maxEvents = count;

        if (count === 0) {
          cells[key] = { tension: 0, count: 0 };
          continue;
        }

        let totalTension = 0;
        for (const ev of events) {
          const fn = ev.function || ev.plot_fn;
          totalTension += FUNCTION_TENSION[fn] ?? 1;
        }
        cells[key] = { tension: totalTension / count, count };
      }
    }
    return { cells, maxEvents };
  }

  /** Map tension value to a Tokyo Night background color (30-35% opacity). */
  function tensionBg(tension) {
    if (tension <= 0) return 'transparent';
    if (tension <= 1.2) return '#73daca30';
    if (tension <= 1.8) return '#9ece6a30';
    if (tension <= 2.2) return '#e0af6830';
    if (tension <= 2.5) return '#ff9e6430';
    if (tension <= 2.8) return '#f7768e30';
    if (tension <= 3.0) return '#db4b4b35';
    return '#bb9af735';
  }

  /** Map tension value to a Tokyo Night circle color. */
  function tensionCircle(tension) {
    if (tension <= 0) return 'transparent';
    if (tension <= 1.2) return '#73daca';
    if (tension <= 1.8) return '#9ece6a';
    if (tension <= 2.2) return '#e0af68';
    if (tension <= 2.5) return '#ff9e64';
    if (tension <= 2.8) return '#f7768e';
    if (tension <= 3.0) return '#db4b4b';
    return '#bb9af7';
  }

  /** Circle diameter: 14px min, 44px max, linear by event count. */
  function circleSize(count, maxEvents) {
    if (count === 0 || maxEvents === 0) return 0;
    return 14 + (count / maxEvents) * 30;
  }
</script>

<!-- Legend -->
<div class="arc-legend">
  <span class="legend-label">low tension</span>
  <span class="legend-box" style="background: {tensionBg(1.0)}"></span>
  <span class="legend-box" style="background: {tensionBg(1.5)}"></span>
  <span class="legend-box" style="background: {tensionBg(2.0)}"></span>
  <span class="legend-box" style="background: {tensionBg(2.3)}"></span>
  <span class="legend-box" style="background: {tensionBg(2.6)}"></span>
  <span class="legend-box" style="background: {tensionBg(2.9)}"></span>
  <span class="legend-box" style="background: {tensionBg(3.1)}"></span>
  <span class="legend-label">high tension</span>
  <span class="legend-sep">|</span>
  <span class="legend-label">circle size = event count</span>
</div>

<!-- Heatmap grid -->
<div class="arc-grid" style="grid-template-columns: {gridCols};">
  <!-- Header row -->
  <div class="arc-header"></div>
  {#each episodes as ep}
    <div class="arc-header">{ep.episode.replace(/S\d+E/, 'E')}</div>
  {/each}

  <!-- Plotline rows -->
  {#each plotlines as pl}
    <div class="arc-label">
      <span style="color: {colorMap[pl.id] || 'var(--text)'}">{pl.name}</span>
    </div>
    {#each episodes as ep}
      {@const cell = grid.cells[`${pl.id}|${ep.episode}`]}
      <div
        class="arc-cell"
        style="background: {tensionBg(cell.tension)};"
      >
        {#if cell.count > 0}
          {@const circleColor = tensionCircle(cell.tension)}
          <span
            class="arc-circle"
            style="
              width: {circleSize(cell.count, grid.maxEvents)}px;
              height: {circleSize(cell.count, grid.maxEvents)}px;
              background: {circleColor};
              color: {isDarkColor(circleColor) ? '#c0caf5' : '#1a1b26'};
            "
          >
            {cell.count}
          </span>
        {:else}
          <span class="arc-empty">&mdash;</span>
        {/if}
      </div>
    {/each}
  {/each}

  <!-- Theme row -->
  <div class="arc-label" style="font-style: italic; color: var(--text-muted);">theme</div>
  {#each episodes as ep}
    <div class="arc-theme">{ep.theme || ''}</div>
  {/each}
</div>

<style>
  .arc-legend {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
    font-size: 1rem;
    color: var(--text-muted);
    flex-wrap: wrap;
  }

  .legend-box {
    display: inline-block;
    width: 20px;
    height: 14px;
    border-radius: 3px;
  }

  .legend-label {
    white-space: nowrap;
  }

  .legend-sep {
    color: var(--border);
    margin: 0 4px;
  }

  .arc-grid {
    display: grid;
    gap: 3px;
  }

  .arc-header {
    font-size: 0.875rem;
    color: var(--text-muted);
    text-align: center;
    padding: 4px;
  }

  .arc-label {
    font-size: 1rem;
    color: var(--text);
    text-align: right;
    padding-right: 10px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }

  .arc-cell {
    border-radius: 4px;
    padding: 4px 2px;
    text-align: center;
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .arc-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .arc-empty {
    color: var(--text-faint);
    font-size: 0.875rem;
  }

  .arc-theme {
    font-size: 0.875rem;
    color: var(--text-muted);
    font-style: italic;
    text-align: center;
    padding: 4px 2px;
    line-height: 1.3;
  }
</style>
