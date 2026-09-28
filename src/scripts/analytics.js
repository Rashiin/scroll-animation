/**
 * Thin analytics layer. Every interaction is pushed to window.dataLayer, so it
 * works with GTM → GA4 without code changes (create GA4 event tags that fire
 * on these custom events in GTM).
 *
 *   cta_click, call_click, whatsapp_click, lang_switch, price_toggle,
 *   version_select, model_load, model_interact, hotspot_open, video_play,
 *   faq_open, form_start, form_submit, form_error, gallery_open
 */
window.dataLayer = window.dataLayer || [];

export function track(event, params = {}) {
  window.dataLayer.push({ event, page_language: document.documentElement.lang, ...params });
  if (import.meta.env.DEV) console.debug('[track]', event, params);
}

export function initAnalytics() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (!el || el.matches('input')) return;
    track(el.dataset.track, { label: el.dataset.trackLabel || el.textContent.trim().slice(0, 60) });
  });
}
