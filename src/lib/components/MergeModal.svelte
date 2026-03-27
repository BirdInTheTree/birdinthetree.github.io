<script>
  import { createEventDispatcher } from 'svelte';

  export let plotlineA;
  export let plotlineB;
  export let cast;

  const dispatch = createEventDispatcher();

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
