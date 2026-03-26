<script>
  const modules = import.meta.glob('/src/content/blog/*.md', { eager: true });

  const posts = Object.entries(modules)
    .map(([path, module]) => {
      const slug = path.split('/').pop().replace('.md', '');
      return { slug, ...module.metadata };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
</script>

<svelte:head>
  <title>Endnotes</title>
</svelte:head>

<div class="blog-listing">
  <h1>Endnotes</h1>

  {#each posts as post}
    <a href="/blog/{post.slug}" class="blog-card">
      <h2 class="blog-card-title">{post.title}</h2>
      <time class="blog-card-date">{post.date}</time>
      {#if post.description}
        <p class="blog-card-desc">{post.description}</p>
      {/if}
    </a>
  {/each}

  {#if posts.length === 0}
    <p>No posts yet.</p>
  {/if}
</div>
