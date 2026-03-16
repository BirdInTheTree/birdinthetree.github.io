<script>
  import '../app.css';
  import { page } from '$app/stores';
  import DarkToggle from '$lib/components/DarkToggle.svelte';
</script>

<nav class="site-nav">
  <div class="site-nav-links">
    <a href="/" class:active={$page.url.pathname === '/'}>Home</a>
    <a href="/blog" class:active={$page.url.pathname.startsWith('/blog')}>Blog</a>
    <a href="/plotter-app" class:active={$page.url.pathname.startsWith('/plotter-app')}>Plotter App</a>
  </div>
  <DarkToggle />
</nav>

<main class="site-content">
  <slot />
</main>
