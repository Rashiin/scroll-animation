<div dir="rtl">

# اسپیس کابین ماموت: لندینگ سه‌بعدی و تعاملی

**نمونه‌کار مفهومی** برای پروژه «طراحی وب‌سایت تک‌صفحه‌ای تعاملی و سه‌بعدی اسپیس کابین ماموت».
یک لندینگ دوزبانه (فارسی راست‌چین / انگلیسی چپ‌چین) با مدل سه‌بعدی تعاملی، انیمیشن‌های اسکرولی و فرم جذب لید، که با Astro، Three.js و GSAP ساخته شده است.

🔗 **دموی زنده:** `https://rashiin.github.io/scroll-animation/` (فارسی) · `https://rashiin.github.io/scroll-animation/en/` (انگلیسی)

> مدل سه‌بعدی، تصاویر، قیمت‌ها و اطلاعات تماس در این دمو نمایشی هستند. مدل کابین به‌صورت پروسیجرال و با ابعاد واقعی (۱۲ × ۳٫۵ متر) ساخته شده تا جای مدل نهایی کارفرما را بگیرد.

## چه چیزهایی پیاده‌سازی شده است

| بخش | جزئیات |
|---|---|
| **هیرو سه‌بعدی** | دوربین سینمایی که با اسکرول دور کابین می‌چرخد، پارالاکس با حرکت ماوس، HUD فنی. تصویر پوستر دقیقاً از فریم اول WebGL رندر شده، پس جابه‌جایی تصویر و بوم سه‌بعدی دیده نمی‌شود. |
| **تیزر ویدئو** | فریم با افکت clip-path هنگام اسکرول باز می‌شود. ویدئو فقط بعد از کلیک بارگذاری می‌شود. |
| **ویژگی‌ها** | کارت‌های بنتو با نور دنبال‌کننده ماوس، نمودار لایه‌های دیوار با انیمیشن حرارت، رابط اپ هوشمند و شمارنده‌های عددی. |
| **نمایشگر ۳۶۰°** | چرخش و زوم، ۷ نقطه اطلاعاتی (Hotspot) با پرواز دوربین به سمت هر نقطه، حالت روز/غروب/شب، نمای داخلی (X-Ray)، تمام‌صفحه. |
| **پلان** | پلان SVG که با اسکرول ترسیم می‌شود؛ هر فضا قابل کلیک است و متراژ و توضیح خودش را نشان می‌دهد. |
| **مقایسه نسخه‌ها** | ۴ کارت نسخه، نمایش یا پنهان کردن قیمت، جدول مقایسه کامل. دکمه «درخواست این نسخه» همان نسخه را در فرم انتخاب می‌کند. |
| **کاربردها** | اسکرول افقی پین‌شده در دسکتاپ و سوایپ بومی در موبایل. |
| **تایم‌لاین** | خط پیشرفت که با اسکرول پر می‌شود و شمارنده روز. |
| **گالری** | چیدمان موزاییکی و لایت‌باکس با کیبورد و سوایپ. |
| **سؤالات متداول** | آکاردئون قابل‌دسترس با اسکیمای FAQPage. |
| **فرم لید** | اعتبارسنجی موبایل ایران (با تبدیل ارقام فارسی)، ضداسپم بدون reCAPTCHA (هانی‌پات، حداقل زمان پر کردن، توکن JS، محدودیت نرخ درخواست)، ثبت UTM و منبع ورود (اولین و آخرین تماس). |
| **موبایل** | Mobile-First، منوی تمام‌صفحه، نوار ثابت «تماس / مشاوره» در پایین صفحه. |

## فنی

- **Astro** با خروجی کاملاً استاتیک و صفر جاوااسکریپت اضافه؛ فقط اسکریپت‌های خود صفحه بارگذاری می‌شوند.
- **Three.js**: مدل در یک chunk جداگانه و به‌صورت تنبل بارگذاری می‌شود. روی دسکتاپ بعد از `load` و روی موبایل با اولین تعامل کاربر اجرا می‌شود. روی دستگاه‌های ضعیف (Save-Data، شبکه 2G/3G، رم ≤ ۲ گیگ، نبود WebGL) فقط تصویر نمایش داده می‌شود و مدل با دکمه بارگذاری می‌شود.
- **GSAP ScrollTrigger + Lenis** برای اسکرول نرم. `prefers-reduced-motion` کاملاً رعایت شده است.
- **فونت‌ها** (وزیرمتن و Space Grotesk با لایسنس OFL) روی خود سایت میزبانی و بر اساس `unicode-range` تفکیک شده‌اند. **هیچ CDN خارجی‌ای استفاده نشده است.**
- **تصاویر** با `astro:assets` به AVIF و WebP در چند اندازه تبدیل می‌شوند، با `srcset` و بارگذاری تنبل.
- **سئو**: title و description جدا برای هر زبان، canonical، hreflang (fa / en / x-default)، Open Graph، `sitemap.xml`، `robots.txt`، و JSON-LD شامل Organization، Product (AggregateOffer)، FAQPage و VideoObject.
- **آنالیتیکس**: همه رویدادها به `dataLayer` فرستاده می‌شوند و با GTM/GA4 سازگارند (جدول رویدادها پایین‌تر آمده است).

