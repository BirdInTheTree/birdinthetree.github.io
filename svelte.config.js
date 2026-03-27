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
    paths: { base: '' }
  }
};

export default config;
