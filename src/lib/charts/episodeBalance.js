import { sortPlotlines, buildColorMap } from './helpers.js';

/**
 * Stacked bar chart: plotline event counts per episode.
 */
export function buildEpisodeBalance(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = (data.episodes || []).sort((a, b) => a.episode.localeCompare(b.episode));
  const colors = buildColorMap(plotlines);

  const datasets = plotlines.map((pl) => ({
    label: pl.name,
    data: episodes.map((ep) => {
      let count = 0;
      for (const ev of ep.events || []) {
        if ((ev.plotline_id || ev.plotline || ev.storyline) === pl.id) count++;
      }
      return count;
    }),
    backgroundColor: colors[pl.id],
    borderWidth: 0
  }));

  const labels = episodes.map((ep) => ep.episode);

  // Auto-scale Y-axis to fit tallest stacked bar
  const epTotals = episodes.map((_, eIdx) =>
    datasets.reduce((sum, ds) => sum + ds.data[eIdx], 0)
  );
  const yMax = Math.max(5, ...epTotals);

  return {
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 14, font: { size: 16 } }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label(ctx) {
              return `${ctx.dataset.label}: ${ctx.raw} events`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { maxRotation: 0, font: { size: 16 } }
        },
        y: {
          stacked: true,
          max: yMax,
          grid: { display: false },
          title: { display: true, text: 'Event count', font: { size: 16 } },
          beginAtZero: true,
          ticks: { font: { size: 16 }, precision: 0 }
        }
      }
    },
    plugins: [{
      id: 'barDataLabels',
      afterDraw(chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        for (const dataset of chart.getSortedVisibleDatasetMetas()) {
          for (let i = 0; i < dataset.data.length; i++) {
            const element = dataset.data[i];
            const count = chart.data.datasets[dataset.index]?.data[i] ?? 0;
            if (count < 1) continue;

            const barHeight = Math.abs(element.base - element.y);
            if (barHeight < 16) continue;

            const cx = element.x;
            const cy = (element.y + element.base) / 2;
            ctx.fillText(String(count), cx, cy);
          }
        }
        ctx.restore();
      }
    }]
  };
}
