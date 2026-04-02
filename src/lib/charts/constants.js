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
 * 12 visually distinct colors for plotlines — Tokyo Night rainbow.
 * Uses night-theme colors (brighter, work on both light and dark backgrounds).
 */
export const STORYLINE_PALETTE = [
  '#7aa2f7', // blue
  '#e0af68', // yellow
  '#9ece6a', // green
  '#7dcfff', // cyan
  '#bb9af7', // magenta
  '#ff9e64', // orange
  '#f7768e', // red
  '#2ac3de', // blue1
  '#73daca', // green1/teal
  '#9d7cd8', // purple
  '#b4f9f8', // blue6
  '#db4b4b', // red1
];

/**
 * Narrative function colors — Tokyo Night derived.
 * Night-theme colors for visibility on both backgrounds.
 */
export const FUNCTION_COLORS = {
  setup:             '#565f89', // muted gray — calm start
  inciting_incident: '#e0af68', // yellow — catalyst moment
  escalation:        '#a9b1d6', // muted blue-gray — lots of these, stays quiet
  turning_point:     '#bb9af7', // magenta — dramatic shift
  crisis:            '#7aa2f7', // blue — rising stakes
  climax:            '#f7768e', // red — peak moment
  resolution:        '#9ece6a'  // green — cool down
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

/** Rank badge colors — Tokyo Night palette, consistent across all views. */
export const RANK_COLORS = {
  A: { bg: '#3d59a120', fg: '#7aa2f7', darkBg: '#3d59a130', darkFg: '#7aa2f7' },
  B: { bg: '#e0af6820', fg: '#8c6c3e', darkBg: '#e0af6830', darkFg: '#e0af68' },
  C: { bg: '#565f8920', fg: '#6172b0', darkBg: '#565f8930', darkFg: '#a9b1d6' },
  runner: { bg: '#bb9af720', fg: '#7847bd', darkBg: '#bb9af730', darkFg: '#bb9af7' }
};
