# Analytics Visualization Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace current analytics charts with 4 new visualizations (Fractal Arc Map, Episode Balance absolute, Convergence directed, Arc Completeness), switch to Blue Topaz theme, unified plotline color system.

**Architecture:** Client-side post-processing computes storyline arcs from flat event data. All charts use the same plotline color palette and rank badge system from constants.js. Arc Map and Arc Completeness work with whatever function set is in the data (currently 7 old functions; when pipeline updates to new 7, charts adapt automatically via ALL_FUNCTIONS constant). Blue Topaz replaces Catppuccin in CSS variables.

**Tech Stack:** SvelteKit, Chart.js (Episode Balance), D3.js (Convergence), Canvas 2D (Arc Map, Arc Completeness, Plotline Span)

**Spec:** `3-resources/github-io-analytics-visualization-redesign.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/charts/constants.js` | Modify | Blue Topaz tokens, function weights, rank badge colors |
| `src/lib/charts/postprocess.js` | Create | Compute storyline arcs, season arc, convergence matrix from flat events |
| `src/lib/charts/arcMap.js` | Create | Fractal Arc Map — custom canvas renderer |
| `src/lib/charts/arcCompleteness.js` | Create | Arc Completeness — custom canvas renderer |
| `src/lib/charts/episodeBalance.js` | Modify | Switch from 100% to absolute counts |
| `src/lib/components/ConvergenceMap.svelte` | Modify | Directed matrix (asymmetric), row/col totals |
| `src/routes/plotter-app/analytics/+page.svelte` | Modify | New chart lineup, remove old charts |
| `src/app.css` | Modify | Blue Topaz color tokens |
| `src/lib/charts/functionDistribution.js` | Delete | Replaced by Arc Map |
| `src/lib/components/CharacterNetwork.svelte` | Delete | Removed per spec |

---

## Chunk 1: Blue Topaz Theme + Constants Update

### Task 1.1: Replace Catppuccin with Blue Topaz in CSS

**Files:**
- Modify: `src/app.css` (lines 1-13 for CSS vars, all `:root.dark` rules)

- [ ] Replace CSS custom properties in `:root` and `:root.dark` with Blue Topaz tokens:

```css
/* Blue Topaz theme */
:root {
  --chart-bg: #ffffff;
  --chart-fg: #0e0e0e;
  --chart-grid: #dddddd;
  --chart-tooltip-bg: #0e0e0e;
  --bg: #ffffff;
  --bg-surface: #fcfcfc;
  --border: #dddddd;
  --fg: #0e0e0e;
  --fg-muted: #7f7f7f;
  --fg-faint: #7f7f7f;
  --accent: #468eeb;
  --error: #e75545;
  --success: #A4E7C3;
}
:root.dark {
  --chart-bg: #202020;
  --chart-fg: #c6c6c6;
  --chart-grid: #343434;
  --chart-tooltip-bg: #151515;
  --bg: #202020;
  --bg-surface: #151515;
  --border: #343434;
  --fg: #c6c6c6;
  --fg-muted: #8a8a8a;
  --fg-faint: #797979;
  --accent: #2d82cd;
  --error: #e16d76;
  --success: #539126;
}
```

