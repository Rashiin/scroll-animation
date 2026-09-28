import { initAnalytics } from './analytics.js';
import {
  initSmoothScroll, initAnchors, initReveals, initCounters, initHeader, initGlow, initMagnetic,
  initParallax, initPlanDraw, initTimeline, initUses, initDial, ScrollTrigger,
} from './motion.js';
import { initHero } from './hero.js';
import { initViewer } from './viewer.js';
import { initMenu, initVersions, initPlan, initGallery, initVideo, initFaq } from './ui.js';
import { initForm } from './form.js';

// Above-the-fold essentials run immediately.
initAnalytics();
initSmoothScroll();
// Pinned sections first, so every later trigger accounts for their pin spacing.
initUses();
const closeMenu = initMenu();
initAnchors(() => closeMenu?.());
initHeader();
initHero();

// Everything below the fold is initialised in small tasks, yielding to the
// browser between them to keep the main thread responsive (low TBT / INP).
const queue = [
  initReveals, initCounters, initGlow, initMagnetic, initParallax, initPlanDraw, initTimeline, initDial,
  initVersions, initPlan, initGallery, initVideo, initFaq, initForm, initViewer,
  () => document.fonts?.ready.then(() => ScrollTrigger.refresh()),
];
const next = () => {
  const task = queue.shift();
  if (!task) return;
  task();
  setTimeout(next, 0);
};
setTimeout(next, 0);
