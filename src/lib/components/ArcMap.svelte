<script>
  import { sortPlotlines, buildColorMap } from '$lib/charts/helpers.js';
  import { FUNCTION_TENSION } from '$lib/charts/constants.js';
  import { theme } from '$lib/stores/app.js';

  export let data;

  $: plotlines = data?.plotlines ? sortPlotlines(data.plotlines) : [];
  $: colorMap = data?.plotlines ? buildColorMap(data.plotlines) : {};
  $: episodes = data?.episodes || [];
  $: grid = buildGrid(plotlines, episodes);

  // Grid columns: 1 for labels + N for episodes
  $: isDark = $theme === 'dark';
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

  /** Map tension value to HSL background color, theme-aware. */
  function tensionBg(tension, isDark) {
    if (tension <= 0) return 'transparent';
    if (isDark) {
      if (tension <= 1.2) return 'hsl(170, 50%, 18%)';
      if (tension <= 1.8) return 'hsl(55, 50%, 22%)';
      if (tension <= 2.2) return 'hsl(42, 55%, 23%)';
      if (tension <= 2.5) return 'hsl(35, 60%, 25%)';
      if (tension <= 2.8) return 'hsl(25, 66%, 27%)';
      if (tension <= 3.0) return 'hsl(15, 65%, 28%)';
      return 'hsl(5, 65%, 32%)';
    } else {
      if (tension <= 1.2) return 'hsl(170, 45%, 85%)';
      if (tension <= 1.8) return 'hsl(55, 50%, 85%)';
      if (tension <= 2.2) return 'hsl(42, 55%, 82%)';
      if (tension <= 2.5) return 'hsl(35, 55%, 78%)';
      if (tension <= 2.8) return 'hsl(25, 55%, 75%)';
      if (tension <= 3.0) return 'hsl(15, 55%, 72%)';
      return 'hsl(5, 55%, 68%)';
    }
  }

  /** Map tension value to HSL circle color, theme-aware. */
  function tensionCircle(tension, isDark) {
    if (tension <= 0) return 'transparent';
    if (isDark) {
      if (tension <= 1.2) return 'hsl(170, 50%, 30%)';
      if (tension <= 1.8) return 'hsl(55, 50%, 32%)';
      if (tension <= 2.2) return 'hsl(42, 55%, 35%)';
      if (tension <= 2.5) return 'hsl(35, 60%, 35%)';
      if (tension <= 2.8) return 'hsl(25, 66%, 38%)';
      if (tension <= 3.0) return 'hsl(15, 65%, 40%)';
      return 'hsl(5, 65%, 44%)';
    } else {
      if (tension <= 1.2) return 'hsl(170, 45%, 72%)';
      if (tension <= 1.8) return 'hsl(55, 50%, 72%)';
      if (tension <= 2.2) return 'hsl(42, 55%, 68%)';
      if (tension <= 2.5) return 'hsl(35, 55%, 65%)';
      if (tension <= 2.8) return 'hsl(25, 55%, 60%)';
      if (tension <= 3.0) return 'hsl(15, 55%, 55%)';
      return 'hsl(5, 55%, 50%)';
    }
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
  <span class="legend-box" style="background: {tensionBg(1.0, isDark)}"></span>
  <span class="legend-box" style="background: {tensionBg(1.5, isDark)}"></span>
  <span class="legend-box" style="background: {tensionBg(2.0, isDark)}"></span>
  <span class="legend-box" style="background: {tensionBg(2.3, isDark)}"></span>
  <span class="legend-box" style="background: {tensionBg(2.6, isDark)}"></span>
  <span class="legend-box" style="background: {tensionBg(2.9, isDark)}"></span>
  <span class="legend-box" style="background: {tensionBg(3.1, isDark)}"></span>
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
        style="background: {tensionBg(cell.tension, isDark)};"
      >
        {#if cell.count > 0}
          <span
            class="arc-circle"
            style="
              width: {circleSize(cell.count, grid.maxEvents)}px;
              height: {circleSize(cell.count, grid.maxEvents)}px;
              background: {tensionCircle(cell.tension, isDark)};
              color: {isDark ? 'var(--text)' : '#1a1a1a'};
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
