import { track } from './analytics.js';
import { lenis, scrollToTarget } from './motion.js';

export function initMenu() {
  const btn = document.querySelector('[data-burger]');
  const nav = document.querySelector('[data-mnav]');
  if (!btn || !nav) return;
  const set = (open) => {
    btn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    if (open) {
      nav.hidden = false;
      requestAnimationFrame(() => nav.classList.add('is-open'));
      lenis?.stop();
    } else {
      nav.classList.remove('is-open');
      nav.hidden = true;
      lenis?.start();
    }
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => e.target.closest('a') && set(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && set(false));
  return () => set(false);
}

export function initVersions() {
  const toggle = document.querySelector('[data-price-toggle]');
  toggle?.addEventListener('change', () => {
    document.documentElement.classList.toggle('show-prices', toggle.checked);
    track('price_toggle', { visible: toggle.checked });
  });

  // "Request this version" → preselect it in the lead form.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-select-version]');
    if (!b) return;
    const id = b.dataset.selectVersion;
    const radio = document.querySelector(`input[name="version"][value="${id}"]`);
    if (radio) radio.checked = true;
    document.querySelectorAll('[data-version]').forEach((c) => c.classList.toggle('is-selected', c.dataset.version === id));
  });

  // Hero CTAs choose the request type (consultation vs showroom visit).
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    const r = document.querySelector(`input[name="request_type"][value="${b.dataset.mode}"]`);
    if (r) r.checked = true;
  });
}

export function initPlan() {
  const zones = [...document.querySelectorAll('[data-zone]')];
  const btns = [...document.querySelectorAll('[data-zone-btn]')];
  const select = (id) => {
    zones.forEach((z) => z.classList.toggle('is-active', z.dataset.zone === id));
    btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.zoneBtn === id)));
  };
  zones.forEach((z) => {
    z.addEventListener('click', () => select(z.dataset.zone));
    z.addEventListener('mouseenter', () => select(z.dataset.zone));
    z.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select(z.dataset.zone);
      }
    });
  });
  btns.forEach((b) => {
    b.addEventListener('click', () => select(b.dataset.zoneBtn));
    b.addEventListener('mouseenter', () => select(b.dataset.zoneBtn));
  });
  select('living');
}

export function initGallery() {
  const dlg = document.querySelector('[data-lightbox]');
  if (!dlg) return;
  const items = [...document.querySelectorAll('[data-gal-open]')];
  const img = dlg.querySelector('[data-lb-img]');
  const cap = dlg.querySelector('[data-lb-cap]');
  let i = 0;
  const show = (n) => {
    i = (n + items.length) % items.length;
    const it = items[i];
    img.src = it.dataset.full;
    img.alt = it.dataset.alt;
    cap.textContent = it.dataset.caption;
  };
  items.forEach((b, n) =>
    b.addEventListener('click', () => {
      show(n);
      dlg.showModal();
      lenis?.stop();
      track('gallery_open', { index: n + 1 });
    })
  );
  const rtl = document.documentElement.dir === 'rtl';
  dlg.querySelector('[data-lb-prev]').addEventListener('click', () => show(i - 1));
  dlg.querySelector('[data-lb-next]').addEventListener('click', () => show(i + 1));
  dlg.querySelector('[data-lb-close]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => lenis?.start());
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(i + (rtl ? -1 : 1));
    if (e.key === 'ArrowLeft') show(i + (rtl ? 1 : -1));
  });
  let x0 = null;
  dlg.addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true });
  dlg.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(i + ((dx < 0) !== rtl ? 1 : -1));
    x0 = null;
  });
}

/** Teaser video is only fetched after the user presses play. */
export function initVideo() {
  const box = document.querySelector('[data-video]');
  const btn = box?.querySelector('[data-video-play]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const v = document.createElement('video');
    v.controls = true;
    v.playsInline = true;
    v.autoplay = true;
    v.preload = 'auto';
    v.poster = box.querySelector('img')?.currentSrc || '';
    v.innerHTML = `<source src="${box.dataset.webm}" type="video/webm"><source src="${box.dataset.mp4}" type="video/mp4">`;
    box.querySelector('picture')?.remove();
    btn.remove();
    box.classList.add('is-playing');
    box.prepend(v);
    v.play().catch(() => {});
    let q = 0;
    v.addEventListener('timeupdate', () => {
      const pct = Math.floor((v.currentTime / v.duration) * 4) * 25;
      if (pct > q) {
        q = pct;
        track('video_progress', { percent: pct });
      }
    });
    v.addEventListener('ended', () => track('video_complete'));
  });
}

export function initFaq() {
  // Exclusive accordion fallback for browsers without <details name>.
  const all = [...document.querySelectorAll('[data-faq] details')];
  all.forEach((d) =>
    d.addEventListener('toggle', () => {
      if (d.open) all.forEach((o) => o !== d && (o.open = false));
    })
  );
}

export { scrollToTarget };
