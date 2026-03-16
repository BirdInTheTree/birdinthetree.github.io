import { sortPlotlines, buildColorMap, buildCastMap } from './helpers.js';

/**
 * Horizontal floating-bar chart: which episodes each plotline spans.
 * Y-axis = plotline names, X-axis = episode index.
 * Each plotline gets one contiguous bar from its first to last episode.
 */
export function buildPlotlineSpan(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = data.episodes || [];
  const episodeNames = episodes.map((ep) => ep.episode);
  const epIdx = {};
  episodeNames.forEach((name, i) => { epIdx[name] = i; });
  const colors = buildColorMap(plotlines);
  const cast = buildCastMap(data);

  // Count events per plotline per episode
  const eventCounts = {};
  for (const ep of episodes) {
    for (const ev of ep.events || []) {
      const sl = ev.storyline;
      if (!sl) continue;
      if (!eventCounts[sl]) eventCounts[sl] = {};
      eventCounts[sl][ep.episode] = (eventCounts[sl][ep.episode] || 0) + 1;
    }
  }

  // Build one dataset per episode column — each plotline row gets a bar segment
  // if that plotline spans that episode.
  // Chart.js floating bars: data = [start, end] pairs.
  // Simpler approach: one dataset per plotline, with data for each plotline row.
  // Since we want plotlines on Y, we use one dataset per episode.
  const datasets = episodeNames.map((epName, epI) => ({
    label: epName,
    data: plotlines.map((pl) => {
      const span = pl.span || [];
      if (!span.includes(epName)) return null;
      const count = (eventCounts[pl.id] || {})[epName] || 0;
      // Bar height proportional to event count (min 0.3 so it's visible)
      return Math.max(0.3, count);
    }),
    backgroundColor: plotlines.map((pl) => {
      const span = pl.span || [];
      if (!span.includes(epName)) return 'transparent';
      return colors[pl.id] || '#999';
    }),
    borderWidth: 0,
    barPercentage: 0.85,
    categoryPercentage: 0.9
  }));

  const yLabels = plotlines.map((pl) => {
    const rank = pl.rank || '?';
    const driver = cast[pl.driver] || pl.driver || '';
    return `[${rank}] ${pl.name} (${driver})`;
  });

  return {
    data: { labels: yLabels, datasets },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (ctx) => {
              const v = ctx.raw;
              if (v === null || v === 0) return null;
              const count = v < 1 ? 0 : Math.round(v);
              return `${ctx.dataset.label}: ${count} events`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          title: { display: true, text: 'Event count across episodes' },
          beginAtZero: true
        },
        y: {
          stacked: true
        }
      }
    }
  };
}
