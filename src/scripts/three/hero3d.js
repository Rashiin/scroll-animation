/** Hero scene: cinematic camera driven by scroll progress + subtle pointer parallax. */
import { createStage } from './stage.js';
import { heroCamera } from './hero-path.js';

export function mountHero(canvas, { reduced = false } = {}) {
  const stage = createStage(canvas, { pixelRatio: 1.6 });
  const { camera, cabin } = stage;
  stage.setMood('dusk');

  let progress = 0;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const portrait = () => canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.8;

  function place() {
    const { cam, target, fov } = heroCamera(progress, portrait());
    // Pointer parallax: orbit slightly around the target.
    const ox = pointer.sx * 0.9;
    const oy = pointer.sy * 0.45;
    camera.position.set(cam[0] + ox * 0.6, cam[1] - oy, cam[2] - ox * 0.8);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    camera.lookAt(target[0], target[1], target[2]);
  }

  // LED "breathing" and pointer smoothing.
  const led = cabin.materials.ledHalo;
  stage.onTick((t) => {
    pointer.sx += (pointer.x - pointer.sx) * 0.05;
    pointer.sy += (pointer.y - pointer.sy) * 0.05;
    if (!reduced) led.opacity = 0.2 + Math.sin(t * 1.6) * 0.06;
    place();
  });

  if (!reduced) {
    window.addEventListener(
      'pointermove',
      (e) => {
        pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true }
    );
  }

  const ro = new ResizeObserver(() => {
    stage.resize();
    place();
  });
  ro.observe(canvas);

  // Only render while the hero is on screen.
  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? stage.start() : stage.stop()));
  io.observe(canvas);

  place();
  stage.renderOnce();
  canvas.classList.add('is-live');

  return {
    setProgress(p) {
      progress = p;
    },
    stage,
  };
}
