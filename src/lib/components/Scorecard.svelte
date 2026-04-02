<script>
  import { sortPlotlines } from '$lib/charts/helpers.js';
  import { RANK_COLORS, FUNCTION_TENSION } from '$lib/charts/constants.js';
  import { theme } from '$lib/stores/app.js';

  export let data;

  $: quote = data?.context?.story_engine || '';
  $: plotlines = data?.plotlines ? sortPlotlines(data.plotlines) : [];
  $: episodes = (data?.episodes || []).map(ep => ep.episode);
  $: stats = buildStats(plotlines, data?.episodes || []);

  function buildStats(plotlines, episodes) {
    const result = {};
    for (const pl of plotlines) {
      result[pl.id] = { events: 0, functions: {} };
    }
    for (const ep of episodes) {
      for (const ev of ep.events || []) {
        const id = ev.plotline_id || ev.plotline || ev.storyline;
        if (!result[id]) continue;
        result[id].events++;
        const fn = ev.function || ev.plot_fn;
        if (fn) result[id].functions[fn] = (result[id].functions[fn] || 0) + 1;
      }
    }
    return result;
  }

  /** Find the narrative function with the highest total tension weight. */
  function dominantFunction(functions) {
    let best = '';
    let bestScore = -1;
    for (const [fn, count] of Object.entries(functions)) {
      const score = count * (FUNCTION_TENSION[fn] || 1);
      if (score > bestScore) {
        bestScore = score;
        best = fn;
      }
    }
    return best.replace(/_/g, ' ');
  }

  function rankStyle(rank) {
    const colors = RANK_COLORS[rank];
    if (!colors) return '';
    const isDark = $theme === 'dark';
    return `background: ${isDark ? colors.darkBg : colors.bg}; color: ${isDark ? colors.darkFg : colors.fg};`;
  }
</script>

<div class="scorecard">
  {#if quote}
    <blockquote class="engine-quote">{quote}</blockquote>
  {/if}

  <table class="scorecard-table">
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
          <td class="plotline-name">{pl.name}</td>
          <td class="span-cell">
            <div class="span-dots">
              {#each episodes as epCode}
                <span
                  class="span-dot"
                  class:active={(pl.span || []).includes(epCode)}
                  title={epCode}
                ></span>
              {/each}
            </div>
          </td>
          <td class="events-count">{s.events}</td>
          <td class="arc-summary">{dominantFunction(s.functions)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .scorecard { overflow-x: auto; }

  .engine-quote {
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    border-left: 3px solid var(--accent);
    color: var(--text-muted);
    font-style: italic;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .scorecard-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    border-bottom: 2px solid var(--border);
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    vertical-align: middle;
  }

  .rank-badge {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
  }

  .plotline-name { font-weight: 500; }

  .span-dots {
    display: flex;
    gap: 3px;
    align-items: center;
  }

  .span-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--border);
  }

  .span-dot.active {
    background: var(--accent);
  }

  .events-count {
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .arc-summary {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
</style>
