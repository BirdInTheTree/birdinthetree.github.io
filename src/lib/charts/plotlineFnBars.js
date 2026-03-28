import { sortPlotlines } from './helpers.js';
import { FUNCTION_COLORS, ALL_FUNCTIONS } from './constants.js';

/**
 * Option B: Small multiples — stacked bar per episode for each plotline.
 * Color = plot_fn. One mini-chart per plotline.
 */
export function buildPlotlineFnBars(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = (data.episodes || []).sort((a, b) => a.episode.localeCompare(b.episode));

  // Build datasets: one per function type, data per episode
  function buildForPlotline(pl) {
    const datasets = ALL_FUNCTIONS.map(fn => ({
      label: fn.replace(/_/g, ' '),
      data: episodes.map(ep => {
        let count = 0;
        for (const ev of ep.events || []) {
          const plId = ev.plotline_id || ev.plotline || ev.storyline;
          const evFn = ev.plot_fn || ev.function;
          if (plId === pl.id && evFn === fn) count++;
        }
        return count;
      }),
      backgroundColor: FUNCTION_COLORS[fn] || '#999',
      borderWidth: 0
    })).filter(ds => ds.data.some(v => v > 0));

    return datasets;
  }

  const labels = episodes.map(ep => ep.episode.replace(/S\d+/, ''));

  const charts = plotlines.map(pl => ({
    plotline: pl,
    datasets: buildForPlotline(pl),
    labels
  }));

  return charts;
}

/**
 * Build Chart.js config for a single plotline's fn bars.
 */
export function buildPlotlineFnBarConfig(chartData) {
  const epTotals = chartData.labels.map((_, i) =>
    chartData.datasets.reduce((sum, ds) => sum + ds.data[i], 0)
  );
  const yMax = Math.max(3, ...epTotals);

  return {
    data: { labels: chartData.labels, datasets: chartData.datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label(ctx) {
              return ctx.raw > 0 ? `${ctx.dataset.label}: ${ctx.raw}` : '';
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { maxRotation: 0, font: { size: 13 } }
        },
        y: {
          stacked: true,
          max: yMax,
          grid: { display: false },
          beginAtZero: true,
          ticks: { font: { size: 13 }, precision: 0, stepSize: 1 }
        }
      }
    }
  };
}
