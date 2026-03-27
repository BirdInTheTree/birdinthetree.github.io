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
