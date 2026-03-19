import { sortPlotlines, buildColorMap } from './helpers.js';

/**
 * 100% stacked bar chart: plotline proportions per episode.
 * All columns same height, absolute event counts shown inside segments.
 */
export function buildEpisodeBalance(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = (data.episodes || []).sort((a, b) => a.episode.localeCompare(b.episode));
  const colors = buildColorMap(plotlines);

  // Count events per plotline per episode
  const rawCounts = plotlines.map((pl) =>
    episodes.map((ep) => {
      let count = 0;
      for (const ev of ep.events || []) {
        if (ev.storyline === pl.id) count++;
      }
      return count;
    })
  );

  // Episode totals for 100% calculation
  const epTotals = episodes.map((_, eIdx) =>
    plotlines.reduce((sum, _, pIdx) => sum + rawCounts[pIdx][eIdx], 0)
  );

  // Convert to percentages for display, keep raw counts for labels
  const datasets = plotlines.map((pl, pIdx) => ({
    label: pl.name,
    data: episodes.map((_, eIdx) => {
      const total = epTotals[eIdx];
      return total > 0 ? (rawCounts[pIdx][eIdx] / total) * 100 : 0;
    }),
    // Store raw counts for the label plugin
    rawCounts: rawCounts[pIdx],
    backgroundColor: colors[pl.id],
    borderWidth: 0
  }));

  const labels = episodes.map((ep) => {
    const theme = ep.theme || '';
    return theme ? `${ep.episode} ${theme.slice(0, 18)}\u2026` : ep.episode;
  });

  return {
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 14, font: { size: 14 } }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label(ctx) {
              const raw = ctx.dataset.rawCounts?.[ctx.dataIndex] ?? 0;
              const pct = ctx.raw?.toFixed?.(0) ?? ctx.raw;
              return `${ctx.dataset.label}: ${raw} events (${pct}%)`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { maxRotation: 45, font: { size: 12 } }
        },
        y: {
          stacked: true,
          max: 100,
          title: { display: true, text: 'Share of events (%)', font: { size: 14 } },
          beginAtZero: true,
          ticks: {
            font: { size: 14 },
            callback: (v) => v + '%'
          }
        }
      }
    },
    plugins: [{
      id: 'barDataLabels',
      afterDraw(chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        for (const dataset of chart.getSortedVisibleDatasetMetas()) {
          const rawCounts = chart.data.datasets[dataset.index]?.rawCounts;
          for (let i = 0; i < dataset.data.length; i++) {
            const element = dataset.data[i];
            const rawCount = rawCounts?.[i] ?? 0;
            if (rawCount < 1) continue;

            const barHeight = Math.abs(element.base - element.y);
            if (barHeight < 16) continue;

            const cx = element.x;
            const cy = (element.y + element.base) / 2;
            ctx.fillText(String(rawCount), cx, cy);
          }
        }
        ctx.restore();
      }
    }]
  };
}
