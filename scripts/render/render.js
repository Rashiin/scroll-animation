// Offline render harness: driven by scripts/render-assets.mjs via Playwright.
import { createStage } from '../../src/scripts/three/stage.js';

const stage = createStage(document.getElementById('c'), { pixelRatio: 2, preserveDrawingBuffer: true });
window.__stage = stage;
window.__shot = ({ mood = 'dusk', xray = false, cam = [14, 5, 16], target = [0, 1.8, 0], fov = 32 }) => {
  stage.resize();
  stage.setMood(mood);
  stage.setXray(xray);
  stage.camera.fov = fov;
  stage.camera.position.set(...cam);
  stage.camera.lookAt(...target);
  stage.camera.updateProjectionMatrix();
  stage.renderOnce();
  return true;
};
window.__ready = true;

// ── Teaser choreography (scripts/render-teaser.mjs) ─────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const ledGeos = [...new Set(stage.cabin.parts.leds.filter((m) => m.geometry.type === 'TubeGeometry').map((m) => m.geometry))];
const setLed = (k) => ledGeos.forEach((g) => g.setDrawRange(0, Math.floor((g.index.count * Math.min(1, Math.max(0, k))) / 3) * 3));
const orbit = (a, r, y) => [r * Math.cos(a), y, r * Math.sin(a)];

const SHOTS = [
  // [duration, mood, xray, (k) => ({ cam, target, fov }), led(k)]
  [4.5, 'night', false, (k) => ({ cam: orbit(lerp(0.35, 0.8, k), lerp(30, 17, k), lerp(0.9, 2.4, k)), target: [0, 1.8, 0], fov: 32 }), (k) => (k - 0.25) / 0.5],
  [3.5, 'dusk', false, (k) => ({ cam: orbit(lerp(1.1, 1.9, k), 15, lerp(2.2, 3.2, k)), target: [lerp(0.5, -1.5, k), 1.8, 0], fov: 34 }), () => 1],
  [3.5, 'day', true, (k) => ({ cam: orbit(lerp(1.3, 1.75, k), lerp(9, 7, k), lerp(11, 14, k)), target: [0.3, 1, 0], fov: 40 }), () => 1],
  [3, 'day', false, (k) => ({ cam: orbit(lerp(2.2, 2.7, k), 13, lerp(1.2, 2.2, k)), target: [-2, 1.6, 1], fov: 34 }), () => 1],
  [3.5, 'dusk', false, (k) => ({ cam: orbit(lerp(0.85, 1.0, k), lerp(22, 19, k), 3.2), target: [0.3, 2.6, 0], fov: 34 }), () => 1],
];
window.__teaserDuration = SHOTS.reduce((a, s) => a + s[0], 0);
window.__teaser = (t) => {
  let acc = 0;
  for (const [i, [dur, mood, xray, cam, led]] of SHOTS.entries()) {
    if (t < acc + dur || i === SHOTS.length - 1) {
      const k = ease(Math.min(1, (t - acc) / dur));
      if (stage.state.mood !== mood) stage.setMood(mood);
      if (stage.state.xray !== xray) stage.setXray(xray);
      setLed(led(Math.min(1, (t - acc) / dur)));
      const c = cam(k);
      stage.resize();
      stage.camera.fov = c.fov;
      stage.camera.position.set(...c.cam);
      stage.camera.lookAt(...c.target);
      stage.camera.updateProjectionMatrix();
      stage.renderOnce();
      return true;
    }
    acc += dur;
  }
};
