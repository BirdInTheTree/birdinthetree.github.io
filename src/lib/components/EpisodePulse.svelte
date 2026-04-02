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
        const id = ev.plotline || ev.storyline || ev.plotline_id;
        if (id in counts) counts[id]++;
      }

      const total = Object.values(counts).reduce((a, b) => a + b, 0);

      // Sort segments by count descending
      const segments = plIds
        .filter(id => counts[id] > 0)
        .map(id => ({
          id,
          name: plNames[id],
          count: counts[id],
          color: colorMap[id] || 'var(--accent)'
        }))
        .sort((a, b) => b.count - a.count);

      return {
        code: ep.episode,
        theme: ep.theme || '',
        total,
        segments
      };
    });
  }

  $: maxTotal = Math.max(...rows.map(r => r.total), 1);

  // Unique plotlines that appear in at least one episode (for legend)
  $: legendItems = (() => {
    const seen = new Set();
    const items = [];
    for (const row of rows) {
      for (const seg of row.segments) {
        if (!seen.has(seg.id)) {
          seen.add(seg.id);
          items.push({ id: seg.id, name: seg.name, color: seg.color });
        }
      }
    }
    return items;
  })();
</script>

<div class="episode-pulse">
  {#each rows as row}
    <div class="pulse-row">
      <div class="pulse-ep">{row.code.replace(/S\d+E/, 'E')}</div>
      <div class="pulse-bars-wrap">
        <div class="pulse-bars" style="width: {(row.total / maxTotal) * 100}%;">
          {#each row.segments as seg}
            <div
              class="pulse-bar"
              style="flex: {seg.count}; background: {seg.color}; color: {isDarkColor(seg.color) ? '#ffffff' : '#1a1a1a'};"
              title="{seg.name}: {seg.count}"
            >
              {#if seg.count >= 2}{seg.count}{/if}
            </div>
          {/each}
        </div>
      </div>
      <div class="pulse-total">{row.total}</div>
      <div class="pulse-theme">{row.theme}</div>
    </div>
  {/each}

  <div class="pulse-legend">
    {#each legendItems as item}
      <div class="pulse-legend-item">
        <span class="pulse-legend-dot" style="background: {item.color};"></span>
        {item.name}
      </div>
    {/each}
  </div>
</div>

<style>
  .pulse-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .pulse-ep {
    font-size: 1rem;
    color: var(--text);
    width: 35px;
    text-align: right;
    flex-shrink: 0;
  }

  .pulse-bars-wrap {
    flex: 1;
  }

  .pulse-bars {
    display: flex;
    gap: 2px;
    height: 28px;
  }

  .pulse-bar {
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    min-width: 14px;
  }

  .pulse-total {
    font-size: 0.875rem;
    color: var(--text-muted);
    width: 30px;
    text-align: right;
    flex-shrink: 0;
  }

  .pulse-theme {
    font-size: 1rem;
    color: var(--text-muted);
    width: 200px;
    text-align: left;
    flex-shrink: 0;
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pulse-legend {
    display: flex;
    gap: 12px;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  .pulse-legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 1rem;
    color: var(--text-muted);
  }

  .pulse-legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
</style>
