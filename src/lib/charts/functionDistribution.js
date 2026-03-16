import { ALL_FUNCTIONS, FUNCTION_COLORS } from './constants.js';

/**
 * Stacked bar chart: function type counts per episode.
 * X-axis = episodes, stacks per narrative function.
 */
export function buildFunctionDistribution(data) {
  const episodes = data.episodes || [];
  const episodeNames = episodes.map((ep) => ep.episode);

  const datasets = ALL_FUNCTIONS.map((fn) => {
    const values = episodes.map((ep) => {
      let count = 0;
      for (const ev of ep.events || []) {
        if (ev.function === fn) count++;
      }
      return count;
    });

    return {
      label: fn.replace(/_/g, ' '),
      data: values,
      backgroundColor: FUNCTION_COLORS[fn] || '#999',
      borderWidth: 0
    };
  });

  return {
    data: { labels: episodeNames, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 14, font: { size: 11 } } },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { maxRotation: 45, font: { size: 10 } }
        },
        y: {
          stacked: true,
          title: { display: true, text: 'Number of events' },
          beginAtZero: true
        }
      }
    }
  };
}
