/** Provides all blog slugs for static prerendering */
export function entries() {
  const modules = import.meta.glob('/src/content/blog/*.md', { eager: true });
  return Object.keys(modules).map((path) => ({
    slug: path.split('/').pop().replace('.md', '')
  }));
}

export async function load({ params }) {
  const post = await import(`../../../content/blog/${params.slug}.md`);
  return {
    content: post.default,
    meta: post.metadata
  };
}
