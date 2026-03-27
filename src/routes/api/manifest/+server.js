import { json } from '@sveltejs/kit';
import { getManifest, loadDirectory, isInitialized } from '$lib/server/store.js';

export function GET() {
  if (!isInitialized()) {
    const dir = process.env.DATA_DIR || 'static/data';
    loadDirectory(dir);
  }
  return json(getManifest());
}
