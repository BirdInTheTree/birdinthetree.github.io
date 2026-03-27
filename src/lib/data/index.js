let manifestCache = null;
const dataCache = new Map();
let useApi = null; // null = not checked, true/false after check

/**
 * Detect whether server API is available (adapter-node mode).
 * Caches the result after first check.
 */
async function detectApiMode() {
  if (useApi !== null) return useApi;
  try {
    const res = await fetch('/api/manifest');
    useApi = res.ok;
  } catch {
    useApi = false;
  }
  return useApi;
}

export async function loadManifest() {
  if (manifestCache) return manifestCache;

  const isApi = await detectApiMode();
  const url = isApi ? '/api/manifest' : '/data/manifest.json';
  const res = await fetch(url);
  manifestCache = await res.json();
  return manifestCache;
}

export async function loadSeriesData(slug, file) {
  if (dataCache.has(slug)) return dataCache.get(slug);

  const isApi = await detectApiMode();

  let data, isDirty;
  if (isApi) {
    const res = await fetch(`/api/series/${slug}`);
    const result = await res.json();
    data = result.data;
    isDirty = result.isDirty;
  } else {
    const res = await fetch(`/data/${file}`);
    data = await res.json();
    isDirty = false;
  }

  const entry = { data, isDirty };
  dataCache.set(slug, entry);
  return entry;
}

/** Send updated data to server. Only works in API mode. */
export async function updateSeriesData(slug, data) {
  dataCache.set(slug, { data, isDirty: true });
  if (!useApi) return;
  await fetch(`/api/series/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/** Save series to disk. Returns the new filename. */
export async function saveSeriesData(slug) {
  if (!useApi) return null;
  const res = await fetch(`/api/series/${slug}/save`, { method: 'POST' });
  const result = await res.json();
  dataCache.delete(slug);
  return result.filename;
}

/** Clear cache for a slug (after save, to force reload). */
export function invalidateCache(slug) {
  dataCache.delete(slug);
}

/** Check if we're in editing (API) mode. */
export function isEditingMode() {
  return useApi === true;
}
