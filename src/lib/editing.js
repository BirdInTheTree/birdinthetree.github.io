/**
 * Client-side data mutation helpers for editing mode.
 * All functions operate on plain objects (the seriesData structure)
 * and return a new copy to trigger Svelte reactivity.
 */

/** Convert a plotline name to a snake_case slug. */
export function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_');
}

/** Generate a unique slug, appending _2, _3, etc. on collision. */
export function uniqueSlug(name, existingIds) {
  const base = slugify(name);
  if (!existingIds.has(base)) return base;
  let n = 2;
  while (existingIds.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/** Recompute span for a single plotline from episode events. */
export function recomputeSpan(data, plotlineId) {
  const span = [];
  for (const ep of data.episodes || []) {
    const hasEvent = (ep.events || []).some(
      e => (e.plotline_id || e.plotline || e.storyline) === plotlineId
    );
    if (hasEvent) span.push(ep.episode);
  }
  return span;
}

/** Recompute spans for all plotlines in-place. Returns data for chaining. */
export function recomputeAllSpans(data) {
  for (const pl of data.plotlines || []) {
    pl.span = recomputeSpan(data, pl.id);
  }
  return data;
}

/** Get the plotline field from an event (handles all field name variants). */
export function getEventPlotline(event) {
  return event.plotline_id || event.plotline || event.storyline || null;
}

/** Set the plotline field on an event (uses canonical 'plotline' field). */
export function setEventPlotline(event, plotlineId) {
  delete event.plotline_id;
  delete event.storyline;
  event.plotline = plotlineId;
}

/**
 * Apply a merge: combine two plotlines into one.
 * Returns new data object with merge applied.
 */
export function applyMerge(data, idA, idB, newPlotline) {
  const result = structuredClone(data);

  result.plotlines = result.plotlines.filter(p => p.id !== idA && p.id !== idB);
  result.plotlines.push(newPlotline);

  for (const ep of result.episodes) {
    for (const ev of ep.events) {
      const plId = getEventPlotline(ev);
      if (plId === idA || plId === idB) {
        setEventPlotline(ev, newPlotline.id);
      }
      if (ev.also_affects) {
        ev.also_affects = ev.also_affects.map(
          x => (x === idA || x === idB) ? newPlotline.id : x
        );
      }
    }
  }

  return recomputeAllSpans(result);
}

/**
 * Apply a split: move selected events from source plotline to a new one.
 * eventKeys is a Set of "episode:eventIndex" strings.
 * Returns new data object with split applied.
 */
export function applySplit(data, sourceId, newPlotline, eventKeys) {
  const result = structuredClone(data);

  result.plotlines.push(newPlotline);

  for (const ep of result.episodes) {
    for (let i = 0; i < ep.events.length; i++) {
      const ev = ep.events[i];
      const key = `${ep.episode}:${i}`;
      if (eventKeys.has(key) && getEventPlotline(ev) === sourceId) {
        setEventPlotline(ev, newPlotline.id);
      }
    }
  }

  return recomputeAllSpans(result);
}
