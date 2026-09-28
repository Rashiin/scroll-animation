import fa from './content/fa.json';
import en from './content/en.json';
import shared from './content/shared.json';

export const LANGS = { fa, en };
export { shared };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Site-relative URL that respects the deploy base path. */
export const url = (path = '/') => `${BASE}/${path.replace(/^\//, '')}`;

/** Absolute URL for canonical / hreflang / OG. */
export const abs = (path = '/') => new URL(url(path), import.meta.env.SITE).href;

export const pathFor = (lang) => (lang === 'fa' ? '/' : `/${lang}/`);

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export const toFaDigits = (s) => String(s).replace(/\d/g, (d) => FA_DIGITS[+d]);
export const digits = (s, lang) => (lang === 'fa' ? toFaDigits(s) : String(s));

export const formatPrice = (n, lang) => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);
