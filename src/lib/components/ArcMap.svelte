<script>
  import { sortPlotlines } from '$lib/charts/helpers.js';
  import { FUNCTION_TENSION, RANK_COLORS } from '$lib/charts/constants.js';
  import { theme } from '$lib/stores/app.js';

  export let data;

  $: plotlines = data?.plotlines ? sortPlotlines(data.plotlines) : [];
  $: episodes = data?.episodes || [];
  $: grid = buildGrid(plotlines, episodes);

  /**
   * Build a 2D grid: for each plotline × episode, compute tension level and event count.
   * Returns { cells: Map<"plId|epCode" -> {tension, events}>, maxEvents }
   */
  function buildGrid(plotlines, episodes) {
    const cells = {};
    let maxEvents = 0;

    for (const pl of plotlines) {
      const spanSet = new Set(pl.span || []);
      for (const ep of episodes) {
        const key = `${pl.id}|${ep.episode}`;
        const isInSpan = spanSet.has(ep.episode);

        // Collect events for this plotline in this episode
        const events = (ep.events || []).filter(
          ev => (ev.plotline_id || ev.plotline || ev.storyline) === pl.id
        );

        if (!isInSpan && events.length === 0) {
          cells[key] = { tension: 0, events: 0, inSpan: false };
          continue;
        }

        const count = events.length;
        if (count > maxEvents) maxEvents = count;

        // Weighted average tension
        let totalWeight = 0;
        let totalTension = 0;
        for (const ev of events) {
          const fn = ev.function || ev.plot_fn;
          const w = FUNCTION_TENSION[fn] ?? 1;
          totalTension += w;
          totalWeight++;
        }
        const avgTension = totalWeight > 0 ? totalTension / totalWeight : 0;

        // Map to 1-5 level
        let level;
        if (totalWeight === 0) level = 0;
        else if (avgTension <= 1.0) level = 1;
        else if (avgTension <= 2.0) level = 2;
        else if (avgTension <= 3.0) level = 3;
        else if (avgTension <= 3.5) level = 4;
        else level = 5;

        cells[key] = { tension: level, events: count, inSpan: true };
      }
    }
    return { cells, maxEvents };
  }

  function circleSize(events, maxEvents) {
    if (events === 0 || maxEvents === 0) return 0;
    // Scale from 6px to 22px
    return 6 + (events / maxEvents) * 16;
  }
</script>

<div class="arcmap">
  <div class="legend">
    <span class="legend-label">Low tension</span>
    <span class="legend-swatch t1"></span>
    <span class="legend-swatch t2"></span>
    <span class="legend-swatch t3"></span>
    <span class="legend-swatch t4"></span>
    <span class="legend-swatch t5"></span>
    <span class="legend-label">High tension</span>
    <span class="legend-sep">|</span>
    <span class="legend-circle-small"></span>
    <span class="legend-label">fewer events</span>
    <span class="legend-circle-large"></span>
    <span class="legend-label">more events</span>
  </div>

  <div class="grid-wrapper">
    <table class="heatmap">
      <thead>
        <tr>
          <th class="row-header"></th>
          {#each episodes as ep}
            <th class="col-header">{ep.episode.replace(/S\d+E/, 'E')}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each plotlines as pl}
          <tr>
            <td class="row-label">{pl.name}</td>
            {#each episodes as ep}
              {@const cell = grid.cells[`${pl.id}|${ep.episode}`]}
              <td class="cell t{cell.tension}">
                {#if cell.inSpan && cell.events > 0}
                  <span
                    class="event-circle"
                    style="width: {circleSize(cell.events, grid.maxEvents)}px; height: {circleSize(cell.events, grid.maxEvents)}px;"
                    title="{cell.events} events"
                  ></span>
                {:else if !cell.inSpan}
                  <span class="empty-mark">—</span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
        <!-- Episode themes row -->
        <tr class="theme-row">
          <td class="row-label theme-label">theme</td>
          {#each episodes as ep}
            <td class="theme-cell"><em>{ep.theme || ''}</em></td>
          {/each}
        </tr>
      </tbody>
    </table>
  </div>
</div>

<style>
  .arcmap {
    --tension-0: var(--bg-secondary);
    --tension-1: #bae6d1;
    --tension-2: #f0e68c;
    --tension-3: #f5b87a;
    --tension-4: #e87c7c;
    --tension-5: #d44a7a;
    overflow-x: auto;
  }

  :global(:root.dark) .arcmap {
    --tension-1: hsl(160, 35%, 22%);
    --tension-2: hsl(45, 45%, 28%);
    --tension-3: hsl(25, 50%, 30%);
    --tension-4: hsl(350, 50%, 32%);
    --tension-5: hsl(340, 60%, 38%);
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
    font-size: 0.78rem;
    color: var(--text-muted);
    flex-wrap: wrap;
  }

  .legend-swatch {
    display: inline-block;
    width: 18px;
    height: 12px;
    border-radius: 2px;
  }
  .legend-swatch.t1 { background: var(--tension-1); }
  .legend-swatch.t2 { background: var(--tension-2); }
  .legend-swatch.t3 { background: var(--tension-3); }
  .legend-swatch.t4 { background: var(--tension-4); }
  .legend-swatch.t5 { background: var(--tension-5); }

  .legend-sep {
    color: var(--border);
    margin: 0 0.25rem;
  }

  .legend-circle-small,
  .legend-circle-large {
    display: inline-block;
    border-radius: 50%;
    background: var(--text-muted);
  }
  .legend-circle-small { width: 8px; height: 8px; }
  .legend-circle-large { width: 16px; height: 16px; }

  .legend-label { white-space: nowrap; }

  .grid-wrapper { overflow-x: auto; }

  .heatmap {
    border-collapse: collapse;
    font-size: 0.85rem;
    width: 100%;
  }

  .col-header {
    padding: 0.4rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-align: center;
    white-space: nowrap;
  }

  .row-header { width: 140px; }

  .row-label {
    padding: 0.4rem 0.5rem;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text);
    white-space: nowrap;
    text-align: right;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cell {
    text-align: center;
    vertical-align: middle;
    padding: 0.3rem;
    min-width: 36px;
    border: 1px solid var(--border);
  }

  .t0 { background: var(--tension-0); }
  .t1 { background: var(--tension-1); }
  .t2 { background: var(--tension-2); }
  .t3 { background: var(--tension-3); }
  .t4 { background: var(--tension-4); }
  .t5 { background: var(--tension-5); }

  .event-circle {
    display: inline-block;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.35);
  }

  :global(:root.dark) .event-circle {
    background: rgba(255, 255, 255, 0.35);
  }

  .empty-mark {
    color: var(--text-faint);
    font-size: 0.75rem;
  }

  .theme-row td {
    border-top: 2px solid var(--border);
  }

  .theme-label {
    font-style: italic;
    color: var(--text-faint);
    font-weight: 400;
  }

  .theme-cell {
    font-size: 0.72rem;
    color: var(--text-muted);
    padding: 0.4rem 0.3rem;
    max-width: 80px;
    line-height: 1.3;
    text-align: center;
  }
</style>
