<script>
  export let data;

  $: episodes = buildTimeline(data);

  /** Map plotline IDs to names for display. */
  $: plNameMap = buildPlotlineNameMap(data?.plotlines || []);

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

<div class="convergence-moments">
  {#if episodes.length === 0}
    <p class="empty">No interactions found.</p>
  {/if}

  {#each episodes as ep}
    <div class="episode-group">
      <div class="episode-header">
        <span class="ep-code">{ep.code}</span>
        {#if ep.theme}
          <span class="ep-theme"><em>{ep.theme}</em></span>
        {/if}
      </div>

      <div class="interactions">
        {#each ep.interactions as interaction}
          <div class="interaction">
            <span class="type-badge type-{interaction.type}">
              {TYPE_LABELS[interaction.type] || interaction.type}
            </span>
            <span class="plotlines-involved">
              {(interaction.lines || []).map(id => plNameMap[id] || id).join(' + ')}
            </span>
            <p class="interaction-desc">{interaction.description}</p>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .convergence-moments {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .empty {
    color: var(--text-faint);
    font-style: italic;
  }

  .episode-group {
    border-left: 3px solid var(--border);
    padding-left: 1rem;
  }

  .episode-header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .ep-code {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--text);
  }

  .ep-theme {
    font-size: 0.82rem;
    color: var(--text-faint);
  }

  .interactions {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .interaction {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.4rem;
  }

  .type-badge {
    display: inline-block;
    padding: 0.1rem 0.45rem;
    border-radius: 3px;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }

  .type-convergence {
    background: hsla(0, 65%, 55%, 0.18);
    color: hsl(0, 60%, 42%);
  }
  :global(:root.dark) .type-convergence {
    background: hsla(0, 55%, 40%, 0.3);
    color: hsl(0, 60%, 72%);
  }

  .type-dramatic_irony {
    background: hsla(270, 55%, 50%, 0.15);
    color: hsl(270, 50%, 40%);
  }
  :global(:root.dark) .type-dramatic_irony {
    background: hsla(270, 45%, 40%, 0.3);
    color: hsl(270, 50%, 72%);
  }

  .type-thematic_rhyme {
    background: hsla(175, 55%, 40%, 0.15);
    color: hsl(175, 55%, 32%);
  }
  :global(:root.dark) .type-thematic_rhyme {
    background: hsla(175, 45%, 35%, 0.3);
    color: hsl(175, 50%, 65%);
  }

  .plotlines-involved {
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text);
  }

  .interaction-desc {
    width: 100%;
    margin: 0.1rem 0 0;
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.45;
  }
</style>
