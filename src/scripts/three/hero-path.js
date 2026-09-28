/**
 * Hero camera path as a function of scroll progress p ∈ [0, 1].
 * Shared with the offline renderer so the LCP poster image is pixel-matched to
 * the first WebGL frame — the swap from <img> to <canvas> is invisible.
 */
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

export function heroCamera(p, portrait) {
  const e = ease(Math.min(1, Math.max(0, p)));
  if (portrait) {
    // Tall screens: a more end-on view keeps the 12 m cabin inside the frame.
    const a = lerp(0.55, 1.5, e);
    const r = lerp(36, 29, e);
    return {
      cam: [r * Math.cos(a), lerp(4.6, 2.8, e), r * Math.sin(a)],
      target: [lerp(0.4, -1.2, e), lerp(3.0, 2.3, e), 0],
      fov: 38,
    };
  }
  const a = lerp(0.93, 1.95, e);
  const r = lerp(19.5, 15.5, e);
  return {
    cam: [r * Math.cos(a), lerp(3.4, 2.1, e), r * Math.sin(a)],
    target: [lerp(0.3, -1.2, e), lerp(3.0, 2.3, e), 0],
    fov: 34,
  };
}
