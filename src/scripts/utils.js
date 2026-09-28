export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isFinePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const isRTL = () => document.documentElement.dir === 'rtl';
export const lang = () => document.documentElement.lang;

const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';
export const toFaDigits = (s) => String(s).replace(/\d/g, (d) => FA[+d]);
/** Normalise Persian / Arabic-Indic digits to ASCII. */
export const toEnDigits = (s) =>
  String(s).replace(/[۰-۹٠-٩]/g, (d) => {
    const i = FA.indexOf(d);
    return String(i > -1 ? i : AR.indexOf(d));
  });

export function formatNum(n, decimals = 0) {
  const s = Number(n).toFixed(decimals);
  return lang() === 'fa' ? toFaDigits(s).replace('.', '٫') : s;
}

let webglOK;
export function hasWebGL() {
  if (webglOK !== undefined) return webglOK;
  try {
    const c = document.createElement('canvas');
    webglOK = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    webglOK = false;
  }
  return webglOK;
}

/**
 * Heuristic for "weak" devices: those get a lightweight still image first and
 * load the 3D model only on request.
 */
export function isLowEnd() {
  const n = navigator;
  const conn = n.connection || {};
  if (new URLSearchParams(location.search).has('lite')) return true; // force the lightweight fallback
  if (conn.saveData) return true;
  if (/(^|-)2g|3g/.test(conn.effectiveType || '')) return true;
  if (n.deviceMemory && n.deviceMemory <= 2) return true;
  if (n.hardwareConcurrency && n.hardwareConcurrency <= 2) return true;
  return !hasWebGL();
}

export const idle = (fn, timeout = 2000) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 200);
