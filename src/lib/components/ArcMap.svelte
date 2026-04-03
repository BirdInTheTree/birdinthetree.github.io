<script>
  import { sortPlotlines, buildColorMap, isDarkColor } from '$lib/charts/helpers.js';
  import { FUNCTION_TENSION } from '$lib/charts/constants.js';
  import { theme } from '$lib/stores/app.js';

  export let data;

  $: isDark = $theme === 'dark';
  $: plotlines = data?.plotlines ? sortPlotlines(data.plotlines) : [];
  $: colorMap = data?.plotlines ? buildColorMap(data.plotlines, isDark) : {};
  $: episodes = data?.episodes || [];
  // isDark dependency forces re-render of tension colors on theme change
  $: grid = (isDark, buildGrid(plotlines, episodes));

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

  /**
   * Map tension value to a Tokyo Night color.
   * Dark theme uses night colors (bright), light theme uses day colors (saturated).
   */
  function tensionColor(tension) {
    if (tension <= 0) return 'transparent';

    const dark = [
      [1.2, '#73daca'], [1.8, '#9ece6a'], [2.2, '#e0af68'],
      [2.5, '#ff9e64'], [2.8, '#f7768e'], [3.0, '#db4b4b'], [Infinity, '#bb9af7']
    ];
    const light = [
      [1.2, '#387068'], [1.8, '#587539'], [2.2, '#8c6c3e'],
      [2.5, '#b15c00'], [2.8, '#f52a65'], [3.0, '#c64343'], [Infinity, '#9854f1']
    ];
    const scale = isDark ? dark : light;
    for (const [max, color] of scale) {
      if (tension <= max) return color;
    }
  }

  /** Cell background: neutral, no color. */
  function tensionBg(tension) {
    return 'transparent';
  }

  /** Circle fill: full tension color. */
  function tensionCircle(tension) {
    return tensionColor(tension);
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
  <span class="legend-circle" style="background: {tensionColor(1.0)};"></span>
  <span class="legend-circle" style="background: {tensionColor(1.5)};"></span>
  <span class="legend-circle" style="background: {tensionColor(2.0)};"></span>
  <span class="legend-circle" style="background: {tensionColor(2.5)};"></span>
  <span class="legend-circle" style="background: {tensionColor(2.8)};"></span>
  <span class="legend-circle" style="background: {tensionColor(3.0)};"></span>
  <span class="legend-circle" style="background: {tensionColor(3.5)};"></span>
  <span class="legend-label">high tension</span>
  <span class="legend-sep">|</span>
  <span class="legend-circle" style="background: var(--text-faint); width: 10px; height: 10px;"></span>
  <span class="legend-label">fewer events</span>
  <span class="legend-circle" style="background: var(--text-faint); width: 20px; height: 20px;"></span>
  <span class="legend-label">more events</span>
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
              color: {isDarkColor(circleColor) ? '#ffffff' : '#1a1b26'};
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

  .legend-circle {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
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
