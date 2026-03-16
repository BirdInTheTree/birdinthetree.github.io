import { sortPlotlines, buildColorMap } from './helpers.js';

/**
 * Stacked bar chart: event count per plotline per episode.
 * X-axis = episodes, Y-axis = event count, stacks per plotline.
 */
export function buildEpisodeBalance(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = data.episodes || [];
  const colors = buildColorMap(plotlines);

  const datasets = plotlines.map((pl) => {
    const values = episodes.map((ep) => {
      let count = 0;
      for (const ev of ep.events || []) {
        if (ev.storyline === pl.id) count++;
      }
      return count;
    });

    return {
      label: pl.name,
      data: values,
      backgroundColor: colors[pl.id],
      borderWidth: 0
    };
  });

  const labels = episodes.map((ep) => {
    const theme = ep.theme || '';
    return theme ? `${ep.episode}\n${theme.slice(0, 20)}` : ep.episode;
  });

  return {
    data: { labels, datasets },
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
