// @ts-check
import { defineConfig } from 'astro/config';

import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),

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
