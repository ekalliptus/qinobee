// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  output: 'server',
  adapter: cloudflare(),

  integrations: [
    react(),
    sitemap({
      // Keep personal/app/API + shared-resume routes out of the sitemap.
      filter: (page) =>
        !/\/(app|api)(\/|$)/.test(page) && !page.includes('/resume/shared'),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});