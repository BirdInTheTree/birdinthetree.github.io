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

      const segments = plIds
        .filter(id => counts[id] > 0)
        .map(id => ({
          id,
          name: plNames[id],
          count: counts[id],
          color: colorMap[id] || 'var(--accent)'
        }))
        .sort((a, b) => b.count - a.count);

      return { code: ep.episode, total, segments };
    });
  }

  $: maxTotal = Math.max(...rows.map(r => r.total), 1);

  // Unique plotlines for legend
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

  // Scale ticks
  $: ticks = (() => {
    const step = maxTotal <= 10 ? 2 : 5;
    const result = [];
    for (let i = 0; i <= maxTotal; i += step) result.push(i);
    if (result[result.length - 1] < maxTotal) result.push(maxTotal);
    return result;
  })();
</script>

<div class="episode-pulse">
  <div class="pulse-body">
    <div class="pulse-bars-area">
      {#each rows as row}
        <div class="pulse-row">
          <div class="pulse-ep">{row.code.replace(/S\d+E/, 'E')}</div>
          <div class="pulse-bars-wrap">
            <div class="pulse-bars" style="width: {(row.total / maxTotal) * 100}%;">
              {#each row.segments as seg}
                <div
                  class="pulse-bar"
                  style="flex: {seg.count}; background: {seg.color}; color: {isDarkColor(seg.color) ? '#c0caf5' : '#1a1b26'};"
                  title="{seg.name}: {seg.count}"
                >
                  {#if seg.count >= 2}{seg.count}{/if}
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/each}

      <!-- Scale at bottom -->
      <div class="pulse-scale">
        <div class="pulse-scale-label"></div>
        <div class="pulse-scale-bar">
          {#each ticks as tick}
            <div class="pulse-tick" style="left: {(tick / maxTotal) * 100}%;">
              <span>{tick}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Legend on the right -->
    <div class="pulse-legend">
      {#each legendItems as item}
        <div class="pulse-legend-item">
          <span class="pulse-legend-dot" style="background: {item.color};"></span>
          {item.name}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .pulse-body {
    display: flex;
    gap: 1.5rem;
  }

  .pulse-bars-area {
    flex: 1;
  }

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

  /* Scale */
  .pulse-scale {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  .pulse-scale-label {
    width: 35px;
    flex-shrink: 0;
  }

  .pulse-scale-bar {
    flex: 1;
    position: relative;
    height: 20px;
    border-top: 1px solid var(--border);
  }

  .pulse-tick {
    position: absolute;
    top: 2px;
    transform: translateX(-50%);
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  /* Legend */
  .pulse-legend {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 2px;
  }

  .pulse-legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 1rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .pulse-legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex-shrink: 0;
  }
</style>
