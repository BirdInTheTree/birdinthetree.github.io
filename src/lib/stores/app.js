import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

const RANK_ORDER = { A: 0, B: 1, C: 2, runner: 3 };

export const currentSeries = writable(null);
export const manifest = writable([]);
export const seriesData = writable(null);
export const isLoading = writable(false);
export const selectedChars = writable(new Set());
export const activeFunctions = writable(new Set());

// Editing stores
export const editMode = writable(false);
export const isDirty = writable(false);
export const toastMessage = writable(null);

function getInitialTheme() {
  if (!browser) return 'light';
  const saved = localStorage.getItem('theme');
  if (saved) return saved;
  // Respect browser preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const theme = writable(getInitialTheme());

// Sync theme to DOM and localStorage
if (browser) {
  theme.subscribe((value) => {
    document.documentElement.classList.toggle('dark', value === 'dark');
    document.documentElement.classList.toggle('light', value === 'light');
    localStorage.setItem('theme', value);
  });
}

/** Show a toast message that auto-dismisses after 3s. */
export function showToast(message) {
  toastMessage.set(message);
  if (browser) {
    setTimeout(() => toastMessage.set(null), 3000);
  }
}

/**
 * Per-plotline stats: event count, span ratio, also_affects count.
 * Map of plotlineId -> { events, span, totalEpisodes, affected }
 */
export const plotlineStats = derived(seriesData, ($data) => {
  if (!$data?.plotlines || !$data?.episodes) return new Map();

  const stats = new Map();
  const totalEp = $data.episodes.length;

  for (const pl of $data.plotlines) {
    stats.set(pl.id, { events: 0, span: (pl.span || []).length, totalEpisodes: totalEp, affected: 0 });
  }

  for (const ep of $data.episodes) {
    for (const ev of ep.events || []) {
      const plId = ev.plotline_id || ev.plotline || ev.storyline;
      if (plId && stats.has(plId)) {
        stats.get(plId).events++;
      }
      for (const aid of ev.also_affects || []) {
        if (stats.has(aid)) {
          stats.get(aid).affected++;
        }
      }
    }
  }

  return stats;
});

/** Plotlines sorted by event count (descending), runners last */
export const sortedPlotlines = derived([seriesData, plotlineStats], ([$data, $stats]) => {
  if (!$data?.plotlines) return [];
  return [...$data.plotlines].sort((a, b) => {
    // Runners always last
    if (a.type === 'runner' && b.type !== 'runner') return 1;
    if (b.type === 'runner' && a.type !== 'runner') return -1;
    // Then by event count descending
    const countA = $stats.get(a.id)?.events ?? 0;
    const countB = $stats.get(b.id)?.events ?? 0;
    return countB - countA;
  });
});

/** Episodes sorted by code (lexicographic works for SxxExx format) */
export const sortedEpisodes = derived(seriesData, ($data) => {
  if (!$data?.episodes) return [];
  return [...$data.episodes].sort((a, b) => a.episode.localeCompare(b.episode));
});
