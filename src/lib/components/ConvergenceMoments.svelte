<script>
  export let data;

  $: plNameMap = buildPlotlineNameMap(data?.plotlines || []);
  $: episodes = buildTimeline(data);

  function buildPlotlineNameMap(plotlines) {
    const map = {};
    for (const pl of plotlines) map[pl.id] = pl.name;
    return map;
  }

  /** Filter episodes to those with at least one interaction. */
  function buildTimeline(data) {
    if (!data?.episodes) return [];
    return data.episodes
      .filter(ep => ep.interactions && ep.interactions.length > 0)
      .map(ep => ({
        code: ep.episode,
        theme: ep.theme || '',
        interactions: ep.interactions
      }));
  }

  const TYPE_LABELS = {
    convergence: 'convergence',
    dramatic_irony: 'dramatic irony',
    thematic_rhyme: 'thematic rhyme'
  };
</script>

<div class="conv-timeline">
  <div class="conv-line"></div>

  {#if episodes.length === 0}
    <p style="color: var(--text-faint); font-style: italic;">No interactions found.</p>
  {/if}

  {#each episodes as ep}
    <div class="conv-ep-group">
      <div class="conv-ep-label">{ep.code}</div>

      {#each ep.interactions as interaction}
        <div class="conv-item">
          <span class="conv-type {interaction.type}">
            {TYPE_LABELS[interaction.type] || interaction.type}
          </span>
          <span class="conv-lines">
            {(interaction.lines || []).map(id => plNameMap[id] || id).join(' + ')}
          </span>
          <span class="conv-desc">{interaction.description}</span>
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .conv-timeline {
    position: relative;
    padding-left: 40px;
  }

  .conv-line {
    position: absolute;
    left: 17px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--border);
  }

  .conv-ep-group {
    margin-bottom: 16px;
  }

  .conv-ep-label {
    font-size: 1rem;
    color: var(--text);
    font-weight: 600;
    margin-bottom: 6px;
    position: relative;
  }

  .conv-ep-label::before {
    content: '';
    position: absolute;
    left: -28px;
    top: 50%;
    width: 10px;
    height: 10px;
    background: var(--accent);
    border-radius: 50%;
    transform: translateY(-50%);
  }

  .conv-item {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    margin-bottom: 4px;
    padding: 4px 8px;
    border-radius: 4px;
    background: var(--bg-secondary);
  }

  .conv-type {
    font-size: 0.875rem;
    padding: 2px 6px;
    border-radius: 3px;
    flex-shrink: 0;
    font-weight: 600;
    white-space: nowrap;
  }

  .conv-type.convergence { background: #f7768e20; color: #f7768e; }
  .conv-type.dramatic_irony { background: #bb9af720; color: #bb9af7; }
  .conv-type.thematic_rhyme { background: #7dcfff20; color: #7dcfff; }

  .conv-lines {
    color: var(--text);
    font-weight: 600;
    font-size: 1rem;
    flex-shrink: 0;
    min-width: 100px;
  }

  .conv-desc {
    font-size: 1rem;
    color: var(--text-muted);
  }
</style>
