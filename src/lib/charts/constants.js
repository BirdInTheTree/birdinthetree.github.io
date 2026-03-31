/** Narrative function tension weights — higher = more dramatic. */
export const FUNCTION_TENSION = {
  setup: 1,
  inciting_incident: 2,
  escalation: 2,
  turning_point: 3,
  crisis: 4,
  climax: 4,
  resolution: 0.5
};

/** Ordered list of all narrative functions (current schema). */
export const ALL_FUNCTIONS = [
  'setup', 'inciting_incident', 'escalation', 'turning_point',
  'crisis', 'climax', 'resolution'
];

/**
 * 12 visually distinct colors for plotlines — Tokyo Night derived.
 * Each differs in hue and saturation to stay distinguishable on both themes.
 */
/** Monet Water Lilies (1916–1919) palette — 8 pigment-accurate colors. */
export const STORYLINE_PALETTE = [
  '#2a4a80', // deep azure — water
  '#6a4890', // cobalt violet — reflections
  '#3a7868', // viridian — lily pads
  '#2a5a3a', // forest green — vegetation
  '#d8c040', // cadmium yellow — lily accents
  '#c07890', // lily rose — flowers
  '#b89858', // warm ochre — light
  '#1a2848', // deep water — shadows
];

/**
 * Unified function color palette — 7 maximally distinct hues.
 * Every color occupies a different part of the spectrum.
 * Works on both light and dark backgrounds.
 */
/**
 * Narrative function colors — derived from Saul Bass "Man with the Golden Arm"
 * poster palette (teal, blue, purple) plus gold and matching purple.
 */
export const FUNCTION_COLORS = {
  setup:             '#888888', // neutral gray — calm start
  inciting_incident: '#d0a020', // gold — catalyst moment
  escalation:        '#a8a090', // muted warm gray — lots of these, stays quiet
  turning_point:     '#7038a8', // bright purple (poster)
  crisis:            '#2048a8', // royal blue (poster bottom)
  climax:            '#5c2882', // deep purple (poster bottom)
  resolution:        '#0098b0'  // teal cyan (poster top-left) — cool down
};

/** Plotline rank sort order — lower is more important. */
export const RANK_ORDER = { A: 0, B: 1, C: 2, runner: 3 };

/** Narrative function weights — position in arc. */
export const FUNCTION_WEIGHTS = {
  setup: 1,
  inciting_incident: 2,
  escalation: 3,
  turning_point: 4,
  crisis: 5,
  climax: 6,
  resolution: 7
};

/** Legacy functions from older data that may still appear. */
export const LEGACY_FUNCTIONS = ['seed', 'catalyst', 'cliffhanger'];

/** Rank badge colors — consistent across all views. */
export const RANK_COLORS = {
  A: { bg: '#dbeafe', fg: '#1e40af', darkBg: '#1e3a5f', darkFg: '#7dd3fc' },
  B: { bg: '#fef3c7', fg: '#92400e', darkBg: '#433a2a', darkFg: '#f9e2af' },
  C: { bg: '#e5e7eb', fg: '#374151', darkBg: '#343434', darkFg: '#8a8a8a' },
  runner: { bg: '#f3e8ff', fg: '#6b21a8', darkBg: '#302040', darkFg: '#b07aa1' }
};
