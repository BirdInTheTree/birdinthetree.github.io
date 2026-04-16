import adapterStatic from '@sveltejs/adapter-static';
import adapterNode from '@sveltejs/adapter-node';
import { mdsvex } from 'mdsvex';

const useStatic = process.env.ADAPTER === 'static';

const config = {
  extensions: ['.svelte', '.md'],
  preprocess: [
    mdsvex({ extensions: ['.md'] })
  ],
  kit: {
    adapter: useStatic
      ? adapterStatic({
          pages: 'build',
          assets: 'build',
          fallback: '404.html',
          precompress: false,
          strict: false
        })
      : adapterNode({
          out: 'build-node'
        }),
    paths: { base: '' },
    prerender: {
      // /tvplot-app/ is a static asset (standalone HTML viewer bundled
      // from the tvplot package), not a SvelteKit route. Links to it from
      // the layout and home page look like 404s to the prerender crawler
      // but resolve correctly at runtime on GitHub Pages.
      handleHttpError: ({ path, message }) => {
        if (path === '/tvplot-app' || path.startsWith('/tvplot-app/')) return;
        throw new Error(message);
      }
    }
  }
};

export default config;
