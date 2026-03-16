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
