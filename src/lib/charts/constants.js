/** Narrative function tension weights — higher = more dramatic. */
export const FUNCTION_TENSION = {
  setup: 1,
  seed: 1,
  escalation: 2,
  turning_point: 3,
  climax: 4,
  cliffhanger: 4,
  resolution: 0.5
};

/** Ordered list of all narrative functions. */
export const ALL_FUNCTIONS = [
  'setup', 'seed', 'escalation', 'turning_point',
  'climax', 'resolution', 'cliffhanger'
];

/**
 * 12 visually distinct colors for plotlines.
 * Warm, saturated tones — neighbours differ in hue and lightness.
 */
export const STORYLINE_PALETTE = [
  '#E15759', // coral red
  '#4E79A7', // classic blue
  '#F28E2B', // warm amber
  '#76B7B2', // sage teal
  '#59A14F', // leaf green
  '#EDC948', // marigold
  '#B07AA1', // dusty plum
  '#FF9DA7', // blush pink
  '#9C755F', // cocoa
  '#BAB0AC', // warm gray
  '#86BCB6', // seafoam
  '#D37295'  // rose
];

/** Colors matching narrative function CSS classes. */
export const FUNCTION_COLORS = {
  setup: '#D4D4D4',
  escalation: '#F0E442',
  turning_point: '#56B4E9',
  seed: '#009E73',
  climax: '#D55E00',
  resolution: '#CC79A7',
  cliffhanger: '#E69F00'
};

/** Plotline rank sort order — lower is more important. */
export const RANK_ORDER = { A: 0, B: 1, C: 2, runner: 3 };

/** Narrative function weights — position in arc. */
export const FUNCTION_WEIGHTS = {
  setup: 1,
  catalyst: 2,
  escalation: 3,
  turning_point: 4,
  crisis: 5,
  climax: 6,
  resolution: 1,
  seed: 1,
  cliffhanger: 6
};

/** Legacy functions that may appear in older data. */
export const LEGACY_FUNCTIONS = ['seed', 'cliffhanger'];

/** Rank badge colors — consistent across all views. */
export const RANK_COLORS = {
  A: { bg: '#dbeafe', fg: '#1e40af', darkBg: '#1e3a5f', darkFg: '#7dd3fc' },
  B: { bg: '#fef3c7', fg: '#92400e', darkBg: '#433a2a', darkFg: '#f9e2af' },
  C: { bg: '#e5e7eb', fg: '#374151', darkBg: '#343434', darkFg: '#8a8a8a' },
  runner: { bg: '#f3e8ff', fg: '#6b21a8', darkBg: '#302040', darkFg: '#b07aa1' }
};
