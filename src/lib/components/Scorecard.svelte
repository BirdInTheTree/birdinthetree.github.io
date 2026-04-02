<script>
  import { sortPlotlines, buildColorMap } from '$lib/charts/helpers.js';
  import { RANK_COLORS, FUNCTION_TENSION } from '$lib/charts/constants.js';
  import { theme } from '$lib/stores/app.js';

  export let data;

  $: storyEngine = data?.context?.story_engine || '';
  $: plotlines = data?.plotlines ? sortPlotlines(data.plotlines) : [];
  $: colorMap = data?.plotlines ? buildColorMap(data.plotlines) : {};
  $: episodes = (data?.episodes || []).map(ep => ep.episode);
  $: stats = buildStats(plotlines, data?.episodes || []);

  function buildStats(plotlines, episodes) {
    const result = {};
    for (const pl of plotlines) {
      result[pl.id] = { events: 0, functions: {} };
    }
    for (const ep of episodes) {
      for (const ev of ep.events || []) {
        const id = ev.plotline || ev.storyline || ev.plotline_id;
        if (!result[id]) continue;
        result[id].events++;
        const fn = ev.function || ev.plot_fn;
        if (fn) result[id].functions[fn] = (result[id].functions[fn] || 0) + 1;
      }
    }
    return result;
  }

  /** Build arc summary: dominant function + high-tension note. */
  function arcSummary(functions) {
    const total = Object.values(functions).reduce((a, b) => a + b, 0);
    if (total === 0) return '';

    // Find dominant function (most common by count)
    let dominant = '';
    let dominantCount = 0;
    for (const [fn, count] of Object.entries(functions)) {
      if (count > dominantCount) {
        dominantCount = count;
        dominant = fn;
      }
    }

    const ratio = dominantCount / total;
    let summary = dominant.replace(/_/g, ' ');
    if (ratio > 0.4) {
      summary += '-heavy';
    }

    // Find first high-tension function with count
    const highTension = ['climax', 'crisis', 'turning_point'];
    for (const fn of highTension) {
      if (functions[fn]) {
        summary += ` · ${functions[fn]}× ${fn.replace(/_/g, ' ')}`;
        break;
      }
    }

    return summary;
  }

  function rankStyle(rank) {
    const colors = RANK_COLORS[rank];
    if (!colors) return '';
    const isDark = $theme === 'dark';
    return `background: ${isDark ? colors.darkBg : colors.bg}; color: ${isDark ? colors.darkFg : colors.fg};`;
  }
</script>

{#if storyEngine}
  <div class="story-engine">{storyEngine}</div>
{/if}

<table class="scorecard">
  <thead>
    <tr>
      <th>Rank</th>
      <th>Plotline</th>
      <th>Span</th>
      <th>Events</th>
      <th>Arc</th>
    </tr>
  </thead>
  <tbody>
    {#each plotlines as pl}
      {@const s = stats[pl.id] || { events: 0, functions: {} }}
      <tr>
        <td>
          <span class="rank-badge" style={rankStyle(pl.rank)}>
            {pl.rank || '?'}
          </span>
        </td>
        <td><span style="color: {colorMap[pl.id] || 'var(--text)'}">{pl.name}</span></td>
        <td>
          <div class="span-bar">
            {#each episodes as epCode}
              <span
                class="span-dot"
                class:active={(pl.span || []).includes(epCode)}
                class:inactive={!(pl.span || []).includes(epCode)}
                style={(pl.span || []).includes(epCode) ? `background: ${colorMap[pl.id] || 'var(--accent)'}` : ''}
              ></span>
            {/each}
          </div>
        </td>
        <td>{s.events}</td>
        <td><span class="arc-summary">{arcSummary(s.functions)}</span></td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .story-engine {
    color: var(--text-muted);
    font-size: 1rem;
    margin-bottom: 1rem;
    padding: 8px 12px;
    background: var(--bg-secondary, #313244);
    border-radius: 6px;
    border-left: 3px solid var(--accent);
  }

  .scorecard {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }

  .scorecard th {
    text-align: left;
    font-size: 0.875rem;
    color: var(--text-muted);
    font-weight: 400;
    padding: 6px 12px;
    border-bottom: 1px solid var(--border);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .scorecard td {
    padding: 8px 12px;
    font-size: 1rem;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
    color: var(--text);
  }

  .scorecard tr:last-child td {
    border-bottom: none;
  }

  .rank-badge {
    display: inline-block;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    text-align: center;
    line-height: 22px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .span-bar {
    display: flex;
    gap: 2px;
  }

  .span-dot {
    width: 14px;
    height: 14px;
    border-radius: 3px;
  }

  .span-dot.active {
    opacity: 0.7;
  }

  .span-dot.inactive {
    background: var(--border);
    opacity: 0.3;
  }

  .arc-summary {
    color: var(--text-muted);
    font-size: 1rem;
  }
</style>
