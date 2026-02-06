// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import { rehypeLazyLoadImages } from './src/plugins/rehype-lazy-image.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://saveeditor.top',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [react(), sitemap({ lastmod: new Date() })],
  adapter: cloudflare(),
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
