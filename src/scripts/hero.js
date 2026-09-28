import { gsap, ScrollTrigger, animateCount } from './motion.js';
import { reducedMotion, isLowEnd, isFinePointer, idle, toFaDigits } from './utils.js';

export function initHero() {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;
  const reduced = reducedMotion();
  const lines = hero.querySelectorAll('[data-hero-line] > span');
  const ins = hero.querySelectorAll('[data-hero-in]');
  const counters = hero.querySelectorAll('[data-count]');

  // ── Intro ──────────────────────────────────────────────────────────────
  if (reduced) {
    gsap.set([lines, ins], { clearProps: 'all', opacity: 1, yPercent: 0, y: 0 });
    counters.forEach((c) => animateCount(c));
  } else {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 });
    tl.fromTo(lines, { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: 1.4, stagger: 0.12 })
      .fromTo(ins, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1 }, '-=1.0')
      .add(() => counters.forEach((c) => animateCount(c, { duration: 1.8 })), '-=0.9');
  }

  // ── Scroll choreography ───────────────────────────────────────────────
  let three = null;
  let progress = 0;
  const pct = hero.querySelector('[data-hero-pct]');
  const fa = document.documentElement.lang === 'fa';
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (s) => {
      progress = s.progress;
      three?.setProgress(progress);
      if (pct) {
        const n = String(Math.round(progress * 100)).padStart(3, '0');
        pct.textContent = fa ? toFaDigits(n) : n;
      }
    },
  });
  if (!reduced) {
    const st = { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.5 };
    gsap.to(hero.querySelector('[data-hero-top]'), { yPercent: -35, opacity: 0, ease: 'none', scrollTrigger: { ...st, end: '45% top' } });
    gsap.to(hero.querySelector('[data-hero-bottom]'), { y: 60, opacity: 0, ease: 'none', scrollTrigger: { ...st, start: '5% top', end: '40% top' } });
    gsap.to(hero.querySelector('.hero__scrim'), { opacity: 0.35, ease: 'none', scrollTrigger: st });
  }

  // ── Lazy 3D ────────────────────────────────────────────────────────────
  // The LCP is the pre-rendered poster. WebGL starts after load on capable
  // desktops, or on the first interaction on touch devices — never on weak ones.
  if (isLowEnd() || reduced) return;
  const canvas = hero.querySelector('[data-hero-canvas]');
  let started = false;
  const start = async () => {
    if (started) return;
    started = true;
    events.forEach((ev) => window.removeEventListener(ev, start));
    const { mountHero } = await import('./three/hero3d.js');
    three = mountHero(canvas, { reduced });
    three.setProgress(progress);
  };
  const events = ['pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll'];
  events.forEach((ev) => window.addEventListener(ev, start, { passive: true, once: true }));
  if (isFinePointer() && window.innerWidth >= 1024) {
    const go = () => setTimeout(() => idle(start, 3000), 1200);
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  }
}