## ویرایش محتوا بدون برنامه‌نویس

تمام متن‌ها، قیمت‌ها و تنظیمات در سه فایل JSON نگهداری می‌شوند:

```
src/content/fa.json      ← همه متن‌های فارسی
src/content/en.json      ← همه متن‌های انگلیسی
src/content/shared.json  ← قیمت‌ها (تومان)، تلفن، شبکه‌های اجتماعی، GTM، آدرس فرم
```

بعد از ویرایش، کافی است `npm run build` اجرا شود (یا در گیت push کنید تا CI خودش بیلد بگیرد). برای ویرایش از طریق پنل تحت وب هم می‌توان Decap CMS یا Pages CMS را روی همین فایل‌ها تنظیم کرد.

## اجرا

```bash
npm install
npm run dev            # http://localhost:4321/scroll-animation/
npm run build          # خروجی استاتیک در dist/
npm run render:assets  # رندر دوباره پوستر، گالری و تصویر OG از روی مدل سه‌بعدی
npm run render:teaser  # رندر تیزر ۱۸ ثانیه‌ای (MP4 + WebM) از همان صحنه؛ به ffmpeg نیاز دارد
```

> افزودن `?lite` به آدرس، نسخه سبک (بدون WebGL) را نشان می‌دهد؛ همان چیزی که گوشی‌های ضعیف می‌بینند.

استقرار روی سرور کارفرما در ریشه دامنه:

```bash
SITE=https://spacecabin.ir BASE=/ npm run build   # سپس dist/ را روی nginx کپی کنید
```

## جایگزینی مدل نهایی (GLB/FBX/Max)

۱. خروجی GLB بگیرید و فشرده کنید:
   `npx @gltf-transform/cli optimize cabin.glb public/models/cabin.glb --compress draco --texture-compress webp --texture-size 2048`
۲. در `src/scripts/three/cabin.js` به جای `createCabin()`، مدل را با `GLTFLoader` و `DRACOLoader` بارگذاری کنید. دیکودر Draco را از `node_modules/three/examples/jsm/libs/draco` در `public/` کپی کنید تا روی خود سرور باشد.
۳. مختصات Hotspotها در همان فایل بر حسب متر است و چون ابعاد مدل پروسیجرال با کابین واقعی یکی است، معمولاً تغییر زیادی لازم ندارد.

## فرم و CRM

`server/lead.php` (PHP 8، بدون وابستگی) این کارها را انجام می‌دهد: اعتبارسنجی دوباره، ضداسپم، ذخیره در SQLite (یا CSV)، ارسال ایمیل و فوروارد به CRM از طریق Webhook.
آدرس این فایل را در `shared.json → form.endpoint` قرار دهید. تا وقتی این مقدار خالی است، فرم در حالت دمو کار می‌کند و درخواستی به شبکه نمی‌فرستد.

</div>

---

# Mammut Space Cabin: interactive 3D landing page

A **concept build** for the Mammut Space Cabin one-page site brief. It's bilingual (Persian RTL at `/`, English LTR at `/en/`), built with Astro, Three.js and GSAP, and has a 3D viewer, scroll-driven storytelling and a lead form.

### Highlights
- **Scroll-driven 3D hero.** The camera orbits the cabin as you scroll. The LCP poster is rendered from the *same* camera path (`hero-path.js`), so the image-to-WebGL swap can't be seen.
- **360° viewer** with orbit and zoom, 7 hotspots with camera fly-to, day/dusk/night lighting, an X-ray interior view, fullscreen, and an LED "draw-on" effect.
- **Performance first.** Three.js is split into its own lazy chunk and starts after `load` on desktop or on the first interaction on touch devices. Weak devices get the still image and a load button. Fonts, libraries and images are all self-hosted (no external CDN).
- **SEO**: per-language meta, canonical, hreflang, OG, sitemap, robots, and JSON-LD for Organization, Product, FAQPage and VideoObject.
- **Leads**: Iranian mobile validation, anti-spam without reCAPTCHA, first- and last-touch UTM attribution, and a PHP endpoint that saves to SQLite, sends email and posts to a CRM webhook.
- **Editable content**: everything lives in `src/content/*.json`.

### Analytics events (`window.dataLayer`)
`cta_click`, `call_click`, `whatsapp_click`, `lang_switch`, `price_toggle`, `version_select`, `model_load`, `model_interact`, `hotspot_open`, `video_play`, `video_progress`, `video_complete`, `faq_open`, `gallery_open`, `form_start`, `form_submit`, `form_error`

### Structure
```
src/
  content/        fa.json · en.json · shared.json   ← all copy, prices, settings
  components/     one .astro file per section
  layouts/        Base.astro (SEO, hreflang, JSON-LD, GTM)
  scripts/        main.js · motion.js · hero.js · viewer.js · form.js · ui.js · analytics.js
  scripts/three/  cabin.js (model) · stage.js (renderer, moods) · hero3d.js · viewer3d.js
  pages/          index (fa) · en/index · sitemap.xml · robots.txt
scripts/          render-assets.mjs (posters, gallery, OG) · render-teaser.mjs (18 s MP4/WebM teaser)
server/           lead.php (+ config.sample.php)
```

---
Concept design & development by **[Rashiin](https://github.com/Rashiin)**.
