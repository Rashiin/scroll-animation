/** Interactive 360° viewer: orbit + zoom, lighting moods, X-ray interior, hotspots. */
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { createStage } from './stage.js';

const HOME = { cam: [12.5, 4.6, 13.5], target: [0, 1.6, 0] };

export function mountViewer(root, { onInteract, onHotspot } = {}) {
  const canvas = root.querySelector('[data-viewer-canvas]');
  const stage = createStage(canvas, { pixelRatio: 1.75 });
  const { THREE, camera, cabin, renderer } = stage;

  camera.fov = 34;
  camera.position.set(...HOME.cam);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...HOME.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotateSpeed = 0.6;
  controls.update();
  // Let vertical swipes scroll the page on touch devices; horizontal drags rotate.
  renderer.domElement.style.touchAction = 'pan-y';

  let interacted = false;
  controls.addEventListener('start', () => {
    if (!interacted) {
      interacted = true;
      onInteract?.('orbit');
    }
    stopAutoRotate();
  });

  // ── Hotspots ─────────────────────────────────────────────────────────────
  const layer = root.querySelector('[data-hotspots]');
  const spots = cabin.hotspots.map((h) => ({
    ...h,
    pos: new THREE.Vector3(...h.p),
    normal: new THREE.Vector3(...h.n).normalize(),
    el: layer.querySelector(`[data-hs="${h.id}"]`),
  }));
  spots.forEach((s) => s.el && (s.el.hidden = false));
  const v = new THREE.Vector3();
  const toCam = new THREE.Vector3();

  function updateHotspots() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    for (const s of spots) {
      if (!s.el) continue;
      v.copy(s.pos).project(camera);
      toCam.copy(camera.position).sub(s.pos).normalize();
      const behind = v.z > 1 || toCam.dot(s.normal) < 0.05;
      s.el.classList.toggle('is-behind', behind);
      s.el.style.transform = `translate3d(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px, 0)`;
    }
  }

  stage.onTick(() => {
    controls.update();
    updateHotspots();
  });

  // ── Toolbar ──────────────────────────────────────────────────────────────
  const rotateBtn = root.querySelector('[data-autorotate]');
  function stopAutoRotate() {
    controls.autoRotate = false;
    rotateBtn?.setAttribute('aria-pressed', 'false');
  }
  rotateBtn?.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    rotateBtn.setAttribute('aria-pressed', String(controls.autoRotate));
    onInteract?.('autorotate');
  });

  // LED "draw-on" when switching to a darker mood.
  const ledGeos = [...new Set(cabin.parts.leds.filter((m) => m.geometry.type === 'TubeGeometry').map((m) => m.geometry))];
  function drawLeds() {
    const o = { t: 0 };
    gsap.to(o, {
      t: 1,
      duration: 1.6,
      ease: 'power2.inOut',
      onUpdate: () => ledGeos.forEach((g) => g.setDrawRange(0, Math.floor(g.index.count * o.t / 3) * 3)),
    });
  }

  root.querySelectorAll('[data-mood]').forEach((b) =>
    b.addEventListener('click', () => {
      const m = b.dataset.mood;
      root.querySelectorAll('[data-mood]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      stage.setMood(m);
      if (m !== 'day') drawLeds();
      onInteract?.(`mood_${m}`);
    })
  );

  const xrayBtn = root.querySelector('[data-xray]');
  xrayBtn?.addEventListener('click', () => {
    const on = xrayBtn.getAttribute('aria-pressed') !== 'true';
    xrayBtn.setAttribute('aria-pressed', String(on));
    stage.setXray(on);
    if (on) flyTo({ cam: [2, 14, 9], target: [0.4, 1, 0] });
    onInteract?.(on ? 'xray_on' : 'xray_off');
  });

  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    flyTo(HOME);
    closePanel();
    onInteract?.('reset');
  });

  root.querySelector('[data-fullscreen]')?.addEventListener('click', () => {
    const el = root.querySelector('[data-viewer-stage]');
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.();
    onInteract?.('fullscreen');
  });

  function flyTo({ cam, target }) {
    stopAutoRotate();
    gsap.to(camera.position, { x: cam[0], y: cam[1], z: cam[2], duration: 1.4, ease: 'power3.inOut' });
    gsap.to(controls.target, { x: target[0], y: target[1], z: target[2], duration: 1.4, ease: 'power3.inOut' });
  }

  // ── Hotspot panel ────────────────────────────────────────────────────────
  const panel = root.querySelector('[data-hs-panel]');
  const legend = [...root.querySelectorAll('[data-hs-legend]')];
  const content = JSON.parse(root.dataset.hotspots || '{}');

  function openSpot(id) {
    const s = spots.find((x) => x.id === id);
    if (!s) return;
    const i = spots.indexOf(s);
    const c = content[id] || {};
    panel.querySelector('[data-hs-idx]').textContent = root.dataset.lang === 'fa' ? `۰${'۱۲۳۴۵۶۷'[i]}` : `0${i + 1}`;
    panel.querySelector('[data-hs-title]').textContent = c.title || '';
    panel.querySelector('[data-hs-text]').textContent = c.text || '';
    panel.querySelector('[data-hs-spec]').textContent = c.spec || '';
    panel.hidden = false;
    spots.forEach((x) => x.el?.classList.toggle('is-active', x === s));
    legend.forEach((b) => b.classList.toggle('is-active', b.dataset.hsLegend === id));
    // Frame the hotspot: stand off along its normal, slightly raised.
    const dist = 7.5;
    const camPos = s.pos.clone().addScaledVector(s.normal, dist).add(new THREE.Vector3(0, 1.2, 0));
    camPos.y = Math.max(camPos.y, 1.2);
    flyTo({ cam: camPos.toArray(), target: s.pos.toArray() });
    onHotspot?.(id);
  }
  function closePanel() {
    panel.hidden = true;
    spots.forEach((x) => x.el?.classList.remove('is-active'));
    legend.forEach((b) => b.classList.remove('is-active'));
  }
  spots.forEach((s) => s.el?.addEventListener('click', () => openSpot(s.id)));
  legend.forEach((b) =>
    b.addEventListener('click', () => {
      openSpot(b.dataset.hsLegend);
      root.querySelector('[data-viewer-stage]').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    })
  );
  root.querySelector('[data-hs-close]')?.addEventListener('click', closePanel);

  // ── Lifecycle ────────────────────────────────────────────────────────────
  const ro = new ResizeObserver(() => stage.resize());
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? stage.start() : stage.stop()), { rootMargin: '100px' });
  io.observe(canvas);

  stage.resize();
  stage.renderOnce();
  canvas.classList.add('is-live');
  root.querySelector('[data-viewer-stage]').classList.add('is-live');
  return stage;
}
