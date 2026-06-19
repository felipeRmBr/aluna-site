// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://soy-aluna.com',
  output: 'static',
  adapter: netlify(),
  integrations: [preact()],
  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },
  vite: {
    css: {
      modules: {
        generateScopedName: '[name]__[local]__[hash:base64:5]',
      },
    },
  },
});
