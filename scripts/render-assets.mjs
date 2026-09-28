/**
 * Renders poster / gallery / OG images (and optionally teaser frames) from the
 * same Three.js scene the site uses, so marketing stills always match the model.
 *
 *   npm run render:assets            → src/assets/renders/*.png + public/og-*.png
 *   npm run render:assets -- --only=hero,gallery-1
 */
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { heroCamera } from '../src/scripts/three/hero-path.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src/assets/renders');
const PUB = path.join(ROOT, 'public');

export const SHOTS = [
  // Hero posters use the exact first frame of the WebGL hero (see hero-path.js).
  { name: 'hero', w: 1600, h: 1000, mood: 'dusk', ...heroCamera(0, false) },
  { name: 'hero-mobile', w: 780, h: 1688, mood: 'dusk', ...heroCamera(0, true) },
  { name: 'apple-touch-icon', w: 180, h: 180, mood: 'dusk', cam: [9, 3, 12], target: [0, 1.8, 0], fov: 40, dir: PUB, dpr: 1 },
  { name: 'gallery-1', w: 1600, h: 1066, mood: 'day', cam: [-13, 4.2, 13], target: [0, 1.6, 0], fov: 34 },
  { name: 'gallery-2', w: 1200, h: 1500, mood: 'night', cam: [4, 1.6, 10.5], target: [-1.2, 2.0, 0], fov: 40 },
  { name: 'gallery-3', w: 1600, h: 1066, mood: 'dusk', cam: [17, 1.2, 4], target: [0, 1.9, 0], fov: 30 },
  { name: 'gallery-4', w: 1600, h: 1066, mood: 'day', xray: true, cam: [0.5, 15, 9], target: [0.5, 1.0, 0], fov: 38 },
  { name: 'gallery-5', w: 1200, h: 1500, mood: 'night', cam: [-9, 0.8, 9], target: [-2.5, 2.1, 1.5], fov: 36 },
  { name: 'gallery-6', w: 1600, h: 1066, mood: 'day', cam: [8, 9, -14], target: [0, 1.4, 0], fov: 32 },
  { name: 'viewer-poster', w: 1600, h: 1000, mood: 'dusk', cam: [12, 4.5, 13], target: [0, 1.6, 0], fov: 34 },
  { name: 'teaser-poster', w: 1600, h: 900, mood: 'night', cam: [13, 2.2, 11], target: [0, 1.8, 0], fov: 32 },
  { name: 'og', w: 1200, h: 630, mood: 'dusk', cam: [12.5, 3.6, 14], target: [0.4, 1.7, 0], fov: 32, dir: PUB },
];

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');

const server = await createServer({ root: path.join(ROOT, 'scripts/render'), server: { port: 5199, fs: { allow: [ROOT] } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
await mkdir(OUT, { recursive: true });

for (const s of SHOTS) {
  if (only && !only.includes(s.name)) continue;
  const dpr = s.dpr || 2;
  const page = await browser.newPage({ viewport: { width: s.w / dpr, height: s.h / dpr }, deviceScaleFactor: dpr });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto('http://localhost:5199/');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.evaluate((s) => window.__shot(s), s);
  const file = path.join(s.dir || OUT, `${s.name}.png`);
  await page.locator('canvas').screenshot({ path: file });
  console.log('✓', path.relative(ROOT, file));
  await page.close();
}
await browser.close();
await server.close();
