<script>
  import '../app.css';
  import { page } from '$app/stores';
  import DarkToggle from '$lib/components/DarkToggle.svelte';
</script>

<nav class="site-nav">
  <div class="site-nav-links">
    <a href="/" class:active={$page.url.pathname === '/'}>Home</a>
    <a href="/blog" class:active={$page.url.pathname.startsWith('/blog')}>Endnotes</a>
    <a href="/tvplot-app" class:active={$page.url.pathname.startsWith('/tvplot-app')}>tvplot app</a>
  </div>
  <DarkToggle />
</nav>

<main class="site-content" class:site-content-wide={$page.url.pathname.startsWith('/tvplot-app')}>
  <slot />
</main>
