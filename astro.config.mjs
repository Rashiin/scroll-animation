// @ts-check
import { defineConfig } from 'astro/config';

// SITE / BASE let the same source deploy to GitHub Pages (demo) and to the
// client's own server at the domain root:  SITE=https://spacecabin.ir BASE=/ npm run build
const site = process.env.SITE || 'https://rashiin.github.io';
const base = process.env.BASE ?? '/scroll-animation';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: { inlineStylesheets: 'auto', assets: '_assets' },
  compressHTML: true,
  image: { responsiveStyles: false },
  vite: {
    build: { assetsInlineLimit: 2048, chunkSizeWarningLimit: 900 },
  },
});