- [ ] Update all `:root.dark` rules throughout app.css to use Blue Topaz colors instead of Catppuccin (#1e1e2e → #202020, #181825 → #151515, #cdd6f4 → #c6c6c6, #313244 → #343434, #45475a → #454545, #a6adc8 → #8a8a8a, #cba6f7 → #2d82cd, #f5c2e7 → #c6c6c6, #11111b → #101010). Full search-and-replace of all Catppuccin hex values.

- [ ] Update `body` background (#f5f5f5 → #ffffff) and color (#1a1a1a → #0e0e0e) in light mode.

- [ ] Verify: `npm run build` passes.

- [ ] Commit: `git commit -m "Switch from Catppuccin to Blue Topaz theme"`

### Task 1.2: Update constants.js with rank badge colors and function set

**Files:**
- Modify: `src/lib/charts/constants.js`

- [ ] Update constants to support both old and new function sets, with Blue Topaz-compatible colors:

```js
/** Narrative function weights — position in arc. */
export const FUNCTION_WEIGHTS = {
  setup: 1,
  catalyst: 2,
  escalation: 3,
  turning_point: 4,
  crisis: 5,
  climax: 6,
  resolution: 1,
  // Legacy functions mapped to closest equivalent weight
  seed: 1,
  cliffhanger: 6
};

/** Ordered list of all narrative functions (reads from data at runtime). */
export const ALL_FUNCTIONS = [
  'setup', 'catalyst', 'escalation', 'turning_point',
  'crisis', 'climax', 'resolution'
];

/** Legacy functions that may appear in older data. */
export const LEGACY_FUNCTIONS = ['seed', 'cliffhanger'];

/** Rank badge colors — consistent across all views. */
export const RANK_COLORS = {
  A: { bg: '#dbeafe', fg: '#1e40af', darkBg: '#1e3a5f', darkFg: '#7dd3fc' },
  B: { bg: '#fef3c7', fg: '#92400e', darkBg: '#433a2a', darkFg: '#f9e2af' },
  C: { bg: '#e5e7eb', fg: '#374151', darkBg: '#343434', darkFg: '#8a8a8a' },
  runner: { bg: '#f3e8ff', fg: '#6b21a8', darkBg: '#302040', darkFg: '#b07aa1' }
};
```

- [ ] Keep existing `STORYLINE_PALETTE`, `FUNCTION_COLORS`, `RANK_ORDER` unchanged (other code depends on them).

- [ ] Commit: `git commit -m "Add function weights, rank badge colors, legacy function support"`

---

## Chunk 2: Post-Processing Module

### Task 2.1: Create postprocess.js — compute arcs from flat events

**Files:**
- Create: `src/lib/charts/postprocess.js`

This module takes raw series data and computes derived structures. Pure functions, no DOM.

- [ ] Create `src/lib/charts/postprocess.js`:

```js
import { FUNCTION_WEIGHTS, RANK_ORDER } from './constants.js';

/**
 * Build storyline arc: group events by function into phases.
 * Returns ordered list of { function, episodes, eventCount }.
 */
export function buildStorylineArc(data, plotlineId) {
  const events = [];
  for (const ep of data.episodes || []) {
    const sorted = [...(ep.events || [])];
    for (const ev of sorted) {
      if (ev.storyline === plotlineId) {
        events.push({ ...ev, episode: ep.episode });
      }
    }
  }

  // Sort by episode order
  events.sort((a, b) => a.episode.localeCompare(b.episode));

  // Group consecutive same-function events into phases
  const phases = [];
  for (const ev of events) {
    const fn = ev.function || 'setup';
    const last = phases[phases.length - 1];
    if (last && last.function === fn) {
      last.episodes.add(ev.episode);
      last.eventCount++;
    } else {
      phases.push({
        function: fn,
        episodes: new Set([ev.episode]),
        eventCount: 1
      });
    }
  }

  return phases.map((p) => ({
    function: p.function,
    episodes: [...p.episodes],
    eventCount: p.eventCount
  }));
}

/**
 * Build all storyline arcs for a series.
 * Returns Map<plotlineId, phases[]>.
 */
export function buildAllArcs(data) {
  const arcs = new Map();
  for (const pl of data.plotlines || []) {
    arcs.set(pl.id, buildStorylineArc(data, pl.id));
  }
  return arcs;
}

/**
 * Arc completeness: which distinct functions are present per plotline.
 * Returns Map<plotlineId, Set<functionName>>.
 */
export function buildArcCompleteness(data) {
  const result = new Map();
  for (const pl of data.plotlines || []) {
    const funcs = new Set();
    for (const ep of data.episodes || []) {
      for (const ev of ep.events || []) {
        if (ev.storyline === pl.id && ev.function) {
          funcs.add(ev.function);
        }
      }
    }
    result.set(pl.id, funcs);
  }
  return result;
}

/**
 * Directed convergence matrix from also_affects links.
 * Returns { matrix: number[][], plotlineIds: string[] }
 * matrix[i][j] = count of events from plotline i that affect plotline j.
 */
export function buildConvergenceMatrix(data) {
  const plotlines = [...(data.plotlines || [])].sort(
    (a, b) => (RANK_ORDER[a.rank] ?? 99) - (RANK_ORDER[b.rank] ?? 99)
  );
  const ids = plotlines.map((p) => p.id);
  const idToIdx = {};
  ids.forEach((id, i) => { idToIdx[id] = i; });
  const n = ids.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));

  for (const ep of data.episodes || []) {
    for (const ev of ep.events || []) {
      const src = ev.storyline;
      if (!src || !(src in idToIdx) || !ev.also_affects) continue;
      for (const tgt of ev.also_affects) {
        if (tgt in idToIdx && tgt !== src) {
          matrix[idToIdx[src]][idToIdx[tgt]]++;
        }
      }
    }
  }

  return { matrix, plotlineIds: ids };
}
```

- [ ] Commit: `git commit -m "Add post-processing: storyline arcs, completeness, directed convergence"`

---

## Chunk 3: Episode Balance — Absolute Counts

### Task 3.1: Rewrite episodeBalance.js to use absolute counts

**Files:**
- Modify: `src/lib/charts/episodeBalance.js`

- [ ] Replace 100% stacked bars with absolute count stacked bars:

Key changes:
- Remove percentage conversion — `data` array uses raw counts directly
- Y-axis: event count (no max: 100, no '%' suffix)
- Y-axis title: "Event count" instead of "Share of events (%)"
- Bar labels: show count inside segment (already does this, just remove percentage from tooltip)
- X-axis: horizontal labels (`maxRotation: 0`), show episode code only (no theme in label — too long)

```js
// datasets use raw counts, not percentages
const datasets = plotlines.map((pl, pIdx) => ({
  label: pl.name,
  data: rawCounts[pIdx],
  backgroundColor: colors[pl.id],
  borderWidth: 0
}));

const labels = episodes.map((ep) => ep.episode);
```

Options changes:
```js
y: {
  stacked: true,
  title: { display: true, text: 'Event count', font: { size: 16 } },
  beginAtZero: true,
  ticks: { font: { size: 16 } }
}
```

Tooltip callback:
```js
label(ctx) {
  const raw = ctx.raw ?? 0;
  return `${ctx.dataset.label}: ${raw} events`;
}
```

- [ ] Verify: `npm run build` passes.

- [ ] Commit: `git commit -m "Episode Balance: switch from 100% to absolute event counts"`

---

## Chunk 4: Convergence — Directed Matrix with Totals

### Task 4.1: Rewrite ConvergenceMap to use directed matrix

**Files:**
- Modify: `src/lib/components/ConvergenceMap.svelte`

- [ ] Replace symmetric matrix build with import from postprocess.js:

```js
import { buildConvergenceMatrix } from '$lib/charts/postprocess.js';
```

- [ ] In `drawHeatmap()`: use `buildConvergenceMatrix(seriesData)` instead of inline symmetric matrix computation.

- [ ] Add row totals ("sends X") and column totals ("receives Y"):
  - Right of each row: total of row values
  - Below each column: total of column values

- [ ] X-axis labels: horizontal (already fixed in bug pass), truncated with tooltip.

- [ ] Cell labels: show count if > 0, "—" if 0.

- [ ] Diagonal: masked gray (already done).

- [ ] Font sizes: all 16px minimum (already fixed).

- [ ] Commit: `git commit -m "Convergence: directed matrix with row/column totals"`

---

## Chunk 5: Arc Completeness Chart

### Task 5.1: Create arcCompleteness.js

**Files:**
- Create: `src/lib/charts/arcCompleteness.js`

- [ ] Custom canvas renderer. Shows which of the 7 functions are present per plotline.

Layout:
- Rows: plotlines sorted by rank (A→runner)
- Columns: 7 functions (from ALL_FUNCTIONS constant + any legacy functions found in data)
- Cell: filled (function present) with plotline color, or faint outline (missing)
- Right column: "5/7" count
- Row label: "[A] Empire" — left side

```js
import { sortPlotlines, buildColorMap } from './helpers.js';
import { buildArcCompleteness } from './postprocess.js';
import { ALL_FUNCTIONS, LEGACY_FUNCTIONS } from './constants.js';

export function buildArcCompleteness(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const colors = buildColorMap(plotlines);
  const completeness = buildArcCompleteness(data);

  // Detect which functions actually appear in data
  const allFuncsInData = new Set();
  for (const funcs of completeness.values()) {
    for (const f of funcs) allFuncsInData.add(f);
  }
  const columns = [...ALL_FUNCTIONS, ...LEGACY_FUNCTIONS].filter(
    (f) => allFuncsInData.has(f)
  );

  return { type: 'custom-canvas', render: renderCompleteness };

  function renderCompleteness(canvas) { ... }
}
```

Canvas rendering:
- 16px minimum fonts everywhere
- Each cell: 50×36px, rounded rect
- Filled cells: plotline color at 0.7 alpha
- Empty cells: dashed 1px border, same color at 0.15 alpha
- Function names as column headers (no rotation)
- Plotline labels with rank badge on left
- Count column on right ("5/7")
- WCAG contrast: white text if bg luminance < 50%

- [ ] Commit: `git commit -m "Add Arc Completeness chart: phase presence per plotline"`

---

## Chunk 6: Fractal Arc Map

### Task 6.1: Create arcMap.js

**Files:**
- Create: `src/lib/charts/arcMap.js`

- [ ] Custom canvas renderer. Three-level arc visualization:

**Level 1 — Season arc (top row):** A-plotline's phases, full width.
**Level 2 — Storyline arcs (middle rows):** one row per plotline, cells = phases.

Grid layout:
- Columns: distinct functions found in data (dynamically computed, not hardcoded 7)
- ACT labels above: ACT 1 (setup, catalyst), ACT 2 (escalation, turning_point, crisis), ACT 3 (climax, resolution)
- Each cell: episode range + event count
- Empty phase: dashed border, "—"
- Phase intensity: opacity scales with event count (more events = more opaque)

```js
import { sortPlotlines, buildColorMap } from './helpers.js';
import { buildAllArcs } from './postprocess.js';
import { ALL_FUNCTIONS, LEGACY_FUNCTIONS, FUNCTION_WEIGHTS } from './constants.js';

export function buildArcMap(data) {
  const plotlines = sortPlotlines(data.plotlines || []);
  const colors = buildColorMap(plotlines);
  const arcs = buildAllArcs(data);

  // Determine which functions appear in data
  const funcsInData = new Set();
  for (const phases of arcs.values()) {
    for (const p of phases) funcsInData.add(p.function);
  }
  const columns = [...ALL_FUNCTIONS, ...LEGACY_FUNCTIONS].filter(
    (f) => funcsInData.has(f)
  );

  // Build grid: for each plotline, map function → aggregated phase info
  // A plotline may have multiple non-consecutive phases of same function;
  // merge them for display (sum events, union episodes)
  function mergePhases(phases) {
    const merged = {};
    for (const p of phases) {
      if (!merged[p.function]) {
        merged[p.function] = { episodes: new Set(), eventCount: 0 };
      }
      for (const ep of p.episodes) merged[p.function].episodes.add(ep);
      merged[p.function].eventCount += p.eventCount;
    }
    return merged;
  }

  return { type: 'custom-canvas', render: renderArcMap };

  function renderArcMap(canvas) { ... }
}
```

Canvas rendering details:
- Season row: blue gradient, intensity = FUNCTION_WEIGHTS[fn] / 6
- Storyline rows: plotline palette color, opacity = eventCount / maxCount per plotline
- Cell text: episode range (first..last), event count below
- Text contrast: auto-computed via WCAG luminance formula
- 16px minimum fonts
- Left labels: "[A] Empire" — same style as plotlineSpan
- ACT dividers: thin vertical lines between act groups

- [ ] Commit: `git commit -m "Add Fractal Arc Map: season and storyline arc phases"`

### Task 6.2: Wire new charts into analytics page

**Files:**
- Modify: `src/routes/plotter-app/analytics/+page.svelte`
- Delete: `src/lib/charts/functionDistribution.js`
- Delete: `src/lib/components/CharacterNetwork.svelte`

- [ ] Remove imports: `CharacterNetwork`, `buildFunctionDistribution`

- [ ] Add imports: `buildArcMap` from arcMap.js, `buildArcCompleteness` (renamed to avoid conflict) from arcCompleteness.js

- [ ] Update reactive declarations:
```js
$: arcMapChart = $seriesData ? buildArcMap($seriesData) : null;
$: completenessChart = $seriesData ? buildArcCompletenessChart($seriesData) : null;
```

- [ ] Replace charts array with new lineup (ordered general → specific):
```js
const charts = [
  { key: 'arcMap', title: 'Fractal Arc Map', desc: 'How each storyline develops across the season. Columns are narrative phases, rows are plotlines. Season arc (top) follows the A-storyline. Cell intensity reflects event density.', type: 'custom-canvas' },
  { key: 'balance', title: 'Episode Balance', desc: 'Event count per plotline per episode. Bar height shows total density — a 24-event episode towers over a 5-event one.', type: 'bar' },
  { key: 'convergence', title: 'Convergence', desc: 'Directed storyline interactions via also_affects links. Row → column shows how many events from source storyline affect target. Asymmetric: A→B ≠ B→A.', type: 'd3-heatmap' },
  { key: 'completeness', title: 'Arc Completeness', desc: 'Which narrative phases each plotline covers. Filled cells = phase present, empty = missing. Score on right shows structural completeness.', type: 'custom-canvas' },
  { key: 'span', title: 'Plotline Span', desc: 'Which episodes each plotline appears in. Cells show event counts. Intensity reflects rank and event density.', type: 'custom-canvas' }
];
```

- [ ] Update `getChartConfig()` to handle new keys.

- [ ] Remove `{:else if chart.type === 'd3-bipartite'}` block.

- [ ] Delete `src/lib/charts/functionDistribution.js` and `src/lib/components/CharacterNetwork.svelte`.

- [ ] Verify: `npm run build` passes.

- [ ] Commit: `git commit -m "Wire new analytics charts, remove Function Distribution and Character Network"`

---

## Chunk 7: Cleanup + Verify

### Task 7.1: Final build and visual check

- [ ] `npm run build` — verify clean build with no warnings
- [ ] `npm run preview` — manually check all 5 charts render in both light and dark mode
- [ ] Verify: series switching updates all charts
- [ ] Verify: no diagonal text anywhere
- [ ] Verify: minimum 16px fonts on all chart elements

- [ ] Commit any final fixes.

- [ ] `git push`
