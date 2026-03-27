<script>
  import { createEventDispatcher } from 'svelte';
  import { resolveCharacterName, plotlineCharacters, isGuest } from '$lib/helpers.js';

  export let plotline;
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

  $: driver = plotline.hero || plotline.driver
    ? resolveCharacterName(plotline.hero || plotline.driver, cast)
    : null;

  $: span = (plotline.span || []).join(', ');

  $: characters = plotlineCharacters(data, plotline.id);
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="side-panel-overlay" on:click={handleOverlayClick} role="presentation">
  <div class="side-panel">
    <div class="side-panel-header">
      <h2>{plotline.name}</h2>
      {#if editable}
        <button class="btn btn-primary" on:click={() => dispatch('edit')}>Edit</button>
      {/if}
      <button class="btn side-panel-close" on:click={close}>&times;</button>
    </div>

    <div class="badge-row">
      <span class="rank-badge rank-{plotline.rank.toLowerCase()}">{plotline.rank}</span>
      {#if plotline.type}
        <span class="type-badge">{plotline.type}</span>
      {/if}
      {#if plotline.nature}
        <span class="nature-badge">{plotline.nature}</span>
      {/if}
      {#if plotline.confidence}
        <span class="confidence-badge confidence-{plotline.confidence}">{plotline.confidence}</span>
      {/if}
    </div>

    {#if driver}
      <div class="detail-field">
        <span class="detail-label">Driver</span>
        <div class="value">{driver}</div>
      </div>
    {/if}

    {#if plotline.goal}
      <div class="detail-field">
        <span class="detail-label">Goal</span>
        <div class="value">{plotline.goal}</div>
      </div>
    {/if}

    {#if plotline.obstacle}
      <div class="detail-field">
        <span class="detail-label">Obstacle</span>
        <div class="value">{plotline.obstacle}</div>
      </div>
    {/if}

    {#if plotline.stakes}
      <div class="detail-field">
        <span class="detail-label">Stakes</span>
        <div class="value">{plotline.stakes}</div>
      </div>
    {/if}

    {#if span}
      <div class="detail-field">
        <span class="detail-label">Span</span>
        <div class="value">{span}</div>
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
  </div>
</div>

<style>
  .badge-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .type-badge,
  .nature-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
  }

  .type-badge {
    background: #e0f2fe;
    color: #0369a1;
  }

  .nature-badge {
    background: #fce7f3;
    color: #9d174d;
  }

  :global(:root.dark) .type-badge {
    background: #1e3a5f;
    color: #7dd3fc;
  }

  :global(:root.dark) .nature-badge {
    background: #4a1942;
    color: #f9a8d4;
  }
</style>
