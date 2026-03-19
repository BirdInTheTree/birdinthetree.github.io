import { RANK_ORDER } from './constants.js';

/**
 * Build storyline arc: group events by function into phases.
 * Returns ordered list of { function, episodes, eventCount }.
 */
export function buildStorylineArc(data, plotlineId) {
  const events = [];
  for (const ep of data.episodes || []) {
    for (const ev of ep.events || []) {
      if ((ev.plotline || ev.storyline) === plotlineId) {
        events.push({ ...ev, episode: ep.episode });
      }
    }
  }

  events.sort((a, b) => a.episode.localeCompare(b.episode));

  const phases = [];
  for (const ev of events) {
    const fn = ev.function || 'setup';
    const last = phases[phases.length - 1];
    if (last && last.function === fn) {
      last.episodes.add(ev.episode);
      last.eventCount++;
    } else {
      phases.push({
        function: fn,
        episodes: new Set([ev.episode]),
        eventCount: 1
      });
    }
  }

  return phases.map((p) => ({
    function: p.function,
    episodes: [...p.episodes],
    eventCount: p.eventCount
  }));
}

/**
 * Build all storyline arcs for a series.
 * Returns Map<plotlineId, phases[]>.
 */
export function buildAllArcs(data) {
  const arcs = new Map();
  for (const pl of data.plotlines || []) {
    arcs.set(pl.id, buildStorylineArc(data, pl.id));
  }
  return arcs;
}

/**
 * Arc completeness: which distinct functions are present per plotline.
 * Returns Map<plotlineId, Set<functionName>>.
 */
export function computeArcCompleteness(data) {
  const result = new Map();
  for (const pl of data.plotlines || []) {
    const funcs = new Set();
    for (const ep of data.episodes || []) {
      for (const ev of ep.events || []) {
        if ((ev.plotline || ev.storyline) === pl.id && ev.function) {
          funcs.add(ev.function);
        }
      }
    }
    result.set(pl.id, funcs);
  }
  return result;
}

/**
 * Directed convergence matrix from also_affects links only.
 * Returns { matrix: number[][], plotlineIds: string[], plotlineNames: string[] }
 * matrix[i][j] = count of events from plotline i that affect plotline j.
 *
 * Note: uses only also_affects, not ep.interactions. This is intentional —
 * the spec defines convergence as directed cross-storyline impact, not
 * co-presence.
 */
export function buildConvergenceMatrix(data) {
  const plotlines = [...(data.plotlines || [])].sort(
    (a, b) => (RANK_ORDER[a.rank] ?? 99) - (RANK_ORDER[b.rank] ?? 99)
  );
  const ids = plotlines.map((p) => p.id);
  const names = plotlines.map((p) => p.name);
  const idToIdx = {};
  ids.forEach((id, i) => { idToIdx[id] = i; });
  const n = ids.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));

  for (const ep of data.episodes || []) {
    for (const ev of ep.events || []) {
      const src = (ev.plotline || ev.storyline);
      if (!src || !(src in idToIdx) || !ev.also_affects) continue;
      for (const tgt of ev.also_affects) {
        if (tgt in idToIdx && tgt !== src) {
          matrix[idToIdx[src]][idToIdx[tgt]]++;
        }
      }
    }
  }

  return { matrix, plotlineIds: ids, plotlineNames: names };
}
