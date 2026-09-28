/**
 * Lead form: Iranian mobile validation, reCAPTCHA-free anti-spam, UTM/source
 * attribution, and delivery to a configurable JSON endpoint (see server/lead.php).
 */
import { toEnDigits } from './utils.js';
import { track } from './analytics.js';

const ATTR_KEY = 'sc_attribution';
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];

function safeStore(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

/** First- and last-touch attribution, persisted across visits. */
export function captureAttribution() {
  const q = new URLSearchParams(location.search);
  const touch = { landing: location.pathname + location.search, referrer: document.referrer || '(direct)', at: new Date().toISOString() };
  UTM.forEach((k) => q.get(k) && (touch[k] = q.get(k)));
  const hasCampaign = UTM.some((k) => touch[k]);
  const saved = safeStore(() => JSON.parse(localStorage.getItem(ATTR_KEY))) || {};
  const next = { first: saved.first || touch, last: hasCampaign || !saved.last ? touch : saved.last };
  safeStore(() => localStorage.setItem(ATTR_KEY, JSON.stringify(next)));
  return next;
}

/** Normalise and validate an Iranian mobile number → "09xxxxxxxxx" or null. */
export function normalizeMobile(raw) {
  let s = toEnDigits(raw).replace(/[\s\-()]/g, '');
  s = s.replace(/^(\+98|0098|98)(?=9)/, '0');
  if (/^9\d{9}$/.test(s)) s = `0${s}`;
  return /^09\d{9}$/.test(s) ? s : null;
}

export function initForm() {
  const form = document.querySelector('[data-lead-form]');
  if (!form) return;
  const attribution = captureAttribution();
  const D = form.dataset;
  const status = form.querySelector('[data-form-status]');
  const submitLabel = form.querySelector('[data-submit-label]');
  const submitBtn = form.querySelector('[type="submit"]');
  const labelDefault = submitLabel.textContent;
  let started = 0;
  let tried = false;

  const markStart = () => {
    if (started) return;
    started = Date.now();
    form.started_at.value = String(started);
    form.js_token.value = btoa(`${started}:${navigator.language}`).split('').reverse().join('');
    track('form_start');
  };
  form.addEventListener('focusin', markStart);

  // Live-convert Persian digits in the mobile field.
  form.mobile.addEventListener('input', () => {
    const p = form.mobile.selectionStart;
    form.mobile.value = toEnDigits(form.mobile.value);
    form.mobile.setSelectionRange(p, p);
  });

  const rules = {
    name: (v) => (!v.trim() ? D.errRequired : v.trim().length < 3 ? D.errName : ''),
    mobile: (v) => (!v.trim() ? D.errRequired : normalizeMobile(v) ? '' : D.errMobile),
    city: (v) => (!v.trim() ? D.errRequired : ''),
    use: (v) => (!v ? D.errRequired : ''),
  };

  function check(name) {
    const input = form.elements[name];
    const msg = rules[name](input.value);
    const field = input.closest('.field');
    field.classList.toggle('is-invalid', !!msg);
    field.classList.toggle('is-valid', !msg);
    input.setAttribute('aria-invalid', String(!!msg));
    field.querySelector('.err').textContent = msg;
    return !msg;
  }

  Object.keys(rules).forEach((n) => {
    const el = form.elements[n];
    el.addEventListener('blur', () => (tried || el.value) && check(n));
    el.addEventListener('input', () => tried && check(n));
    el.addEventListener('change', () => tried && check(n));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    tried = true;
    status.textContent = '';
    const results = Object.keys(rules).map(check);
    if (results.includes(false)) {
      form.querySelector('[aria-invalid="true"]')?.focus();
      track('form_error', { reason: 'validation' });
      return;
    }

    // Anti-spam: honeypot filled, or submitted faster than a human could.
    const elapsed = (Date.now() - (started || Date.now())) / 1000;
    if (form.company.value || elapsed < Number(D.minSeconds || 3)) {
      status.textContent = D.errSpam;
      track('form_error', { reason: 'spam' });
      return;
    }

    const fd = new FormData(form);
    const payload = {
      request_type: fd.get('request_type'),
      name: fd.get('name').trim(),
      mobile: normalizeMobile(fd.get('mobile')),
      city: fd.get('city').trim(),
      use: fd.get('use'),
      version: fd.get('version'),
      message: (fd.get('message') || '').trim(),
      lang: document.documentElement.lang,
      page: location.href,
      attribution,
      started_at: fd.get('started_at'),
      js_token: fd.get('js_token'),
      company: fd.get('company'),
      submitted_at: new Date().toISOString(),
    };

    submitBtn.disabled = true;
    submitLabel.textContent = D.sending;
    try {
      let ref;
      if (D.endpoint) {
        const res = await fetch(D.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        ref = (await res.json().catch(() => ({}))).ref;
      } else {
        // Demo mode (static hosting): no backend configured.
        await new Promise((r) => setTimeout(r, 900));
        console.info('[lead:demo]', payload);
      }
      ref ||= `SC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      track('form_submit', { request_type: payload.request_type, version: payload.version, use: payload.use, utm_source: attribution.last.utm_source || '(none)' });
      const done = document.querySelector('[data-form-done]');
      done.querySelector('[data-ref]').textContent = ref;
      form.hidden = true;
      done.hidden = false;
      done.focus();
    } catch (err) {
      status.textContent = D.error;
      track('form_error', { reason: 'network' });
    } finally {
      submitBtn.disabled = false;
      submitLabel.textContent = labelDefault;
    }
  });
}
