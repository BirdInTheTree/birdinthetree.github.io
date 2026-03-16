import { FUNCTION_TENSION } from './constants.js';
import { sortPlotlines, buildColorMap } from './helpers.js';

/**
 * Line chart: max tension per plotline per episode.
 * Tension = max of FUNCTION_TENSION weights for that plotline's events.
 */
export function buildTensionCurves(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const episodes = data.episodes || [];
  const episodeNames = episodes.map((ep) => ep.episode);
  const colors = buildColorMap(plotlines);

  const datasets = plotlines.map((pl) => {
    const values = episodes.map((ep) => {
      const tensions = (ep.events || [])
        .filter((ev) => ev.storyline === pl.id)
        .map((ev) => FUNCTION_TENSION[ev.function] ?? 1);

      return tensions.length > 0 ? Math.max(...tensions) : null;
    });

    return {
      label: `${pl.name} [${pl.rank || '?'}]`,
      data: values,
      borderColor: colors[pl.id],
      backgroundColor: colors[pl.id],
      borderWidth: 2.5,
      pointRadius: 6,
      pointHoverRadius: 8,
      tension: 0.1,
      spanGaps: true
    };
  });

  return {
    data: { labels: episodeNames, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 14, font: { size: 14 } }
        },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: {
          ticks: { maxRotation: 45, font: { size: 14 } }
        },
        y: {
          min: 0,
          max: 4.5,
          ticks: {
            stepSize: 0.5,
            font: { size: 14 },
            callback: (value) => {
              const labels = {
                0.5: 'resolution',
                1: 'setup/seed',
                2: 'escalation',
                3: 'turning point',
                4: 'climax/cliffhanger'
              };
              return labels[value] || '';
            }
          },
          title: { display: true, text: 'Tension', font: { size: 14 } }
        }
      }
    }
  };
}
