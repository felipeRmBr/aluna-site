// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://aluna.example',
  output: 'static',
  adapter: netlify(),
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
