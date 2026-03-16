import { sortPlotlines, buildColorMap } from './helpers.js';

/**
 * Stacked bar chart: event count per plotline per episode.
 * Uses afterDraw plugin to render count numbers inside each bar segment.
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
        legend: {
          position: 'top',
          labels: { boxWidth: 14, font: { size: 14 } }
        },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { maxRotation: 45, font: { size: 14 } }
        },
        y: {
          stacked: true,
          title: { display: true, text: 'Number of events', font: { size: 14 } },
          beginAtZero: true,
          ticks: { font: { size: 14 } }
        }
      }
    },
    // Custom plugin to draw event count numbers inside bar segments
    plugins: [{
      id: 'barDataLabels',
      afterDraw(chart) {
        const ctx = chart.ctx;
        ctx.save();
        const isDark = document.documentElement.classList.contains('dark');
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const dataset of chart.getSortedVisibleDatasetMetas()) {
          for (const element of dataset.data) {
            const value = element.$context?.parsed?.y;
            if (!value || value < 1) continue;

            const barHeight = Math.abs(element.base - element.y);
            // Only show label if bar segment is tall enough
            if (barHeight < 16) continue;

            const cx = element.x;
            const cy = (element.y + element.base) / 2;
            ctx.fillText(String(value), cx, cy);
          }
        }
        ctx.restore();
      }
    }]
  };
}
