import { isLowEnd } from './utils.js';
import { track } from './analytics.js';

export function initViewer() {
  const root = document.querySelector('[data-viewer]');
  if (!root) return;
  const gate = root.querySelector('[data-viewer-gate]');
  const loader = root.querySelector('[data-viewer-loader]');
  let loaded = false;

  const load = async (reason) => {
    if (loaded) return;
    loaded = true;
    gate.hidden = true;
    loader.hidden = false;
    try {
      const { mountViewer } = await import('./three/viewer3d.js');
      mountViewer(root, {
        onInteract: (action) => track('model_interact', { action }),
        onHotspot: (id) => track('hotspot_open', { hotspot: id }),
      });
      track('model_load', { trigger: reason });
    } catch (e) {
      console.error(e);
      loaded = false;
      gate.hidden = false;
    } finally {
      loader.hidden = true;
    }
  };

  if (isLowEnd()) {
    gate.hidden = false;
    root.querySelector('[data-viewer-load]').addEventListener('click', () => load('button'));
    return;
  }
  const io = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) {
        io.disconnect();
        load('scroll');
      }
    },
    { rootMargin: '400px 0px' }
  );
  io.observe(root);
}
