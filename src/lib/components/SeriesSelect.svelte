<script>
  import { manifest, currentSeries } from '$lib/stores/app.js';

  function handleChange(e) {
    currentSeries.set(e.target.value);
  }
</script>

<select class="filter-select" on:change={handleChange} value={$currentSeries || ''}>
  {#each $manifest as series}
    <option value={series.slug}>{series.displayName}</option>
  {/each}
</select>
