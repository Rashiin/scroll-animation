/**
 * Renders the 18 s teaser from the Three.js scene and encodes MP4 (H.264) + WebM (VP9).
 * Needs ffmpeg with libx264/libvpx-vp9 on PATH, or FFMPEG=/path/to/ffmpeg.
 *
 *   node scripts/render-teaser.mjs [--fps=24] [--w=1280] [--h=720]
 */
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const arg = (k, d) => Number(process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d);
const FPS = arg('fps', 24);
const W = arg('w', 1280);
const H = arg('h', 720);
const FRAMES = path.join(ROOT, 'scripts/render/.frames');
const OUT = path.join(ROOT, 'public/video');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

await rm(FRAMES, { recursive: true, force: true });
await mkdir(FRAMES, { recursive: true });
await mkdir(OUT, { recursive: true });

const server = await createServer({ root: path.join(ROOT, 'scripts/render'), server: { port: 5198, fs: { allow: [ROOT] } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto('http://localhost:5198/');
await page.waitForFunction(() => window.__ready === true);
const duration = await page.evaluate(() => window.__teaserDuration);
const total = Math.round(duration * FPS);
const canvas = page.locator('canvas');
for (let i = 0; i < total; i++) {
  await page.evaluate((t) => window.__teaser(t), i / FPS);
  await canvas.screenshot({ path: path.join(FRAMES, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  if (i % FPS === 0) process.stdout.write(`\r${i}/${total}`);
}
console.log(`\rrendered ${total} frames`);
await browser.close();
await server.close();

const input = ['-y', '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%05d.jpg')];
const fade = `fade=t=in:st=0:d=0.8,fade=t=out:st=${(duration - 0.8).toFixed(2)}:d=0.8`;
const run = (args) => {
  const r = spawnSync(FFMPEG, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
};
run([...input, '-vf', fade, '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, 'teaser.mp4')]);
run([...input, '-vf', fade, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-row-mt', '1', path.join(OUT, 'teaser.webm')]);
await rm(FRAMES, { recursive: true, force: true });
console.log('✓ public/video/teaser.mp4, teaser.webm');
