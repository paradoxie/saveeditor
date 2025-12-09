// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://saveeditor.top',
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [react(), sitemap()],
  adapter: cloudflare(),
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ja", "pt", "ko", "zh-cn"],
    routing: {
      prefixDefaultLocale: false
    }
  }
});