<script>
  import { selectedChars, activeFunctions } from '$lib/stores/app.js';
  import { characterFrequencies, resolveCharacterName } from '$lib/helpers.js';

  export let data;
  export let cast;

  const FUNCTION_TYPES = [
    { name: 'setup', label: 'Setup' },
    { name: 'inciting_incident', label: 'Inciting Incident' },
    { name: 'escalation', label: 'Escalation' },
    { name: 'turning_point', label: 'Turning Point' },
    { name: 'crisis', label: 'Crisis' },
    { name: 'climax', label: 'Climax' },
    { name: 'resolution', label: 'Resolution' }
  ];

  $: charFreqs = data ? characterFrequencies(data) : [];
  $: hasActiveFilters = $activeFunctions.size > 0;

  /** Count events per function type across all episodes. */
  $: fnCounts = countByFunction(data);

  function countByFunction(data) {
    const counts = new Map();
    for (const ep of data?.episodes || []) {
      for (const ev of ep.events || []) {
        const fn = ev.function;
        if (fn) counts.set(fn, (counts.get(fn) || 0) + 1);
      }
    }
    return counts;
  }

  function toggleChar(charId) {
    selectedChars.update((set) => {
      const next = new Set(set);
      if (next.has(charId)) {
        next.delete(charId);
      } else {
        next.add(charId);
      }
      return next;
    });
  }

  function toggleFunction(fnName) {
    activeFunctions.update((set) => {
      const next = new Set(set);
      if (next.has(fnName)) {
        next.delete(fnName);
      } else {
        next.add(fnName);
      }
      return next;
    });
  }
</script>

<div class="filters">
  <details class="filter-dropdown">
    <summary>Characters</summary>
    <div class="filter-list">
      {#each charFreqs as [charId, count]}
        <label>
          <input
            type="checkbox"
            checked={$selectedChars.has(charId)}
            on:change={() => toggleChar(charId)}
          />
          {resolveCharacterName(charId, cast)} ({count})
        </label>
      {/each}
    </div>
  </details>

  <div class="legend" class:legend-filtering={hasActiveFilters}>
    {#each FUNCTION_TYPES as fn}
      <span
        class="legend-item legend-filter fn-{fn.name}"
        class:legend-active={$activeFunctions.has(fn.name)}
        on:click={() => toggleFunction(fn.name)}
        on:keydown={(e) => e.key === 'Enter' && toggleFunction(fn.name)}
        role="button"
        tabindex="0"
      >
        {fn.label}<span class="fn-count">{fnCounts.get(fn.name) || 0}</span>
      </span>
    {/each}
  </div>
</div>
