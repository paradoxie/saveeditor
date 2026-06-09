// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import { rehypeLazyLoadImages } from './src/plugins/rehype-lazy-image.mjs';

const siteOrigin = process.env.PUBLIC_SITE_ORIGIN || 'https://saveeditor.top';

// https://astro.build/config
export default defineConfig({
  site: siteOrigin,
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@bokuweb/zstd-wasm'],
      esbuildOptions: {
        target: 'es2020',
      },
    },
  },

  integrations: [react(), sitemap()],
  adapter: cloudflare({ imageService: 'compile' }),
  session: {
    driver: 'memory',
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ja", "pt", "ko", "zh-cn", "es", "ru"],
    routing: {
      prefixDefaultLocale: false
    }
  },
  markdown: {
    rehypePlugins: [rehypeLazyLoadImages],
  }
});
