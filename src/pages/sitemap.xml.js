import { abs, pathFor } from '../i18n.js';

export function GET() {
  const langs = ['fa', 'en'];
  const alt = langs
    .map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${abs(pathFor(l))}"/>`)
    .concat(`<xhtml:link rel="alternate" hreflang="x-default" href="${abs(pathFor('fa'))}"/>`)
    .join('');
  const today = new Date().toISOString().slice(0, 10);
  const urls = langs
    .map((l) => `<url><loc>${abs(pathFor(l))}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${l === 'fa' ? '1.0' : '0.8'}</priority>${alt}</url>`)
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
