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
  return localStorage.getItem('theme') || 'light';
}

export const theme = writable(getInitialTheme());

// Sync theme to DOM and localStorage
if (browser) {
  theme.subscribe((value) => {
    document.documentElement.classList.toggle('dark', value === 'dark');
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

/** Plotlines sorted by rank: A < B < C < runner */
export const sortedPlotlines = derived(seriesData, ($data) => {
  if (!$data?.plotlines) return [];
  return [...$data.plotlines].sort((a, b) => {
    const ra = RANK_ORDER[a.rank] ?? 99;
    const rb = RANK_ORDER[b.rank] ?? 99;
    return ra - rb;
  });
});

/** Episodes sorted by code (lexicographic works for SxxExx format) */
export const sortedEpisodes = derived(seriesData, ($data) => {
  if (!$data?.episodes) return [];
  return [...$data.episodes].sort((a, b) => a.episode.localeCompare(b.episode));
});
