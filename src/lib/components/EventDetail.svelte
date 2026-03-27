<script>
  import { createEventDispatcher } from 'svelte';
  import { resolveCharacterName, isGuest } from '$lib/helpers.js';

  export let event;
  export let episode;
  export let data;
  export let cast;
  export let editable = false;

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) close();
  }

  /** Resolve plotline id to name. */
  function resolvePlotlineName(plotlineId) {
    if (!plotlineId || !data?.plotlines) return null;
    const pl = data.plotlines.find((p) => p.id === plotlineId);
    return pl ? pl.name : plotlineId;
  }

  $: plotlineName = resolvePlotlineName(event.plotline_id || event.plotline || event.storyline);

  $: alsoAffectsNames = (event.also_affects || [])
    .map(resolvePlotlineName)
    .filter(Boolean);
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal-overlay" on:click={handleOverlayClick} role="presentation">
  <div class="modal">
    <div class="modal-header">
      <h2>{episode}</h2>
      {#if editable}
        <button class="btn btn-primary" on:click={() => dispatch('edit')}>Edit</button>
      {/if}
      <button class="btn side-panel-close" on:click={close}>&times;</button>
    </div>

    <div class="event-description">{event.event}</div>

    {#if plotlineName}
      <div class="detail-field">
        <span class="detail-label">Plotline</span>
        <div class="value">{plotlineName}</div>
      </div>
    {/if}

    {#if event.function}
      <div class="detail-field">
        <span class="detail-label">Function</span>
        <div class="value">
          <span class="fn-badge fn-{event.function}">{event.function}</span>
        </div>
      </div>
    {/if}

    {#if event.characters && event.characters.length > 0}
      <div class="detail-field">
        <span class="detail-label">Characters</span>
        <div class="value">
          {#each event.characters as charId, i}
            <span class:guest-char={isGuest(charId)}>{resolveCharacterName(charId, cast)}</span>{#if i < event.characters.length - 1},&nbsp;{/if}
          {/each}
        </div>
      </div>
    {/if}

    <div class="detail-field">
      <span class="detail-label">Also affects</span>
      <div class="value">
        {#if alsoAffectsNames.length > 0}
          {alsoAffectsNames.join(', ')}
        {:else}
          &mdash;
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .event-description {
    font-size: 1.1rem;
    line-height: 1.6;
    margin-bottom: 1.25rem;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 6px;
  }

  :global(:root.dark) .event-description {
    background: #1e1e2e;
  }

  .fn-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
  }
</style>
