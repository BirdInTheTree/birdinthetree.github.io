<script>
  import { sortPlotlines, buildColorMap, buildCastMap, isDarkColor } from '$lib/charts/helpers.js';
  import { theme } from '$lib/stores/app.js';

  export let data;

  $: isDark = $theme === 'dark';
  $: castMap = data ? buildCastMap(data) : {};
  $: plotlines = data?.plotlines ? sortPlotlines(data.plotlines) : [];
  $: colorMap = data?.plotlines ? buildColorMap(data.plotlines, isDark) : {};
  $: characters = buildCharacters(data, castMap, colorMap);

  /** Format guest:xxx IDs as title case without prefix. */
  function formatName(id, castMap) {
    const name = castMap[id];
    if (name) return name;
    if (id.startsWith('guest:')) {
      return id.slice(6).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    return id;
  }

  function buildCharacters(data, castMap, colorMap) {
    if (!data?.episodes) return [];

    // Count events per character per plotline
    const charPlotlineCounts = {};

    for (const ep of data.episodes) {
      for (const ev of ep.events || []) {
        const plId = ev.plotline || ev.storyline || ev.plotline_id;
        for (const charId of ev.characters || []) {
          if (!charPlotlineCounts[charId]) charPlotlineCounts[charId] = {};
          charPlotlineCounts[charId][plId] = (charPlotlineCounts[charId][plId] || 0) + 1;
        }
      }
    }

    return Object.entries(charPlotlineCounts)
      .map(([id, plCounts]) => {
        const total = Object.values(plCounts).reduce((a, b) => a + b, 0);
        // Build gradient segments sorted by count descending
        const segments = Object.entries(plCounts)
          .map(([plId, count]) => ({ plId, count, color: colorMap[plId] || 'var(--accent)' }))
          .sort((a, b) => b.count - a.count);
        // Dot colors = unique plotline colors
        const dotColors = segments.map(s => s.color);
        return {
          id,
          name: formatName(id, castMap),
          events: total,
          segments,
          dotColors
        };
      })
      .filter(c => c.events >= 2)
      .sort((a, b) => b.events - a.events);
  }

  $: maxEvents = characters.length > 0 ? characters[0].events : 1;

  /** Build CSS linear-gradient from plotline segments. */
  function barGradient(segments, total) {
    if (segments.length === 1) return segments[0].color;
    const parts = [];
    let pct = 0;
    for (const seg of segments) {
      const nextPct = pct + (seg.count / total) * 100;
      parts.push(`${seg.color} ${pct.toFixed(1)}% ${nextPct.toFixed(1)}%`);
      pct = nextPct;
    }
    return `linear-gradient(to right, ${parts.join(', ')})`;
  }
</script>

<div class="character-weight">
  {#each characters as char}
    <div class="char-row">
      <div class="char-name">{char.name}</div>
      <div class="char-bar-wrap">
        <div
          class="char-bar"
          style="width: {(char.events / maxEvents) * 100}%; background: {barGradient(char.segments, char.events)}; color: {isDarkColor(char.segments[0]?.color || '#888') ? '#ffffff' : '#1a1b26'};"
        >
          {char.events}
        </div>
      </div>
      <div class="char-dots">
        {#each char.dotColors as color}
          <span class="char-dot" style="background: {color};"></span>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .char-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .char-name {
    font-size: 1rem;
    color: var(--text);
    width: 110px;
    text-align: right;
    flex-shrink: 0;
  }

  .char-bar-wrap {
    flex: 1;
    height: 22px;
    position: relative;
  }

  .char-bar {
    height: 100%;
    border-radius: 3px;
    display: flex;
    align-items: center;
    padding-left: 8px;
    font-size: 0.875rem;
  }

  .char-dots {
    display: flex;
    gap: 3px;
  }

  .char-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
  }
</style>
