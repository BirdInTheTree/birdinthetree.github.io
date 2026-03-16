import { readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'static', 'data');

const DISPLAY_NAMES = {
  'bb_s01': 'Breaking Bad S01',
  'csi_s01_v2': 'CSI S01',
  'er_s01_v2': 'ER S01',
  'gdr_s01': 'GDR S01',
  'got_s01': 'Game of Thrones S01',
  'house_s01_v3': 'House S01',
  'lost_s01': 'Lost S01',
  'madmen_s01': 'Mad Men S01',
  'major_s01': 'Major S01',
  'metod_s01': 'Metod S01',
  'slovo_patsana_s01_final': 'Slovo Patsana S01',
  'tiu_s01': 'This Is Us S01',
  'true_detective_s01': 'True Detective S01',
};

/**
 * Derive slug from filename.
 * "bb_s01_result.json" -> "bb_s01"
 * "csi_s01_result_v2.json" -> "csi_s01_v2"
 * "slovo_patsana_s01_final.json" -> "slovo_patsana_s01_final"
 */
function deriveSlug(filename) {
  const base = filename.replace('.json', '');

  // Versioned files: *_result_v2 -> strip "_result_" and rejoin with "_"
  const versionMatch = base.match(/^(.+)_result_(v\d+)$/);
  if (versionMatch) {
    return `${versionMatch[1]}_${versionMatch[2]}`;
  }

  // Standard files: *_result -> strip "_result"
  const resultMatch = base.match(/^(.+)_result$/);
  if (resultMatch) {
    return resultMatch[1];
  }

  // Non-result files (e.g. slovo_patsana_s01_final) — use base as-is
  return base;
}

const files = readdirSync(DATA_DIR)
  .filter(f => f.endsWith('.json') && f !== 'manifest.json')
  .sort();

const manifest = files.map(file => {
  const slug = deriveSlug(file);
  const displayName = DISPLAY_NAMES[slug];
  if (!displayName) {
    console.warn(`Warning: no display name for slug "${slug}" (file: ${file})`);
  }
  return { slug, displayName: displayName || slug, file };
});

const outputPath = join(DATA_DIR, 'manifest.json');
writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Manifest written: ${manifest.length} entries -> ${outputPath}`);
