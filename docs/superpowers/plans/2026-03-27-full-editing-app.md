# tvplot app: Full Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the read-only SvelteKit demo into a full editing application that works locally with adapter-node (file I/O, save/versioning) while preserving the static GitHub Pages demo via adapter-static.

**Architecture:** Dual-adapter SvelteKit app. An environment variable `ADAPTER` selects adapter-node (default for dev) or adapter-static (for GH Pages build). Server API routes under `src/routes/api/` handle filesystem operations. A reactive `editMode` store (derived from whether API is available) controls visibility of all editing UI. Components are shared — editing controls conditionally render based on `editMode`.

**Tech Stack:** SvelteKit 2, Svelte 5, adapter-node + adapter-static, Node.js fs for file I/O

---

## File Map

### New Files

| File | Responsibility |
|------|----------------|
| `src/lib/server/store.js` | Server-side AppStore: load directory, save with versioning, autosave, dirty tracking |
| `src/routes/api/manifest/+server.js` | GET: list available series from filesystem |
| `src/routes/api/series/[slug]/+server.js` | GET: load series data; PUT: update full series data |
| `src/routes/api/series/[slug]/save/+server.js` | POST: save as next version file |
| `src/lib/components/EventEditModal.svelte` | Modal for adding/editing events (description, plotline, function, characters, also_affects) |
| `src/lib/components/PlotlineEditPanel.svelte` | Side panel for editing plotline properties (name, rank, type, nature, hero, goal, obstacle, stakes) |
| `src/lib/components/MergeModal.svelte` | Modal for merging two plotlines |
| `src/lib/components/SplitModal.svelte` | Modal for splitting a plotline |
| `src/lib/editing.js` | Client-side data mutation helpers (recomputeSpan, slugify, uniqueSlug, applyMerge, applySplit) |

### Modified Files

| File | Changes |
|------|---------|
| `svelte.config.js` | Conditional adapter based on `ADAPTER` env var |
| `package.json` | Add `@sveltejs/adapter-node`, new scripts (`dev`, `build:static`, `build:node`) |
| `src/lib/stores/app.js` | Add `editMode`, `isDirty`, `toastMessage` stores |
| `src/lib/data/index.js` | Add API-based loading path (detect `/api/manifest` availability), cache invalidation on save |
| `src/routes/plotter-app/+page.svelte` | Add editing toolbar (Save, Merge, Split), wire editing modals |
| `src/lib/components/Grid.svelte` | Add empty cell click-to-add, edit button on event cards |
| `src/lib/components/PlotlineDetail.svelte` | Add "Edit" button that opens PlotlineEditPanel (when editMode) |
| `src/lib/components/EventDetail.svelte` | Add "Edit" button that opens EventEditModal (when editMode) |
| `src/app.css` | Add styles for editing forms, merge/split modals, dirty indicator, toast |

---

## Task 1: Dual-Adapter Setup

**Files:**
- Modify: `svelte.config.js`
- Modify: `package.json`

- [ ] **Step 1: Install adapter-node**

```bash
cd /Users/nvashko/Projects/1-projects/birdinthetree.github.io
npm install @sveltejs/adapter-node
```

- [ ] **Step 2: Update svelte.config.js for conditional adapter**

Replace the entire file:

```javascript
import adapterStatic from '@sveltejs/adapter-static';
import adapterNode from '@sveltejs/adapter-node';
import { mdsvex } from 'mdsvex';

const useStatic = process.env.ADAPTER === 'static';

const config = {
  extensions: ['.svelte', '.md'],
  preprocess: [
    mdsvex({ extensions: ['.md'] })
  ],
  kit: {
    adapter: useStatic
      ? adapterStatic({
          pages: 'build',
          assets: 'build',
          fallback: '404.html',
          precompress: false,
          strict: true
        })
      : adapterNode({
          out: 'build-node'
        }),
    paths: { base: '' }
  }
};

export default config;
```

- [ ] **Step 3: Update package.json scripts**

Replace the scripts section:

```json
{
  "scripts": {
    "dev": "vite dev",
    "build:manifest": "node scripts/build-manifest.js",
    "prebuild": "npm run build:manifest",
    "build": "ADAPTER=static vite build",
    "build:node": "vite build",
    "preview": "vite preview",
    "start": "node build-node"
  }
}
```

- [ ] **Step 4: Verify dev server still starts**

```bash
npm run dev -- --port 5174
```

Expected: Dev server starts on port 5174 without errors.

- [ ] **Step 5: Commit**

```bash
git add svelte.config.js package.json package-lock.json
git commit -m "Add adapter-node for local editing mode

Static adapter remains for GitHub Pages (ADAPTER=static).
Default dev/build uses adapter-node for filesystem access."
```

---

## Task 2: Server-Side Store (File I/O)

**Files:**
- Create: `src/lib/server/store.js`

- [ ] **Step 1: Create server store module**

```javascript
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
 * Load all *_result*.json files from a directory.
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/store.js
git commit -m "Add server-side store for filesystem operations

Handles directory scanning, versioned saves, autosave, and
dirty tracking. Used by API routes in adapter-node mode."
```

---

## Task 3: Server API Routes

**Files:**
- Create: `src/routes/api/manifest/+server.js`
- Create: `src/routes/api/series/[slug]/+server.js`
- Create: `src/routes/api/series/[slug]/save/+server.js`

- [ ] **Step 1: Create manifest API route**

```javascript
// src/routes/api/manifest/+server.js
import { json } from '@sveltejs/kit';
import { getManifest, loadDirectory, isInitialized } from '$lib/server/store.js';

export function GET() {
  if (!isInitialized()) {
    // Load from DATA_DIR env var or default to static/data
    const dir = process.env.DATA_DIR || 'static/data';
    loadDirectory(dir);
  }
  return json(getManifest());
}
```

- [ ] **Step 2: Create series data API route**

```javascript
// src/routes/api/series/[slug]/+server.js
import { json, error } from '@sveltejs/kit';
import { getSeriesData, updateSeriesData } from '$lib/server/store.js';

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
```

- [ ] **Step 3: Create save API route**

```javascript
// src/routes/api/series/[slug]/save/+server.js
import { json, error } from '@sveltejs/kit';
import { saveSeriesData } from '$lib/server/store.js';

export function POST({ params }) {
  const filename = saveSeriesData(params.slug);
  if (!filename) throw error(404, `Series '${params.slug}' not found`);
  return json({ filename });
}
```

- [ ] **Step 4: Verify API routes work in dev**

```bash
# Start dev server, then test:
curl http://localhost:5173/api/manifest
```

Expected: JSON array of series (or empty array if no DATA_DIR set). No 404 or 500 error.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/
git commit -m "Add API routes for manifest, series data, and save

