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
