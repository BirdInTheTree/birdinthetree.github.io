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
