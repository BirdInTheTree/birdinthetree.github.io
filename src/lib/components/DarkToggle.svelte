<script>
  import { theme } from '$lib/stores/app.js';

  function toggle() {
    theme.update((current) => (current === 'dark' ? 'light' : 'dark'));
  }
</script>

<button class="dark-toggle btn" on:click={toggle} aria-label="Toggle dark mode">
  {$theme === 'dark' ? '☀' : '☾'}
</button>
