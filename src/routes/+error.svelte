<script>
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Page not found</title>
</svelte:head>

<div class="error-page">
  <h1>{$page.status}</h1>
  <p>{$page.error?.message || 'Page not found'}</p>
  <a href="/" class="btn">Back to home</a>
</div>
