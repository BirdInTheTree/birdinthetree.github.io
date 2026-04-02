<script>
  import { sortPlotlines, buildColorMap, isDarkColor } from '$lib/charts/helpers.js';

  export let data;

  $: plotlines = data?.plotlines ? sortPlotlines(data.plotlines) : [];
  $: colorMap = data?.plotlines ? buildColorMap(data.plotlines) : {};
  $: rows = buildRows(data?.episodes || [], plotlines);

  function buildRows(episodes, plotlines) {
    const plIds = plotlines.map(pl => pl.id);
    const plNames = {};
    for (const pl of plotlines) plNames[pl.id] = pl.name;

    return episodes.map(ep => {
      const counts = {};
      for (const id of plIds) counts[id] = 0;

      for (const ev of ep.events || []) {
        const id = ev.plotline_id || ev.plotline || ev.storyline;
        if (id in counts) counts[id]++;
      }

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const segments = plIds
        .filter(id => counts[id] > 0)
        .map(id => ({
          id,
          name: plNames[id],
          count: counts[id],
          color: colorMap[id] || 'var(--accent)'
        }));

      return {
        code: ep.episode,
        theme: ep.theme || '',
        total,
        segments
      };
    });
  }

  $: maxTotal = Math.max(...rows.map(r => r.total), 1);
</script>

<div class="episode-pulse">
  {#each rows as row}
    <div class="pulse-row">
      <div class="ep-label">{row.code.replace(/S\d+E/, 'E')}</div>
      <div class="bar-container">
        <div class="bar" style="width: {(row.total / maxTotal) * 100}%;">
          {#each row.segments as seg}
            <span
              class="segment"
              style="flex: {seg.count}; background: {seg.color};"
              title="{seg.name}: {seg.count}"
            >
              {#if seg.count >= 2}
                <span class="seg-count" class:light-text={isDarkColor(seg.color)}>
                  {seg.count}
                </span>
              {/if}
            </span>
          {/each}
        </div>
      </div>
      <div class="row-meta">
        <span class="total-count">{row.total}</span>
        {#if row.theme}
          <span class="ep-theme"><em>{row.theme}</em></span>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .episode-pulse {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .pulse-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ep-label {
    flex-shrink: 0;
    width: 36px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    text-align: right;
  }

  .bar-container {
    flex: 1;
    min-width: 0;
  }

  .bar {
    display: flex;
    min-height: 26px;
    border-radius: 4px;
    overflow: hidden;
  }

  .segment {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    transition: flex 0.2s;
  }

  .seg-count {
    font-size: 0.72rem;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.7);
    pointer-events: none;
  }

  .seg-count.light-text {
    color: rgba(255, 255, 255, 0.85);
  }

  .row-meta {
    flex-shrink: 0;
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    min-width: 0;
  }

  .total-count {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .ep-theme {
    font-size: 0.75rem;
    color: var(--text-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }
</style>