GET /api/manifest - list available series
GET /api/series/[slug] - load series data with dirty state
PUT /api/series/[slug] - update series data in memory
POST /api/series/[slug]/save - save as next version file"
```

---

## Task 4: Client-Side Data Layer & Stores

**Files:**
- Modify: `src/lib/data/index.js`
- Modify: `src/lib/stores/app.js`

- [ ] **Step 1: Update data/index.js to support API-based loading**

Replace the entire file:

```javascript
let manifestCache = null;
const dataCache = new Map();
let useApi = null; // null = not checked, true/false after check

/**
 * Detect whether server API is available (adapter-node mode).
 * Caches the result after first check.
 */
async function detectApiMode() {
  if (useApi !== null) return useApi;
  try {
    const res = await fetch('/api/manifest');
    useApi = res.ok;
  } catch {
    useApi = false;
  }
  return useApi;
}

export async function loadManifest() {
  if (manifestCache) return manifestCache;

  const isApi = await detectApiMode();
  const url = isApi ? '/api/manifest' : '/data/manifest.json';
  const res = await fetch(url);
  manifestCache = await res.json();
  return manifestCache;
}

export async function loadSeriesData(slug, file) {
  if (dataCache.has(slug)) return dataCache.get(slug);

  const isApi = await detectApiMode();

  let data, isDirty;
  if (isApi) {
    const res = await fetch(`/api/series/${slug}`);
    const result = await res.json();
    data = result.data;
    isDirty = result.isDirty;
  } else {
    const res = await fetch(`/data/${file}`);
    data = await res.json();
    isDirty = false;
  }

  dataCache.set(slug, data);
  return { data, isDirty };
}

