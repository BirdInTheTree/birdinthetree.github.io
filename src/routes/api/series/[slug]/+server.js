import { json, error } from '@sveltejs/kit';
import { getSeriesData, updateSeriesData } from '$lib/server/store.js';

export const prerender = false;

export function GET({ params }) {
  const result = getSeriesData(params.slug);
  if (!result) throw error(404, `Series '${params.slug}' not found`);
  return json(result);
}

export async function PUT({ params, request }) {
  const data = await request.json();
  const ok = updateSeriesData(params.slug, data);
  if (!ok) throw error(404, `Series '${params.slug}' not found`);
  return json({ ok: true });
}
