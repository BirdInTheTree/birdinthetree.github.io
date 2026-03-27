import { json, error } from '@sveltejs/kit';
import { saveSeriesData } from '$lib/server/store.js';

export function POST({ params }) {
  const filename = saveSeriesData(params.slug);
  if (!filename) throw error(404, `Series '${params.slug}' not found`);
  return json({ filename });
}