/** Send updated data to server. Only works in API mode. */
export async function updateSeriesData(slug, data) {
  dataCache.set(slug, data);
  if (!useApi) return;
  await fetch(`/api/series/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/** Save series to disk. Returns the new filename. */
export async function saveSeriesData(slug) {
  if (!useApi) return null;
  const res = await fetch(`/api/series/${slug}/save`, { method: 'POST' });
  const result = await res.json();
  return result.filename;
}

/** Clear cache for a slug (after save, to force reload). */
export function invalidateCache(slug) {
  dataCache.delete(slug);
}

/** Check if we're in editing (API) mode. */
export function isEditingMode() {
  return useApi === true;
}
```

- [ ] **Step 2: Update stores/app.js with editing stores**

Replace the entire file:

```javascript
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

const RANK_ORDER = { A: 0, B: 1, C: 2, runner: 3 };

export const currentSeries = writable(null);
export const manifest = writable([]);
export const seriesData = writable(null);
export const isLoading = writable(false);
export const selectedChars = writable(new Set());
export const activeFunctions = writable(new Set());

// Editing stores
export const editMode = writable(false);
export const isDirty = writable(false);
export const toastMessage = writable(null);

function getInitialTheme() {
  if (!browser) return 'light';
  return localStorage.getItem('theme') || 'light';
}

export const theme = writable(getInitialTheme());

// Sync theme to DOM and localStorage
if (browser) {
  theme.subscribe((value) => {
    document.documentElement.classList.toggle('dark', value === 'dark');
    localStorage.setItem('theme', value);
  });
}

/** Show a toast message that auto-dismisses after 3s. */
export function showToast(message) {
  toastMessage.set(message);
  if (browser) {
    setTimeout(() => toastMessage.set(null), 3000);
  }
}

/** Plotlines sorted by rank: A < B < C < runner */
export const sortedPlotlines = derived(seriesData, ($data) => {
  if (!$data?.plotlines) return [];
  return [...$data.plotlines].sort((a, b) => {
    const ra = RANK_ORDER[a.rank] ?? 99;
    const rb = RANK_ORDER[b.rank] ?? 99;
    return ra - rb;
  });
});

/** Episodes sorted by code (lexicographic works for SxxExx format) */
export const sortedEpisodes = derived(seriesData, ($data) => {
  if (!$data?.episodes) return [];
  return [...$data.episodes].sort((a, b) => a.episode.localeCompare(b.episode));
});
```

- [ ] **Step 3: Update plotter-app/+page.svelte to use new data API**

In `src/routes/plotter-app/+page.svelte`, update the `loadCurrentSeries` function and add edit mode detection:

Replace the `<script>` section:

```svelte
<script>
  import { onMount } from 'svelte';
  import { loadManifest, loadSeriesData, isEditingMode } from '$lib/data/index.js';
  import {
    manifest,
    currentSeries,
    seriesData,
    isLoading,
    selectedChars,
    activeFunctions,
    editMode,
    isDirty,
    theme
  } from '$lib/stores/app.js';
  import SeriesSelect from '$lib/components/SeriesSelect.svelte';
  import Filters from '$lib/components/Filters.svelte';
  import Grid from '$lib/components/Grid.svelte';
  import PlotlineDetail from '$lib/components/PlotlineDetail.svelte';
  import EventDetail from '$lib/components/EventDetail.svelte';

  $: cast = $seriesData?.cast || [];

  let selectedPlotline = null;
  let selectedEvent = null;
  let selectedEpisode = null;

  $: if ($currentSeries) {
    loadCurrentSeries($currentSeries);
  }

  async function loadCurrentSeries(slug) {
    const entry = $manifest.find((s) => s.slug === slug);
    if (!entry) return;

    isLoading.set(true);
    selectedChars.set(new Set());
    activeFunctions.set(new Set());

    const result = await loadSeriesData(slug, entry.file);
    seriesData.set(result.data);
    isDirty.set(result.isDirty);
    isLoading.set(false);
  }

  function toggleTheme() {
    theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  onMount(async () => {
    const items = await loadManifest();
    manifest.set(items);
    editMode.set(isEditingMode());
    if (items.length > 0) {
      currentSeries.set(items[0].slug);
    }
  });
</script>
```

The template section stays unchanged for now — editing UI will be added in Task 7.

- [ ] **Step 4: Update analytics page similarly**

In `src/routes/plotter-app/analytics/+page.svelte`, update the `loadCurrentSeries` function to use the new API:

Replace only the `loadCurrentSeries` function:

```javascript
  async function loadCurrentSeries(slug) {
    const entry = $manifest.find((s) => s.slug === slug);
    if (!entry) return;
    isLoading.set(true);
    const result = await loadSeriesData(slug, entry.file);
    seriesData.set(result.data);
    isLoading.set(false);
  }
```

And update the import:

```javascript
  import { loadManifest, loadSeriesData } from '$lib/data/index.js';
```

- [ ] **Step 5: Verify the read-only flow still works**

```bash
npm run dev -- --port 5174
# Open http://localhost:5174/plotter-app in browser
# Grid should still render with series data
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/index.js src/lib/stores/app.js src/routes/plotter-app/+page.svelte src/routes/plotter-app/analytics/+page.svelte
git commit -m "Add editing-aware data layer and stores

Data loading auto-detects API mode vs static mode.
New stores: editMode, isDirty, toastMessage.
Read-only flow preserved for adapter-static builds."
```

---

## Task 5: Client-Side Editing Helpers

**Files:**
- Create: `src/lib/editing.js`

- [ ] **Step 1: Create editing.js with data mutation helpers**

```javascript
/**
 * Client-side data mutation helpers for editing mode.
 * All functions operate on plain objects (the seriesData structure)
 * and return a new copy to trigger Svelte reactivity.
 */

/** Convert a plotline name to a snake_case slug. */
export function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_');
}

/** Generate a unique slug, appending _2, _3, etc. on collision. */
export function uniqueSlug(name, existingIds) {
  const base = slugify(name);
  if (!existingIds.has(base)) return base;
  let n = 2;
  while (existingIds.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/** Recompute span for a single plotline from episode events. */
export function recomputeSpan(data, plotlineId) {
  const span = [];
  for (const ep of data.episodes || []) {
    const hasEvent = (ep.events || []).some(
      e => (e.plotline_id || e.plotline || e.storyline) === plotlineId
    );
    if (hasEvent) span.push(ep.episode);
  }
  return span;
}

/** Recompute spans for all plotlines in-place. Returns data for chaining. */
export function recomputeAllSpans(data) {
  for (const pl of data.plotlines || []) {
    pl.span = recomputeSpan(data, pl.id);
  }
  return data;
}

/** Get the plotline field from an event (handles all field name variants). */
export function getEventPlotline(event) {
  return event.plotline_id || event.plotline || event.storyline || null;
}

/** Set the plotline field on an event (uses canonical 'plotline' field). */
export function setEventPlotline(event, plotlineId) {
  // Remove legacy field names, use canonical 'plotline'
  delete event.plotline_id;
  delete event.storyline;
  event.plotline = plotlineId;
}

/**
 * Apply a merge: combine two plotlines into one.
 * Returns new data object with merge applied.
 */
export function applyMerge(data, idA, idB, newPlotline) {
  const result = structuredClone(data);

  // Remove old plotlines, add new one
  result.plotlines = result.plotlines.filter(p => p.id !== idA && p.id !== idB);
  result.plotlines.push(newPlotline);

  // Reassign events
  for (const ep of result.episodes) {
    for (const ev of ep.events) {
      const plId = getEventPlotline(ev);
      if (plId === idA || plId === idB) {
        setEventPlotline(ev, newPlotline.id);
      }
      if (ev.also_affects) {
        ev.also_affects = ev.also_affects.map(
          x => (x === idA || x === idB) ? newPlotline.id : x
        );
      }
    }
  }

  return recomputeAllSpans(result);
}

/**
 * Apply a split: move selected events from source plotline to a new one.
 * eventKeys is a Set of "episode:eventIndex" strings.
 * Returns new data object with split applied.
 */
export function applySplit(data, sourceId, newPlotline, eventKeys) {
  const result = structuredClone(data);

  result.plotlines.push(newPlotline);

  for (const ep of result.episodes) {
    for (let i = 0; i < ep.events.length; i++) {
      const ev = ep.events[i];
      const key = `${ep.episode}:${i}`;
      if (eventKeys.has(key) && getEventPlotline(ev) === sourceId) {
        setEventPlotline(ev, newPlotline.id);
      }
    }
  }

  return recomputeAllSpans(result);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/editing.js
git commit -m "Add client-side editing helpers

slugify, uniqueSlug, recomputeSpan, applyMerge, applySplit.
Handles all plotline field name variants (plotline_id/plotline/storyline)."
```

---

## Task 6: Editing Components

**Files:**
- Create: `src/lib/components/EventEditModal.svelte`
- Create: `src/lib/components/PlotlineEditPanel.svelte`
- Create: `src/lib/components/MergeModal.svelte`
- Create: `src/lib/components/SplitModal.svelte`

- [ ] **Step 1: Create EventEditModal.svelte**

```svelte
<!-- src/lib/components/EventEditModal.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { resolveCharacterName, isGuest } from '$lib/helpers.js';
  import { getEventPlotline } from '$lib/editing.js';

  export let event = null;
  export let episode;
  export let eventIndex = -1;
  export let data;
  export let cast;
  export let isNew = false;

  const dispatch = createEventDispatcher();

  const FUNCTIONS = [
    'setup', 'inciting_incident', 'escalation', 'turning_point',
    'crisis', 'climax', 'resolution'
  ];

  let description = event?.event || '';
  let plotlineId = event ? getEventPlotline(event) || '' : '';
  let fn = event?.function || 'setup';
  let characters = new Set(event?.characters || []);
  let alsoAffects = new Set(event?.also_affects || []);

  function close() {
    dispatch('close');
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) close();
  }

  function toggleChar(charId) {
    const next = new Set(characters);
    if (next.has(charId)) next.delete(charId); else next.add(charId);
    characters = next;
  }

  function toggleAffects(plId) {
    const next = new Set(alsoAffects);
    if (next.has(plId)) next.delete(plId); else next.add(plId);
    alsoAffects = next;
  }

  function handleSave() {
    const updated = {
      event: description,
      plotline: plotlineId || null,
      function: fn,
      characters: [...characters],
      also_affects: alsoAffects.size > 0 ? [...alsoAffects] : null
    };
    dispatch('save', { event: updated, episode, eventIndex, isNew });
  }

  function handleDelete() {
    dispatch('delete', { episode, eventIndex });
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal-overlay" on:click={handleOverlayClick} role="presentation">
  <div class="modal modal-wide">
    <div class="modal-header">
      <h2>{isNew ? 'Add Event' : 'Edit Event'} — {episode}</h2>
      <button class="btn side-panel-close" on:click={close}>&times;</button>
    </div>

    <div class="form-group">
      <label class="form-label" for="event-desc">Description</label>
      <textarea id="event-desc" class="form-input" rows="3" bind:value={description} required></textarea>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="event-pl">Plotline</label>
        <select id="event-pl" class="form-input" bind:value={plotlineId}>
          <option value="">— Unassigned —</option>
          {#each data.plotlines as pl}
            <option value={pl.id}>{pl.name}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="event-fn">Function</label>
        <select id="event-fn" class="form-input" bind:value={fn}>
          {#each FUNCTIONS as f}
            <option value={f}>{f.replace(/_/g, ' ')}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="form-group">
      <span class="form-label">Characters</span>
      <div class="checkbox-grid">
        {#each cast as member}
          <label class="checkbox-item">
            <input type="checkbox" checked={characters.has(member.id)} on:change={() => toggleChar(member.id)} />
            {member.name}
          </label>
        {/each}
      </div>
    </div>

    <div class="form-group">
      <span class="form-label">Also Affects</span>
      <div class="checkbox-grid">
        {#each data.plotlines.filter(p => p.id !== plotlineId) as pl}
          <label class="checkbox-item">
            <input type="checkbox" checked={alsoAffects.has(pl.id)} on:change={() => toggleAffects(pl.id)} />
            {pl.name}
          </label>
        {/each}
      </div>
    </div>

    <div class="modal-actions">
      {#if !isNew}
        <button class="btn btn-danger" on:click={handleDelete}>Delete</button>
      {/if}
      <div style="flex:1"></div>
      <button class="btn" on:click={close}>Cancel</button>
      <button class="btn btn-primary" on:click={handleSave}>{isNew ? 'Add' : 'Save'}</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Create PlotlineEditPanel.svelte**

```svelte
<!-- src/lib/components/PlotlineEditPanel.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { plotlineCharacters, resolveCharacterName, isGuest } from '$lib/helpers.js';

  export let plotline;
  export let data;
  export let cast;

  const dispatch = createEventDispatcher();

  let name = plotline.name;
  let rank = plotline.rank;
  let type = plotline.type || 'serialized';
  let nature = plotline.nature || 'character-led';
  let confidence = plotline.confidence || 'solid';
  let hero = plotline.hero || plotline.driver || '';
  let goal = plotline.goal || '';
  let obstacle = plotline.obstacle || '';
  let stakes = plotline.stakes || '';

  $: characters = plotlineCharacters(data, plotline.id);

  function close() {
    dispatch('close');
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) close();
  }

  function handleSave() {
    dispatch('save', {
      id: plotline.id,
      name, rank, type, nature, confidence, hero, goal, obstacle, stakes
    });
  }

  function handleDelete() {
    dispatch('delete', { id: plotline.id });
  }

  function handleSplit() {
    dispatch('split', { plotline });
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="side-panel-overlay" on:click={handleOverlayClick} role="presentation">
  <div class="side-panel">
    <div class="side-panel-header">
      <h2>Edit Plotline</h2>
      <button class="btn side-panel-close" on:click={close}>&times;</button>
    </div>

    <div class="form-group">
      <label class="form-label" for="pl-name">Name</label>
      <input id="pl-name" class="form-input" bind:value={name} />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="pl-rank">Rank</label>
        <select id="pl-rank" class="form-input" bind:value={rank}>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="runner">Runner</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="pl-type">Type</label>
        <select id="pl-type" class="form-input" bind:value={type}>
          <option value="serialized">Serialized</option>
          <option value="episodic">Episodic</option>
          <option value="runner">Runner</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="pl-nature">Nature</label>
        <select id="pl-nature" class="form-input" bind:value={nature}>
          <option value="character-led">Character-led</option>
          <option value="plot-led">Plot-led</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="pl-conf">Confidence</label>
        <select id="pl-conf" class="form-input" bind:value={confidence}>
          <option value="solid">Solid</option>
          <option value="moderate">Moderate</option>
          <option value="tentative">Tentative</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="pl-hero">Hero</label>
      <select id="pl-hero" class="form-input" bind:value={hero}>
        <option value="">— None —</option>
        {#each cast as member}
          <option value={member.id}>{member.name}</option>
        {/each}
      </select>
    </div>

    <div class="form-group">
      <label class="form-label" for="pl-goal">Goal</label>
      <textarea id="pl-goal" class="form-input" rows="2" bind:value={goal}></textarea>
    </div>

    <div class="form-group">
      <label class="form-label" for="pl-obs">Obstacle</label>
      <textarea id="pl-obs" class="form-input" rows="2" bind:value={obstacle}></textarea>
    </div>

    <div class="form-group">
      <label class="form-label" for="pl-stakes">Stakes</label>
      <textarea id="pl-stakes" class="form-input" rows="2" bind:value={stakes}></textarea>
    </div>

    {#if plotline.span?.length > 0}
      <div class="detail-field">
        <span class="detail-label">Span</span>
        <div class="value">{plotline.span.join(', ')}</div>
      </div>
    {/if}

    {#if characters.length > 0}
      <div class="detail-field">
        <span class="detail-label">Characters</span>
        <div class="value">
          {#each characters as charId, i}
            <span class:guest-char={isGuest(charId)}>{resolveCharacterName(charId, cast)}</span>{#if i < characters.length - 1},&nbsp;{/if}
          {/each}
        </div>
      </div>
    {/if}

    <div class="modal-actions">
      <button class="btn btn-danger" on:click={handleDelete}>Delete</button>
      <button class="btn" on:click={handleSplit}>Split</button>
      <div style="flex:1"></div>
      <button class="btn" on:click={close}>Cancel</button>
      <button class="btn btn-primary" on:click={handleSave}>Save</button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Create MergeModal.svelte**

```svelte
<!-- src/lib/components/MergeModal.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';

  export let plotlineA;
  export let plotlineB;
  export let cast;

  const dispatch = createEventDispatcher();

  // Pre-populate from the higher-ranked plotline
  const RANK_ORDER = { A: 0, B: 1, C: 2, runner: 3 };
  $: primary = (RANK_ORDER[plotlineA.rank] ?? 99) <= (RANK_ORDER[plotlineB.rank] ?? 99)
    ? plotlineA : plotlineB;

  let name = primary.name;
  let rank = primary.rank;
  let type = primary.type || 'serialized';
  let nature = primary.nature || 'character-led';
  let confidence = primary.confidence || 'solid';
  let hero = primary.hero || primary.driver || '';
  let goal = primary.goal || '';
  let obstacle = primary.obstacle || '';
  let stakes = primary.stakes || '';

  function close() {
    dispatch('close');
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) close();
  }

  function handleMerge() {
    dispatch('merge', {
      idA: plotlineA.id,
      idB: plotlineB.id,
      plotline: { name, rank, type, nature, confidence, hero, goal, obstacle, stakes }
    });
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal-overlay" on:click={handleOverlayClick} role="presentation">
  <div class="modal modal-wide">
    <div class="modal-header">
      <h2>Merge Plotlines</h2>
      <button class="btn side-panel-close" on:click={close}>&times;</button>
    </div>

    <div class="merge-comparison">
      <div class="merge-side">
        <span class="rank-badge rank-{plotlineA.rank.toLowerCase()}">{plotlineA.rank}</span>
        <strong>{plotlineA.name}</strong>
        <p>{plotlineA.goal || ''}</p>
      </div>
      <div class="merge-arrow">&rarr;</div>
      <div class="merge-side">
        <span class="rank-badge rank-{plotlineB.rank.toLowerCase()}">{plotlineB.rank}</span>
        <strong>{plotlineB.name}</strong>
        <p>{plotlineB.goal || ''}</p>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="merge-name">Name</label>
      <input id="merge-name" class="form-input" bind:value={name} />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="merge-rank">Rank</label>
        <select id="merge-rank" class="form-input" bind:value={rank}>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="runner">Runner</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="merge-type">Type</label>
        <select id="merge-type" class="form-input" bind:value={type}>
          <option value="serialized">Serialized</option>
          <option value="episodic">Episodic</option>
          <option value="runner">Runner</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="merge-nature">Nature</label>
        <select id="merge-nature" class="form-input" bind:value={nature}>
          <option value="character-led">Character-led</option>
          <option value="plot-led">Plot-led</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="merge-hero">Hero</label>
        <select id="merge-hero" class="form-input" bind:value={hero}>
          <option value="">— None —</option>
          {#each cast as member}
            <option value={member.id}>{member.name}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="merge-goal">Goal</label>
      <textarea id="merge-goal" class="form-input" rows="2" bind:value={goal}></textarea>
    </div>

    <div class="form-group">
      <label class="form-label" for="merge-obs">Obstacle</label>
      <textarea id="merge-obs" class="form-input" rows="2" bind:value={obstacle}></textarea>
    </div>

    <div class="form-group">
      <label class="form-label" for="merge-stakes">Stakes</label>
      <textarea id="merge-stakes" class="form-input" rows="2" bind:value={stakes}></textarea>
    </div>

    <div class="modal-actions">
      <button class="btn" on:click={close}>Cancel</button>
      <button class="btn btn-primary" on:click={handleMerge}>Merge</button>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Create SplitModal.svelte**

```svelte
<!-- src/lib/components/SplitModal.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { getEventPlotline } from '$lib/editing.js';

  export let plotline;
  export let data;
  export let cast;

  const dispatch = createEventDispatcher();

  let name = '';
  let rank = 'C';
  let type = plotline.type || 'serialized';
  let nature = plotline.nature || 'character-led';
  let confidence = 'tentative';
  let hero = '';
  let goal = '';
  let obstacle = '';
  let stakes = '';
  let selectedEvents = new Set();

  // Events belonging to this plotline, grouped by episode
  $: eventsByEpisode = (data.episodes || [])
    .map(ep => ({
      episode: ep.episode,
      events: (ep.events || [])
        .map((ev, i) => ({ ...ev, globalIdx: i }))
        .filter(ev => getEventPlotline(ev) === plotline.id)
    }))
    .filter(g => g.events.length > 0);

  function close() {
    dispatch('close');
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) close();
  }

  function toggleEvent(episode, idx) {
    const key = `${episode}:${idx}`;
    const next = new Set(selectedEvents);
    if (next.has(key)) next.delete(key); else next.add(key);
    selectedEvents = next;
  }

  function handleSplit() {
    dispatch('split', {
      sourceId: plotline.id,
      eventKeys: selectedEvents,
      plotline: { name, rank, type, nature, confidence, hero, goal, obstacle, stakes }
    });
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal-overlay" on:click={handleOverlayClick} role="presentation">
  <div class="modal modal-wide">
    <div class="modal-header">
      <h2>Split: {plotline.name}</h2>
      <button class="btn side-panel-close" on:click={close}>&times;</button>
    </div>

    <div class="split-layout">
      <div class="split-events">
        <h3>Select events to move</h3>
        {#each eventsByEpisode as group}
          <div class="split-episode">
            <strong>{group.episode}</strong>
            {#each group.events as ev}
              <label class="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedEvents.has(`${group.episode}:${ev.globalIdx}`)}
                  on:change={() => toggleEvent(group.episode, ev.globalIdx)}
                />
                <span class="fn-badge fn-{ev.function}">{ev.function}</span>
                {ev.event.length > 80 ? ev.event.slice(0, 80) + '\u2026' : ev.event}
              </label>
            {/each}
          </div>
        {/each}
      </div>

      <div class="split-form">
        <h3>New plotline</h3>

        <div class="form-group">
          <label class="form-label" for="split-name">Name</label>
          <input id="split-name" class="form-input" bind:value={name} required />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="split-rank">Rank</label>
            <select id="split-rank" class="form-input" bind:value={rank}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="runner">Runner</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="split-type">Type</label>
            <select id="split-type" class="form-input" bind:value={type}>
              <option value="serialized">Serialized</option>
              <option value="episodic">Episodic</option>
              <option value="runner">Runner</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="split-hero">Hero</label>
          <select id="split-hero" class="form-input" bind:value={hero}>
            <option value="">— None —</option>
            {#each cast as member}
              <option value={member.id}>{member.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="split-goal">Goal</label>
          <textarea id="split-goal" class="form-input" rows="2" bind:value={goal}></textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="split-obs">Obstacle</label>
          <textarea id="split-obs" class="form-input" rows="2" bind:value={obstacle}></textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="split-stakes">Stakes</label>
          <textarea id="split-stakes" class="form-input" rows="2" bind:value={stakes}></textarea>
        </div>
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn" on:click={close}>Cancel</button>
      <button class="btn btn-primary" on:click={handleSplit} disabled={selectedEvents.size === 0 || !name}>
        Split ({selectedEvents.size} events)
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/EventEditModal.svelte src/lib/components/PlotlineEditPanel.svelte src/lib/components/MergeModal.svelte src/lib/components/SplitModal.svelte
git commit -m "Add editing components: event modal, plotline panel, merge, split

All components dispatch events to parent for data mutation.
Read-only components remain unchanged — editing components
are separate and conditionally rendered when editMode is true."
```

---

## Task 7: Wire Editing Into Main Page

**Files:**
- Modify: `src/routes/plotter-app/+page.svelte`
- Modify: `src/lib/components/Grid.svelte`
- Modify: `src/lib/components/PlotlineDetail.svelte`
- Modify: `src/lib/components/EventDetail.svelte`

- [ ] **Step 1: Rewrite plotter-app/+page.svelte with full editing flow**

Replace the entire file:

```svelte
<script>
  import { onMount } from 'svelte';
  import { loadManifest, loadSeriesData, updateSeriesData, saveSeriesData, isEditingMode } from '$lib/data/index.js';
  import {
    manifest, currentSeries, seriesData, isLoading,
    selectedChars, activeFunctions, editMode, isDirty,
    theme, showToast, toastMessage
  } from '$lib/stores/app.js';
  import {
    recomputeAllSpans, setEventPlotline, getEventPlotline,
    uniqueSlug, applyMerge, applySplit
  } from '$lib/editing.js';
  import SeriesSelect from '$lib/components/SeriesSelect.svelte';
  import Filters from '$lib/components/Filters.svelte';
  import Grid from '$lib/components/Grid.svelte';
  import PlotlineDetail from '$lib/components/PlotlineDetail.svelte';
  import EventDetail from '$lib/components/EventDetail.svelte';
  import PlotlineEditPanel from '$lib/components/PlotlineEditPanel.svelte';
  import EventEditModal from '$lib/components/EventEditModal.svelte';
  import MergeModal from '$lib/components/MergeModal.svelte';
  import SplitModal from '$lib/components/SplitModal.svelte';

  $: cast = $seriesData?.cast || [];

  // Selection state
  let selectedPlotline = null;
  let selectedEvent = null;
  let selectedEpisode = null;
  let selectedEventIndex = -1;

  // Editing modal state
  let editingPlotline = null;
  let editingEvent = null;
  let editingEpisode = null;
  let editingEventIndex = -1;
  let isNewEvent = false;

  // Merge mode state
  let mergeMode = false;
  let mergeSelection = [];
  let showMergeModal = false;

  // Split modal state
  let splitPlotline = null;

  $: if ($currentSeries) {
    loadCurrentSeries($currentSeries);
  }

  async function loadCurrentSeries(slug) {
    const entry = $manifest.find((s) => s.slug === slug);
    if (!entry) return;

    isLoading.set(true);
    selectedChars.set(new Set());
    activeFunctions.set(new Set());
    closeAllPanels();

    const result = await loadSeriesData(slug, entry.file);
    seriesData.set(result.data);
    isDirty.set(result.isDirty);
    isLoading.set(false);
  }

  function closeAllPanels() {
    selectedPlotline = null;
    selectedEvent = null;
    editingPlotline = null;
    editingEvent = null;
    splitPlotline = null;
    showMergeModal = false;
    mergeMode = false;
    mergeSelection = [];
  }

  function toggleTheme() {
    theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  // --- Data mutation helpers ---

  async function mutateData(fn) {
    const data = structuredClone($seriesData);
    fn(data);
    recomputeAllSpans(data);
    seriesData.set(data);
    isDirty.set(true);
    if ($currentSeries) {
      await updateSeriesData($currentSeries, data);
    }
  }

  async function handleSave() {
    if (!$currentSeries) return;
    const filename = await saveSeriesData($currentSeries);
    if (filename) {
      isDirty.set(false);
      showToast(`Saved as ${filename}`);
    }
  }

  // --- Event handlers ---

  function handleSelectPlotline(pl) {
    if (mergeMode) {
      if (mergeSelection.find(p => p.id === pl.id)) {
        mergeSelection = mergeSelection.filter(p => p.id !== pl.id);
      } else if (mergeSelection.length < 2) {
        mergeSelection = [...mergeSelection, pl];
        if (mergeSelection.length === 2) showMergeModal = true;
      }
      return;
    }
    selectedPlotline = pl;
  }

  function handleEditPlotline() {
    editingPlotline = selectedPlotline;
    selectedPlotline = null;
  }

  async function handleSavePlotline(detail) {
    await mutateData(data => {
      const pl = data.plotlines.find(p => p.id === detail.id);
      if (!pl) return;
      Object.assign(pl, {
        name: detail.name,
        rank: detail.rank,
        type: detail.type,
        nature: detail.nature,
        confidence: detail.confidence,
        hero: detail.hero,
        goal: detail.goal,
        obstacle: detail.obstacle,
        stakes: detail.stakes
      });
    });
    editingPlotline = null;
    showToast(`Plotline '${detail.name}' updated`);
  }

  async function handleDeletePlotline(detail) {
    const name = $seriesData.plotlines.find(p => p.id === detail.id)?.name;
    await mutateData(data => {
      data.plotlines = data.plotlines.filter(p => p.id !== detail.id);
      for (const ep of data.episodes) {
        for (const ev of ep.events) {
          if (getEventPlotline(ev) === detail.id) {
            setEventPlotline(ev, null);
          }
        }
      }
    });
    editingPlotline = null;
    showToast(`Plotline '${name}' deleted`);
  }

  function handleSelectEvent(event, episode) {
    selectedEvent = event;
    selectedEpisode = episode;
  }

  function handleEditEvent() {
    editingEvent = selectedEvent;
    editingEpisode = selectedEpisode;
    // Find event index within episode
    const ep = $seriesData.episodes.find(e => e.episode === selectedEpisode);
    editingEventIndex = ep ? ep.events.indexOf(selectedEvent) : -1;
    isNewEvent = false;
    selectedEvent = null;
  }

  function handleAddEvent(episode, plotlineId) {
    editingEvent = {
      event: '',
      plotline: plotlineId || null,
      function: 'setup',
      characters: [],
      also_affects: null
    };
    editingEpisode = episode;
    editingEventIndex = -1;
    isNewEvent = true;
  }

  async function handleSaveEvent(detail) {
    await mutateData(data => {
      const ep = data.episodes.find(e => e.episode === detail.episode);
      if (!ep) return;
      if (detail.isNew) {
        ep.events.push(detail.event);
      } else {
        ep.events[detail.eventIndex] = detail.event;
      }
    });
    editingEvent = null;
    showToast(detail.isNew ? 'Event added' : 'Event updated');
  }

  async function handleDeleteEvent(detail) {
    await mutateData(data => {
      const ep = data.episodes.find(e => e.episode === detail.episode);
      if (!ep) return;
      ep.events.splice(detail.eventIndex, 1);
    });
    editingEvent = null;
    showToast('Event deleted');
  }

  // --- Merge ---

  function toggleMergeMode() {
    mergeMode = !mergeMode;
    mergeSelection = [];
    showMergeModal = false;
  }

  async function handleMerge(detail) {
    const existingIds = new Set($seriesData.plotlines.map(p => p.id));
    const newId = uniqueSlug(detail.plotline.name, existingIds);
    const newPlotline = { id: newId, ...detail.plotline, span: [] };

    const newData = applyMerge($seriesData, detail.idA, detail.idB, newPlotline);
    seriesData.set(newData);
    isDirty.set(true);
    if ($currentSeries) {
      await updateSeriesData($currentSeries, newData);
    }

    showMergeModal = false;
    mergeMode = false;
    mergeSelection = [];
    showToast(`Merged into '${detail.plotline.name}'`);
  }

  // --- Split ---

  function handleRequestSplit(detail) {
    splitPlotline = detail.plotline;
    editingPlotline = null;
  }

  async function handleSplit(detail) {
    const existingIds = new Set($seriesData.plotlines.map(p => p.id));
    const newId = uniqueSlug(detail.plotline.name, existingIds);
    const newPlotline = { id: newId, ...detail.plotline, span: [] };

    const newData = applySplit($seriesData, detail.sourceId, newPlotline, detail.eventKeys);
    seriesData.set(newData);
    isDirty.set(true);
    if ($currentSeries) {
      await updateSeriesData($currentSeries, newData);
    }

    splitPlotline = null;
    showToast(`Split into '${detail.plotline.name}'`);
  }

  onMount(async () => {
    const items = await loadManifest();
    manifest.set(items);
    editMode.set(isEditingMode());
    if (items.length > 0) {
      currentSeries.set(items[0].slug);
    }
  });
</script>

<svelte:head>
  <title>tvplot app</title>
</svelte:head>

{#if $toastMessage}
  <div class="toast">{$toastMessage}</div>
{/if}

<div class="page">
  <div class="sticky-top">
    <div class="toolbar">
      <h1>
        <a href="https://github.com/BirdInTheTree/tvplotlines" class="toolbar-title-link">tvplot app</a>
        {#if $isDirty}
          <span class="dirty-indicator" title="Unsaved changes">&bull;</span>
        {/if}
      </h1>
      <div class="toolbar-actions">
        <SeriesSelect />
        {#if $seriesData?.context?.format}
          <span class="context-badge">{$seriesData.context.format}</span>
        {/if}
        {#if $editMode}
          <button class="btn" class:btn-active={mergeMode} on:click={toggleMergeMode}>
            {mergeMode ? 'Cancel Merge' : 'Merge'}
          </button>
          <button class="btn btn-primary" on:click={handleSave} disabled={!$isDirty}>
            Save
          </button>
        {/if}
        <a href="/plotter-app/analytics" class="btn">Analytics</a>
        <button class="btn" on:click={toggleTheme}>
          {$theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>
    </div>

    {#if mergeMode && mergeSelection.length > 0}
      <div class="merge-status">
        Selected: {mergeSelection.map(p => p.name).join(' + ')}
        {#if mergeSelection.length < 2} — click another plotline{/if}
      </div>
    {/if}

    {#if $seriesData}
      <Filters data={$seriesData} {cast} />
    {/if}
  </div>

  <Grid
    data={$seriesData}
    {cast}
    editable={$editMode}
    {mergeMode}
    mergeSelection={mergeSelection.map(p => p.id)}
    on:selectPlotline={(e) => handleSelectPlotline(e.detail)}
    on:selectEvent={(e) => handleSelectEvent(e.detail.event, e.detail.episode)}
    on:addEvent={(e) => handleAddEvent(e.detail.episode, e.detail.plotlineId)}
  />
</div>

<!-- Read-only panels -->
{#if selectedPlotline && !$editMode}
  <PlotlineDetail
    plotline={selectedPlotline}
    data={$seriesData}
    {cast}
    on:close={() => { selectedPlotline = null; }}
  />
{/if}

{#if selectedPlotline && $editMode}
  <PlotlineDetail
    plotline={selectedPlotline}
    data={$seriesData}
    {cast}
    editable
    on:close={() => { selectedPlotline = null; }}
    on:edit={handleEditPlotline}
  />
{/if}

{#if selectedEvent && !$editMode}
  <EventDetail
    event={selectedEvent}
    episode={selectedEpisode}
    data={$seriesData}
    {cast}
    on:close={() => { selectedEvent = null; selectedEpisode = null; }}
  />
{/if}

{#if selectedEvent && $editMode}
  <EventDetail
    event={selectedEvent}
    episode={selectedEpisode}
    data={$seriesData}
    {cast}
    editable
    on:close={() => { selectedEvent = null; selectedEpisode = null; }}
    on:edit={handleEditEvent}
  />
{/if}

<!-- Editing modals -->
{#if editingPlotline}
  <PlotlineEditPanel
    plotline={editingPlotline}
    data={$seriesData}
    {cast}
    on:close={() => { editingPlotline = null; }}
    on:save={(e) => handleSavePlotline(e.detail)}
    on:delete={(e) => handleDeletePlotline(e.detail)}
    on:split={(e) => handleRequestSplit(e.detail)}
  />
{/if}

{#if editingEvent}
  <EventEditModal
    event={editingEvent}
    episode={editingEpisode}
    eventIndex={editingEventIndex}
    data={$seriesData}
    {cast}
    isNew={isNewEvent}
    on:close={() => { editingEvent = null; }}
    on:save={(e) => handleSaveEvent(e.detail)}
    on:delete={(e) => handleDeleteEvent(e.detail)}
  />
{/if}

{#if showMergeModal && mergeSelection.length === 2}
  <MergeModal
    plotlineA={mergeSelection[0]}
    plotlineB={mergeSelection[1]}
    {cast}
    on:close={() => { showMergeModal = false; mergeSelection = []; }}
    on:merge={(e) => handleMerge(e.detail)}
  />
{/if}

{#if splitPlotline}
  <SplitModal
    plotline={splitPlotline}
    data={$seriesData}
    {cast}
    on:close={() => { splitPlotline = null; }}
    on:split={(e) => handleSplit(e.detail)}
  />
{/if}
```

- [ ] **Step 2: Update Grid.svelte to support editing interactions**

Add `editable`, `mergeMode`, `mergeSelection` props and empty cell click handler. Add `addEvent` event dispatch.

In the `<script>` section, add after existing props:

```javascript
  export let editable = false;
  export let mergeMode = false;
  export let mergeSelection = [];
```

Replace the empty cell `<td>` inside the episodes loop with:

```svelte
              <td
                class="event-cell"
                class:empty-cell={events.length === 0}
                class:clickable-empty={editable && events.length === 0}
                on:click={() => {
                  if (editable && events.length === 0) {
                    dispatch('addEvent', { episode: ep.episode, plotlineId: pl.id });
                  }
                }}
                on:keydown={() => {}}
                role={editable && events.length === 0 ? 'button' : undefined}
                tabindex={editable && events.length === 0 ? 0 : undefined}
              >
                {#each events as event}
                  <EventCard {event} on:select={() => dispatch('selectEvent', { event, episode: ep.episode })} />
                {/each}
                {#if editable && events.length === 0}
                  <span class="add-hint">+</span>
                {/if}
              </td>
```

Add merge selection highlighting to the plotline cell:

```svelte
            <td
              class="sticky-col plotline-cell"
              class:merge-selected={mergeMode && mergeSelection.includes(pl.id)}
              ...
```

- [ ] **Step 3: Update PlotlineDetail.svelte to support "Edit" button**

Add `editable` prop and "Edit" event:

After existing props, add:
```javascript
  export let editable = false;
```

Before the close button in the header, add:
```svelte
      {#if editable}
        <button class="btn btn-primary" on:click={() => dispatch('edit')}>Edit</button>
      {/if}
```

- [ ] **Step 4: Update EventDetail.svelte to support "Edit" button**

Same pattern. Add `editable` prop:
```javascript
  export let editable = false;
```

Add edit button before close button:
```svelte
      {#if editable}
        <button class="btn btn-primary" on:click={() => dispatch('edit')}>Edit</button>
      {/if}
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/plotter-app/+page.svelte src/lib/components/Grid.svelte src/lib/components/PlotlineDetail.svelte src/lib/components/EventDetail.svelte
git commit -m "Wire editing flow into main page

Full CRUD: add/edit/delete events, edit/delete plotlines,
merge and split plotlines. All mutations go through mutateData()
which updates stores, sends to API, and recomputes spans.
Grid shows + hint on empty cells in edit mode."
```

---

## Task 8: Editing CSS

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Add editing-specific styles**

Append to `src/app.css`:

```css
/* ── Editing styles ── */

/* Form elements */
.form-group { margin-bottom: 0.75rem; }
.form-label { display: block; font-weight: 600; font-size: 1rem; color: #666; margin-bottom: 0.25rem; }
.form-input { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; font-family: inherit; background: white; color: #0e0e0e; }
.form-input:focus { outline: none; border-color: #2d82cd; box-shadow: 0 0 0 2px rgba(45,130,205,0.2); }
textarea.form-input { resize: vertical; }
select.form-input { cursor: pointer; }
.form-row { display: flex; gap: 0.75rem; }
.form-row .form-group { flex: 1; }

/* Checkbox grid */
.checkbox-grid { display: flex; flex-wrap: wrap; gap: 0.25rem; }
.checkbox-item { display: flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.5rem; font-size: 1rem; cursor: pointer; border-radius: 4px; }
.checkbox-item:hover { background: #f3f4f6; }

/* Modal actions */
.modal-actions { display: flex; gap: 0.5rem; align-items: center; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e5e5e5; }
.modal-wide { max-width: 800px; }

/* Button variants */
.btn-primary { background: #2563eb; color: white; border-color: #2563eb; }
.btn-primary:hover { background: #1d4ed8; }
.btn-primary:disabled { opacity: 0.5; cursor: default; }
.btn-danger { background: #dc2626; color: white; border-color: #dc2626; }
.btn-danger:hover { background: #b91c1c; }
.btn-active { background: #2563eb; color: white; border-color: #2563eb; }

/* Dirty indicator */
.dirty-indicator { color: #f59e0b; font-size: 1.5rem; margin-left: 0.25rem; }

/* Toast */
.toast { position: fixed; top: 1rem; right: 1rem; z-index: 200; padding: 0.75rem 1.25rem; background: #065f46; color: white; border-radius: 8px; font-size: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.2); animation: toastIn 0.2s ease-out; }
@keyframes toastIn { from { transform: translateY(-1rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

/* Add hint in empty cells */
.clickable-empty { cursor: pointer; }
.clickable-empty:hover { background: #f0f4ff; border-style: solid; }
.add-hint { display: block; text-align: center; color: #9ca3af; font-size: 1.5rem; line-height: 2; }

/* Merge mode */
.merge-selected { outline: 3px solid #2563eb; outline-offset: -3px; }
.merge-status { padding: 0.5rem 1rem; background: #dbeafe; color: #1e40af; border-radius: 6px; margin-bottom: 0.5rem; font-size: 1rem; }

/* Merge comparison */
.merge-comparison { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; padding: 0.75rem; background: #f9fafb; border-radius: 6px; }
.merge-side { flex: 1; }
.merge-side p { font-size: 1rem; color: #666; margin-top: 0.25rem; }
.merge-arrow { font-size: 1.5rem; color: #9ca3af; }

/* Split layout */
.split-layout { display: flex; gap: 1.5rem; }
.split-events { flex: 1; max-height: 400px; overflow-y: auto; }
.split-form { flex: 1; }
.split-episode { margin-bottom: 0.75rem; }
.split-episode strong { display: block; margin-bottom: 0.25rem; }

/* Dark theme for editing */
:root.dark .form-input { background: #343434; color: #c6c6c6; border-color: #454545; }
:root.dark .form-input:focus { border-color: #2d82cd; }
:root.dark .form-label { color: #8a8a8a; }
:root.dark .checkbox-item:hover { background: #343434; }
:root.dark .modal-actions { border-top-color: #343434; }
:root.dark .merge-status { background: #243347; color: #7dd3fc; }
:root.dark .merge-comparison { background: #1e1e2e; }
:root.dark .merge-side p { color: #8a8a8a; }
:root.dark .clickable-empty:hover { background: #343434; }
:root.dark .add-hint { color: #555; }
:root.dark .toast { background: #1e3d2e; }
:root.dark .dirty-indicator { color: #f59e0b; }
```

- [ ] **Step 2: Commit**

```bash
git add src/app.css
git commit -m "Add editing CSS: forms, modals, merge, split, toast, dirty indicator

Full light/dark theme support for all editing elements."
```

---

## Task 9: End-to-End Verification

- [ ] **Step 1: Test static build (GitHub Pages mode)**

```bash
cd /Users/nvashko/Projects/1-projects/birdinthetree.github.io
npm run build
```

Expected: Builds successfully to `build/` directory. No errors about server routes.

- [ ] **Step 2: Preview static build**

```bash
npm run preview -- --port 5175
# Open http://localhost:5175/plotter-app
```

Expected: Read-only grid works. No Save/Merge buttons visible. Event cards clickable (detail modal). No editing controls.

- [ ] **Step 3: Test dev mode with real data**

```bash
DATA_DIR=/Users/nvashko/Projects/1-projects/tvplotlines-app/data/results npm run dev -- --port 5174
# Open http://localhost:5174/plotter-app
```

Expected:
- Grid loads with real series data from filesystem
- Save and Merge buttons visible in toolbar
- Click plotline → detail panel with "Edit" button
- Click event → detail modal with "Edit" button
- Click empty cell → add event modal
- Edit event → save → dirty indicator appears
- Click Save → toast with version filename → dirty indicator gone
- Merge mode → select 2 plotlines → merge modal

- [ ] **Step 4: Commit any fixes from testing**

---

## Task 10: Verify Static Build Excludes Server Code

- [ ] **Step 1: Check that server code is not in static build**

```bash
# Server code should NOT be in the build output
grep -r "readFileSync" build/ || echo "OK: no server code in static build"
```

Expected: "OK: no server code in static build"

- [ ] **Step 2: Verify API routes return 404 in static mode**

In the preview server (from Task 9 Step 2):

```bash
curl -s http://localhost:5175/api/manifest
```

Expected: 404 (API routes don't exist in static build).

- [ ] **Step 3: Final commit and summary**

If all tests pass, the implementation is complete.
