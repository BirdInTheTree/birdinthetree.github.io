/**
 * Count character appearances across all events.
 * Returns array of [charId, count] sorted descending by count.
 */
export function characterFrequencies(data) {
  const counts = new Map();
  for (const ep of data.episodes || []) {
    for (const event of ep.events || []) {
      for (const char of event.characters || []) {
        counts.set(char, (counts.get(char) || 0) + 1);
      }
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Resolve character id to display name.
 * Handles "guest:" prefix by stripping it.
 */
export function resolveCharacterName(charId, cast) {
  if (charId.startsWith('guest:')) {
    return charId
      .slice(6)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const member = cast.find((c) => c.id === charId);
  return member ? member.name : charId;
}

/** Check if a character id represents a guest. */
export function isGuest(charId) {
  return charId.startsWith('guest:');
}

/**
 * Get characters in a plotline, sorted by frequency.
 * Returns array of character ids.
 */
export function plotlineCharacters(data, plotlineId) {
  const counts = new Map();
  for (const ep of data.episodes || []) {
    for (const event of ep.events || []) {
      if (event.storyline === plotlineId) {
        for (const char of event.characters || []) {
          counts.set(char, (counts.get(char) || 0) + 1);
        }
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([charId]) => charId);
}
