let manifestCache = null;
const dataCache = new Map();

export async function loadManifest() {
  if (manifestCache) return manifestCache;
  const res = await fetch('/data/manifest.json');
  manifestCache = await res.json();
  return manifestCache;
}

export async function loadSeriesData(file) {
  if (dataCache.has(file)) return dataCache.get(file);
  const res = await fetch(`/data/${file}`);
  const data = await res.json();
  dataCache.set(file, data);
  return data;
}
