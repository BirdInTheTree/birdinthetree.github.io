/**
 * Server-side store: loads JSON files from a directory,
 * manages versioning and autosave.
 */

import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'fs';
import { join, basename } from 'path';

/** @type {Map<string, { data: object, originalPath: string, isDirty: boolean }>} */
const states = new Map();

/** @type {string|null} */
let dataDir = null;

/** Derive slug from filename: "bb_s01_result.json" -> "bb_s01" */
function deriveSlug(filename) {
  const base = filename.replace('.json', '');
  const versionMatch = base.match(/^(.+)_result_(v\d+)$/);
  if (versionMatch) return `${versionMatch[1]}_${versionMatch[2]}`;
  const resultMatch = base.match(/^(.+)_result$/);
  if (resultMatch) return resultMatch[1];
  const finalMatch = base.match(/^(.+)_final$/);
  if (finalMatch) return finalMatch[1];
  return base;
}

/** Find the latest versioned file for a given original path. */
function findLatestVersion(originalPath) {
  const dir = originalPath.substring(0, originalPath.lastIndexOf('/'));
  const stem = basename(originalPath, '.json');
  const pattern = new RegExp(`^${escapeRegex(stem)}\\.v(\\d{3})\\.json$`);

  const versions = readdirSync(dir)
    .filter(f => pattern.test(f))
    .sort();

  if (versions.length === 0) return null;
  return join(dir, versions[versions.length - 1]);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Get next version path: stem.v001.json, stem.v002.json, etc. */
function nextVersionPath(originalPath) {
  const dir = originalPath.substring(0, originalPath.lastIndexOf('/'));
  const stem = basename(originalPath, '.json');
  const pattern = new RegExp(`^${escapeRegex(stem)}\\.v(\\d{3})\\.json$`);

  const versions = readdirSync(dir)
    .filter(f => pattern.test(f))
    .map(f => parseInt(f.match(pattern)[1], 10));

  const next = versions.length > 0 ? Math.max(...versions) + 1 : 1;
  return join(dir, `${stem}.v${String(next).padStart(3, '0')}.json`);
}

function autosavePath(originalPath, slug) {
  const dir = originalPath.substring(0, originalPath.lastIndexOf('/'));
  return join(dir, `.autosave_${slug}.json`);
}

/**
 * Load all result JSON files from a directory.
 * Picks the latest version if available.
 */
export function loadDirectory(dirPath) {
  dataDir = dirPath;
  states.clear();

  const files = readdirSync(dirPath)
    .filter(f => f.endsWith('.json') && !f.startsWith('.') && !f.startsWith('manifest'))
    .filter(f => !f.includes('.v') && !f.includes('consistency') && !f.includes('verdicts'))
    .sort();

  for (const file of files) {
    const originalPath = join(dirPath, file);
    const slug = deriveSlug(file);
    const latest = findLatestVersion(originalPath);
    const sourcePath = latest || originalPath;

    const data = JSON.parse(readFileSync(sourcePath, 'utf-8'));
    states.set(slug, { data, originalPath, isDirty: false });
  }

  return getManifest();
}

/** Return manifest array: [{ slug, displayName, file }] */
export function getManifest() {
  if (!dataDir) return [];
  return [...states.entries()].map(([slug, state]) => ({
    slug,
    displayName: slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    file: basename(state.originalPath)
  }));
}

/** Get series data by slug. Returns null if not found. */
export function getSeriesData(slug) {
  const state = states.get(slug);
  return state ? { data: state.data, isDirty: state.isDirty } : null;
}

/** Update series data in memory and mark dirty. */
export function updateSeriesData(slug, data) {
  const state = states.get(slug);
  if (!state) return false;
  state.data = data;
  state.isDirty = true;

  // Write autosave
  const asPath = autosavePath(state.originalPath, slug);
  writeFileSync(asPath, JSON.stringify(data, null, 2));
  return true;
}

/** Save series to next version file. Returns the new filename. */
export function saveSeriesData(slug) {
  const state = states.get(slug);
  if (!state) return null;

  const versionPath = nextVersionPath(state.originalPath);
  writeFileSync(versionPath, JSON.stringify(state.data, null, 2));
  state.isDirty = false;

  // Remove autosave
  const asPath = autosavePath(state.originalPath, slug);
  if (existsSync(asPath)) unlinkSync(asPath);

  return basename(versionPath);
}

/** Check if the server store is initialized (has data loaded). */
export function isInitialized() {
  return states.size > 0;
}
