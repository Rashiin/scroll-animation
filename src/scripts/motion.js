/**
 * Scroll & motion layer: Lenis smooth scroll + GSAP ScrollTrigger.
 * Everything here degrades to static, readable content when
 * prefers-reduced-motion is set or JS fails.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { reducedMotion, isFinePointer, isRTL, formatNum } from './utils.js';

gsap.registerPlugin(ScrollTrigger);

export let lenis = null;

export function initSmoothScroll() {
  if (reducedMotion()) return;
  lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function scrollToTarget(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  const offset = -(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 68) + 1;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
  else el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
}

export function initAnchors(onNavigate) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    onNavigate?.(a);
    scrollToTarget(el);
    history.replaceState(null, '', id);
  });
}

/** Word-level split. (Letter splitting would break Persian glyph joining.) */
function splitWords(el) {
  if (el.dataset.splitDone) return el.querySelectorAll('.split-word');
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = words
    .map((w) => `<span class="split-line" aria-hidden="true"><span class="split-word">${w}</span></span>`)
    .join(' ');
  el.dataset.splitDone = '1';
  return el.querySelectorAll('.split-word');
}

export function initReveals() {
  if (reducedMotion()) {
    gsap.set('[data-reveal]', { opacity: 1, y: 0 });
    return;
  }
  document.querySelectorAll('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 110,
      rotate: isRTL() ? -4 : 4,
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  });

  document.querySelectorAll('[data-stagger]').forEach((group) => {
    gsap.from(group.children, {
      y: 60,
      opacity: 0,
      duration: 1.1,
      ease: 'expo.out',
      stagger: { each: 0.08, grid: 'auto', from: 'start' },
      scrollTrigger: { trigger: group, start: 'top 85%' },
    });
  });
}

export function animateCount(el, { duration = 2 } = {}) {
  const target = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || '0', 10);
  if (reducedMotion()) {
    el.textContent = formatNum(target, decimals);
    return;
  }
  const o = { v: 0 };
  gsap.to(o, {
    v: target,
    duration,
    ease: 'power3.out',
    onUpdate: () => (el.textContent = formatNum(o.v, decimals)),
  });
}

export function initCounters() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    if (el.closest('[data-hero]')) return; // hero counters start with the intro timeline
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => animateCount(el) });
  });
}

export function initHeader() {
  const hdr = document.querySelector('[data-header]');
  const bar = document.querySelector('[data-progress]');
  const mbar = document.querySelector('[data-mbar]');
  let last = 0;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      hdr.classList.toggle('is-scrolled', y > 40);
      const menuOpen = document.body.classList.contains('menu-open');
      hdr.classList.toggle('is-hidden', !menuOpen && y > 600 && y > last);
      mbar?.classList.toggle('is-visible', y > window.innerHeight * 0.8);
      last = y;
      if (bar) bar.style.transform = `scaleX(${self.progress.toFixed(4)})`;
    },
  });

  // Active nav link
  const links = [...document.querySelectorAll('.nav a[data-nav]')];
  links.forEach((a) => {
    const sec = document.querySelector(a.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: (s) => a.classList.toggle('is-active', s.isActive),
    });
  });
}

/** Pointer-following border glow on cards. */
export function initGlow() {
  if (!isFinePointer()) return;
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest?.('[data-glow]');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}

