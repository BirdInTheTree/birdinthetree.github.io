import { readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'static', 'data');

/**
 * Derive slug from filename.
 * "bb_s01_result.json" -> "bb_s01"
 * "breaking-bad_s01_20260327_195130.json" -> "breaking-bad_s01"
 * "csi_s01_result_v2.json" -> "csi_s01_v2"
 */
function deriveSlug(filename) {
  const base = filename.replace('.json', '');
  // Strip pipeline timestamp suffix: _YYYYMMDD_HHMMSS
  const noTimestamp = base.replace(/_\d{8}_\d{6}$/, '');
  const versionMatch = noTimestamp.match(/^(.+)_result_(v\d+)$/);
  if (versionMatch) return `${versionMatch[1]}_${versionMatch[2]}`;
  const resultMatch = noTimestamp.match(/^(.+)_result$/);
  if (resultMatch) return resultMatch[1];
  const finalMatch = noTimestamp.match(/^(.+)_final$/);
  if (finalMatch) return finalMatch[1];
  return noTimestamp;
}

/**
 * Format slug into readable title.
 * "breaking-bad_s01" -> "Breaking Bad S01"
 */
function formatDisplayName(slug) {
  return slug.split('_').map(part => {
    if (/^s\d+$/i.test(part)) return part.toUpperCase();
    if (/^v\d+$/i.test(part)) return part;
    return part.split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }).join(' ');
}

const files = readdirSync(DATA_DIR)
  .filter(f => f.endsWith('.json') && f !== 'manifest.json')
  .sort();

// Deduplicate: if multiple files map to the same slug, keep the last one (newest)
const bySlug = new Map();
for (const file of files) {
  const slug = deriveSlug(file);
  bySlug.set(slug, file);
}

const manifest = [...bySlug.entries()].map(([slug, file]) => ({
  slug,
  displayName: formatDisplayName(slug),
  file
}));

const outputPath = join(DATA_DIR, 'manifest.json');
writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Manifest written: ${manifest.length} entries -> ${outputPath}`);
