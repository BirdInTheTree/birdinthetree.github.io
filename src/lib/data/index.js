let manifestCache = null;
const dataCache = new Map();
let useApi = null; // null = not checked, true/false after check

/**
 * Detect whether server API is available (adapter-node mode).
 * Caches the result after first check.
 */
/**
 * Detect whether server API is available (adapter-node mode).
 * Caches the result and the manifest response to avoid double-fetch.
 */
async function detectApiMode() {
  if (useApi !== null) return useApi;
  try {
    const res = await fetch('/api/manifest');
    if (res.ok) {
      useApi = true;
      // Cache the manifest from the detection request
      manifestCache = await res.json();
    } else {
      useApi = false;
    }
  } catch {
    useApi = false;
  }
  return useApi;
}

export async function loadManifest() {
  await detectApiMode();
  if (manifestCache) return manifestCache;

  const res = await fetch('/data/manifest.json');
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
  const res = await fetch(`/api/series/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    console.error(`Failed to update series ${slug}: ${res.status}`);
  }
}

/** Save series to disk. Returns the new filename. */
export async function saveSeriesData(slug) {
  if (!useApi) return null;
  const res = await fetch(`/api/series/${slug}/save`, { method: 'POST' });
  if (!res.ok) {
    console.error(`Failed to save series ${slug}: ${res.status}`);
    return null;
  }
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
