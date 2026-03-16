import { RANK_ORDER, STORYLINE_PALETTE } from './constants.js';

/** Sort plotlines by rank: A < B < C < runner. */
export function sortPlotlines(plotlines) {
  return [...plotlines].sort(
    (a, b) => (RANK_ORDER[a.rank] ?? 99) - (RANK_ORDER[b.rank] ?? 99)
  );
}

/** Assign distinct palette colors to plotlines in rank order. */
export function buildColorMap(plotlines) {
  const map = {};
  plotlines.forEach((pl, i) => {
    map[pl.id] = STORYLINE_PALETTE[i % STORYLINE_PALETTE.length];
  });
  return map;
}

/** Build { charId: charName } lookup from cast array. */
export function buildCastMap(data) {
  const map = {};
  for (const c of data.cast || []) {
    map[c.id] = c.name;
  }
  return map;
}
