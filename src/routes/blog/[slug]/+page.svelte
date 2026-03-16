<script>
  export let data;
</script>

<svelte:head>
  <title>{data.meta.title}</title>
</svelte:head>

<article class="blog-post">
  <header class="blog-post-header">
    <h1>{data.meta.title}</h1>
    <time>{data.meta.date}</time>
  </header>

  <div class="blog-post-content">
    <svelte:component this={data.content} />
  </div>
</article>
