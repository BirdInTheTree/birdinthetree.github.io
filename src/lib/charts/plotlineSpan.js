import { sortPlotlines, buildColorMap, buildCastMap } from './helpers.js';

/**
 * Gantt-style span timeline: which episodes each plotline is active in.
 *
 * Y-axis = plotline names (reversed so A-rank is at top).
 * X-axis = episode indices.
 * Each plotline gets one horizontal floating bar [firstEpIdx, lastEpIdx+1].
 * Color intensity reflects rank. Event count labels are shown via tooltip.
 */
export function buildPlotlineSpan(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = data.episodes || [];
  const episodeNames = episodes.map((ep) => ep.episode);
  const epIdx = {};
  episodeNames.forEach((name, i) => { epIdx[name] = i; });
  const colors = buildColorMap(plotlines);
  const cast = buildCastMap(data);

  // Count events per plotline per episode (for tooltip detail)
  const eventCounts = {};
  for (const ep of episodes) {
    for (const ev of ep.events || []) {
      const sl = ev.storyline;
      if (!sl) continue;
      if (!eventCounts[sl]) eventCounts[sl] = {};
      eventCounts[sl][ep.episode] = (eventCounts[sl][ep.episode] || 0) + 1;
    }
  }

  // Reversed so highest rank (A) appears at top of the chart
  const reversed = [...plotlines].reverse();
  const rankAlpha = { A: 1.0, B: 0.7, C: 0.45, runner: 0.3 };

  const yLabels = reversed.map((pl) => {
    const rank = pl.rank || '?';
    const driver = cast[pl.driver] || pl.driver || '';
    return `[${rank}] ${pl.name} (${driver})`;
  });

  // Each plotline becomes one dataset with a single floating bar [start, end]
  const datasets = reversed.map((pl, rowIdx) => {
    const span = pl.span || [];
    const validEps = span.filter((ep) => ep in epIdx).map((ep) => epIdx[ep]);

    if (validEps.length === 0) {
      return {
        label: pl.name,
        data: [null],
        backgroundColor: 'transparent',
        borderWidth: 0
      };
    }

    const firstIdx = Math.min(...validEps);
    const lastIdx = Math.max(...validEps);
    const alpha = rankAlpha[pl.rank] ?? 0.5;
    const color = hexToRgba(colors[pl.id] || '#999', alpha);

    // Total events across all spanned episodes for tooltip
    const totalEvents = span.reduce((sum, epName) => {
      return sum + ((eventCounts[pl.id] || {})[epName] || 0);
    }, 0);

    // Data array: one entry per Y label, only the matching row gets a bar
    const barData = yLabels.map((_, i) => {
      if (i !== rowIdx) return null;
      return [firstIdx - 0.4, lastIdx + 0.4];
    });

    return {
      label: pl.name,
      data: barData,
      backgroundColor: color,
      borderColor: colors[pl.id] || '#999',
      borderWidth: 1,
      borderSkipped: false,
      barPercentage: 0.6,
      categoryPercentage: 0.9,
      totalEvents,
      spanLength: span.length
    };
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
            label: (ctx) => {
              const ds = ctx.dataset;
              if (!ctx.raw) return null;
              return `${ds.label}: ${ds.spanLength} episodes, ${ds.totalEvents} events`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Episodes' },
          min: -0.6,
          max: episodeNames.length - 0.4,
          ticks: {
            stepSize: 1,
            callback: (value) => {
              if (Number.isInteger(value) && value >= 0 && value < episodeNames.length) {
                return episodeNames[value];
              }
              return '';
            }
          }
        },
        y: {
          ticks: { font: { size: 10 } }
        }
      }
    }
  };
}

/** Convert hex color to rgba string. */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
