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