export function initMagnetic() {
  if (!isFinePointer() || reducedMotion()) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.25);
      yTo((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

export function initParallax() {
  if (reducedMotion()) return;
  document.querySelectorAll('[data-parallax]').forEach((el) => {
    const amt = parseFloat(el.dataset.parallax) || 0.1;
    const target = el.tagName === 'PICTURE' ? el.querySelector('img') : el;
    gsap.fromTo(
      target,
      { yPercent: -amt * 50 },
      { yPercent: amt * 50, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }
    );
  });

  // Teaser frame "opens up" as it enters the viewport.
  const frame = document.querySelector('[data-teaser-frame]');
  if (frame) {
    gsap.fromTo(
      frame.firstElementChild,
      { clipPath: 'inset(8% 10% 8% 10% round 32px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 22px)', ease: 'none', scrollTrigger: { trigger: frame, start: 'top 90%', end: 'top 25%', scrub: 0.6 } }
    );
  }

  const word = document.querySelector('[data-footer-word]');
  if (word) {
    gsap.from(word, { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: word, start: 'top bottom', end: 'bottom 80%', scrub: true } });
  }
}

export function initPlanDraw() {
  const plan = document.querySelector('[data-plan]');
  if (!plan) return;
  const strokes = plan.querySelectorAll('.draw > *');
  if (reducedMotion()) {
    gsap.set(strokes, { strokeDashoffset: 0 });
    return;
  }
  const tl = gsap.timeline({ scrollTrigger: { trigger: plan, start: 'top 75%' } });
  tl.to(plan.querySelectorAll('.walls > *'), { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' })
    .to(plan.querySelectorAll('.parts > *, .door > *'), { strokeDashoffset: 0, duration: 0.9, ease: 'power2.out', stagger: 0.1 }, '-=0.6')
    .to(plan.querySelectorAll('.furn > *'), { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out', stagger: 0.04 }, '-=0.4')
    .from(plan.querySelectorAll('.glaze path'), { opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.8')
    .from(plan.querySelectorAll('.zone'), { opacity: 0, duration: 0.6, stagger: 0.06 }, '-=0.6');
}

export function initTimeline() {
  const list = document.querySelector('[data-timeline]');
  if (!list) return;
  const fill = list.querySelector('[data-tl-fill]');
  const steps = [...list.querySelectorAll('[data-tl-step]')];
  const day = document.querySelector('[data-tl-day]');
  gsap.to(fill, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: list, start: 'top 60%', end: 'bottom 60%', scrub: true } });
  steps.forEach((s) => {
    ScrollTrigger.create({
      trigger: s,
      start: 'top 62%',
      onEnter: () => {
        s.classList.add('is-on');
        if (day) day.textContent = String(s.dataset.day).padStart(2, '0');
      },
      onLeaveBack: () => {
        s.classList.remove('is-on');
        const prev = steps[steps.indexOf(s) - 1];
        if (day) day.textContent = String(prev ? prev.dataset.day : 1).padStart(2, '0');
      },
    });
  });
}

/** Horizontal pinned scroll for use cases on desktop; native swipe on mobile. */
export function initUses() {
  const sec = document.querySelector('[data-uses]');
  if (!sec) return;
  const track = sec.querySelector('[data-uses-track]');
  const bar = sec.querySelector('[data-uses-progress]');
  const vp = sec.querySelector('.uses__viewport');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
    sec.classList.add('uses-pinned');
    const dist = () => Math.max(0, track.scrollWidth - vp.clientWidth + parseFloat(getComputedStyle(vp).paddingInlineStart) * 2);
    const dir = isRTL() ? 1 : -1;
    const tween = gsap.to(track, {
      x: () => dir * dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: sec.querySelector('[data-uses-pin]'),
        pin: true,
        start: 'top top',
        end: () => `+=${dist()}`,
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (s) => bar && (bar.style.transform = `scaleX(${s.progress})`),
      },
    });
    return () => {
      sec.classList.remove('uses-pinned');
      tween.scrollTrigger?.kill();
      gsap.set(track, { clearProps: 'transform' });
    };
  });
  mm.add('(max-width: 1023px), (prefers-reduced-motion: reduce)', () => {
    const onScroll = () => {
      const max = vp.scrollWidth - vp.clientWidth;
      if (bar && max > 0) bar.style.transform = `scaleX(${Math.abs(vp.scrollLeft) / max})`;
    };
    vp.addEventListener('scroll', onScroll, { passive: true });
    return () => vp.removeEventListener('scroll', onScroll);
  });
}

export function initDial() {
  const dial = document.querySelector('[data-dial]');
  if (!dial) return;
  gsap.to(dial, { strokeDashoffset: 314 * 0.32, duration: 2, ease: 'power3.inOut', scrollTrigger: { trigger: dial, start: 'top 85%' } });
}

export { gsap, ScrollTrigger };
