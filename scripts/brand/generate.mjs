// Generates every brand asset from scripts/brand/geometry.mjs:
//   assets/brand/*.svg            source logo and icon
//   assets/icon.png               512px Play Store icon (also used by the website)
//   assets/feature-graphic*.png   1024x500 Play Store feature graphics (EN / HE)
//   src/assets/images/*.png       in-app logo and app icon
//   android/app/src/main/res/...  adaptive / themed / legacy launcher icons,
//                                 notification icon and splash
// Raster images are rendered with a local Chrome or Edge in headless mode
// (set CHROME=/path/to/chrome to override).
// Run: node scripts/brand/generate.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { car, circlePath, holePath, palette as c } from './geometry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const res = path.join(root, 'android/app/src/main/res');
const out = (...p) => {
  const file = path.join(root, ...p);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return file;
};

// ---------------------------------------------------------------------------
// SVG

const r1 = n => Math.round(n * 1000) / 1000;

/** The full-color car mark centered at (cx, cy), `width` wide. */
function carSvg(cx, cy, width, { id = 'car', shadow = true } = {}) {
  const k = car(cx, cy, width);
  const s = k.scale;
  const h = k.heartCenter;
  const box = `x="${cx - width}" y="${cy - width}" width="${width * 2}" height="${width * 2}"`;
  const groundY = k.wheels[0].cy + k.wheels[0].r;
  return `
  <defs>
    <linearGradient id="${id}b" gradientUnits="userSpaceOnUse" x1="0" y1="${k.bodyTop}" x2="0" y2="${k.bodyBottom}">
      <stop offset="0" stop-color="${c.bodyTop}"/>
      <stop offset="1" stop-color="${c.bodyBottom}"/>
    </linearGradient>
    <linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="0" y1="${k.bodyTop}" x2="0" y2="${k.bodyTop + 26 * s}">
      <stop offset="0" stop-color="${c.glass}"/>
      <stop offset="1" stop-color="${c.night}"/>
    </linearGradient>
    <radialGradient id="${id}w" gradientUnits="userSpaceOnUse" cx="${h.x}" cy="${h.y}" r="${h.size * 1.35}">
      <stop offset="0" stop-color="${c.gold}" stop-opacity="0.75"/>
      <stop offset="1" stop-color="${c.gold}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}h" gradientUnits="userSpaceOnUse" x1="0" y1="${h.y - h.size / 2}" x2="0" y2="${h.y + h.size / 2}">
      <stop offset="0" stop-color="${c.goldLight}"/>
      <stop offset="1" stop-color="${c.gold}"/>
    </linearGradient>
    <radialGradient id="${id}u" gradientUnits="userSpaceOnUse" cx="${k.wheels[0].cx}" cy="${k.wheels[0].cy}" r="${k.wheels[0].hub}">
      <stop offset="0" stop-color="${c.bodyTop}"/>
      <stop offset="1" stop-color="${c.glow}"/>
    </radialGradient>
    <clipPath id="${id}rc"><path d="${k.rearWindow}"/></clipPath>
    <mask id="${id}m" maskUnits="userSpaceOnUse" ${box}>
      <rect ${box} fill="#fff"/>
      ${k.wheels.map(w => `<circle cx="${w.cx}" cy="${w.cy}" r="${w.arch}" fill="#000"/>`).join('')}
    </mask>
    <filter id="${id}s" filterUnits="userSpaceOnUse" ${box}>
      <feDropShadow dx="0" dy="${width * 0.02}" stdDeviation="${width * 0.025}" flood-color="${c.night}" flood-opacity="0.45"/>
    </filter>
    <filter id="${id}f" filterUnits="userSpaceOnUse" ${box}>
      <feGaussianBlur stdDeviation="${width * 0.02}"/>
    </filter>
  </defs>${shadow ? `
  <ellipse cx="${cx}" cy="${groundY}" rx="${width * 0.46}" ry="${width * 0.035}" fill="${c.night}" opacity="0.5" filter="url(#${id}f)"/>` : ''}
  <g mask="url(#${id}m)">
    <path d="${k.body}" fill="url(#${id}b)"${shadow ? ` filter="url(#${id}s)"` : ''}/>
  </g>
  <path d="${k.rearWindow}" fill="url(#${id}g)"/>
  <path d="${k.frontWindow}" fill="url(#${id}g)"/>
  <g clip-path="url(#${id}rc)"><circle cx="${h.x}" cy="${h.y}" r="${h.size * 1.35}" fill="url(#${id}w)"/></g>
  <path d="${k.heart}" fill="url(#${id}h)"/>
  <ellipse cx="${k.headlight.cx}" cy="${k.headlight.cy}" rx="${k.headlight.rx}" ry="${k.headlight.ry}" fill="${c.goldLight}"/>
  ${k.wheels
    .map(
      (w, i) => `<circle cx="${w.cx}" cy="${w.cy}" r="${w.r}" fill="${c.night}" stroke="${c.glow}" stroke-opacity="0.45" stroke-width="${r1(1.4 * s)}"/>
  <circle cx="${w.cx}" cy="${w.cy}" r="${w.hub}" fill="${i ? c.glow : `url(#${id}u)`}"/>`,
    )
    .join('\n  ')}`;
}

function backgroundSvg(size, id = 'bg') {
  const s = size;
  return `
  <defs>
    <linearGradient id="${id}l" x1="0.3" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="${c.night}"/>
      <stop offset="0.55" stop-color="${c.indigo}"/>
      <stop offset="1" stop-color="${c.periwinkle}"/>
    </linearGradient>
    <radialGradient id="${id}g" cx="0.5" cy="0.5" r="0.45">
      <stop offset="0" stop-color="${c.glow}" stop-opacity="0.6"/>
      <stop offset="1" stop-color="${c.glow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#${id}l)"/>
  <rect width="${s}" height="${s}" fill="url(#${id}g)"/>`;
}

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}\n</svg>\n`;

/** Logo mark only, transparent background. */
const logoSvg = svg(512, 512, carSvg(256, 256, 470));

/** Full-bleed square icon (Play Store, website). */
const iconSvg = svg(512, 512, backgroundSvg(512) + carSvg(256, 262, 340));

/** Legacy launcher icon (API < 26): rounded square or circle with the artwork. */
function legacySvg(round) {
  const s = 192;
  const m = s * 0.04;
  const shape = round
    ? `<circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - m}"/>`
    : `<rect x="${m}" y="${m}" width="${s - 2 * m}" height="${s - 2 * m}" rx="${s * 0.22}"/>`;
  return svg(
    s,
    s,
    `<defs><clipPath id="clip">${shape}</clipPath></defs>
  <g clip-path="url(#clip)">${backgroundSvg(s)}${carSvg(s / 2, s * 0.51, s * 0.68)}</g>`,
  );
}

/** Adaptive icon foreground: 108dp canvas, artwork inside the 66dp safe zone. */
const foregroundSvg = svg(108, 108, carSvg(54, 55, 62));

// ---------------------------------------------------------------------------
// Android vector drawables

const aapt = 'xmlns:aapt="http://schemas.android.com/aapt"';

const vectorBackground = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/brand/generate.mjs -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    ${aapt}
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:pathData="M0,0h108v108h-108z">
        <aapt:attr name="android:fillColor">
            <gradient android:type="linear" android:startX="32" android:startY="0" android:endX="76" android:endY="108">
                <item android:offset="0" android:color="${c.night}" />
                <item android:offset="0.55" android:color="${c.indigo}" />
                <item android:offset="1" android:color="${c.periwinkle}" />
            </gradient>
        </aapt:attr>
    </path>
    <path android:pathData="M0,0h108v108h-108z">
        <aapt:attr name="android:fillColor">
            <gradient android:type="radial" android:centerX="54" android:centerY="54" android:gradientRadius="48">
                <item android:offset="0" android:color="#99${c.glow.slice(1)}" />
                <item android:offset="1" android:color="#00${c.glow.slice(1)}" />
            </gradient>
        </aapt:attr>
    </path>
</vector>
`;

/** Single-color car: windows cut out, the heart and the wheels (with hubs) filled. */
function monoVector(size, width, color, comment) {
  const k = car(size / 2, size / 2, width);
  const rect = `M0,0H${size}V${size}H0Z`;
  const arches = k.wheels.map(w => holePath(w.cx, w.cy, w.arch)).join(' ');
  const wheels = k.wheels.map(w => `${circlePath(w.cx, w.cy, w.r)} ${holePath(w.cx, w.cy, w.hub)}`).join(' ');
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- ${comment} Generated by scripts/brand/generate.mjs -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="${size}dp"
    android:height="${size}dp"
    android:viewportWidth="${size}"
    android:viewportHeight="${size}">
    <group>
        <clip-path android:pathData="${rect} ${arches}" />
        <path android:fillColor="${color}" android:fillType="evenOdd" android:pathData="${k.body} ${k.rearWindow} ${k.frontWindow}" />
    </group>
    <path android:fillColor="${color}" android:pathData="${k.heart}" />
    <path android:fillColor="${color}" android:pathData="${wheels}" />
</vector>
`;
}

// ---------------------------------------------------------------------------
// Rendering

function findChrome() {
  const candidates = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  const found = candidates.find(p => p && fs.existsSync(p));
  if (!found) throw new Error('Chrome / Edge not found. Set CHROME=/path/to/chrome');
  return found;
}

const chrome = findChrome();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dfm-brand-'));
let n = 0;

/** Renders an HTML document (or an SVG string) to a PNG of exactly w x h pixels. */
export function render(markup, w, h, file, { opaque = false } = {}) {
  const page = path.join(tmp, `page${n++}.html`);
  const body = markup.trimStart().startsWith('<svg')
    ? `<!doctype html><html><head><style>html,body{margin:0;background:transparent;overflow:hidden}svg{display:block;width:${w}px;height:${h}px}</style></head><body>${markup}</body></html>`
    : markup;
  fs.writeFileSync(page, body);
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--default-background-color=${opaque ? 'ffffffff' : '00000000'}`,
    `--window-size=${w},${h}`,
    `--screenshot=${file}`,
    '--virtual-time-budget=2000',
    pathToFileURL(page).href,
  ], { stdio: 'ignore' });
}

// ---------------------------------------------------------------------------
// Play Store feature graphic (1024x500). In Hebrew the layout is mirrored.

const featureText = {
  en: {
    title: "Don't Forget Me",
    tagline: 'A reminder to check the back seat every time you leave the car.',
    badges: 'Free · No ads · No sign-up',
  },
  he: {
    title: 'אל תשכח אותי',
    tagline: 'תזכורת לבדוק את המושב האחורי בכל פעם שיוצאים מהרכב.',
    badges: 'חינם · ללא פרסומות · ללא הרשמה',
  },
};

function featureGraphicHtml(lang) {
  const rtl = lang === 'he';
  const text = featureText[lang];
  const file = p => pathToFileURL(path.join(root, p)).href;
  const font = (name, weight) =>
    `@font-face{font-family:Rubik;font-weight:${weight};src:url(${file(`android/app/src/main/assets/fonts/Rubik-${name}.ttf`)})}`;
  return `<!doctype html><html><head><style>
  ${font('Regular', 400)}${font('Medium', 500)}${font('ExtraBold', 800)}
  html,body{margin:0;width:1024px;height:500px;overflow:hidden;background:${c.night};font-family:Rubik}
  .art{position:absolute;top:-10px;${rtl ? 'left' : 'right'}:-70px;width:720px;height:520px;
    background:url(${file('src/assets/images/hero-on.jpg')}) center/cover}
  .fade{position:absolute;inset:0;background:linear-gradient(${rtl ? 'to left' : 'to right'},${c.night} 30%,rgba(11,14,58,.85) 46%,rgba(11,14,58,0) 70%)}
  .glow{position:absolute;inset:0;background:radial-gradient(circle at ${rtl ? '85%' : '15%'} 20%,rgba(113,131,255,.35),rgba(113,131,255,0) 45%)}
  .text{position:absolute;top:0;bottom:0;${rtl ? 'right' : 'left'}:64px;width:470px;display:flex;flex-direction:column;justify-content:center;gap:18px}
  .icon{width:84px;height:84px;border-radius:22px;box-shadow:0 12px 30px rgba(0,0,0,.35)}
  h1{margin:0;color:#fff;font-weight:800;font-size:58px;line-height:1.05}
  p{margin:0;color:rgba(255,255,255,.82);font-size:25px;line-height:1.4;font-weight:400}
  .badges{display:inline-flex;align-self:flex-start;padding:9px 18px;border-radius:999px;background:rgba(255,185,56,.16);color:${c.gold};font-size:19px;font-weight:500}
  </style></head><body>
  <div class="art"></div><div class="fade"></div><div class="glow"></div>
  <div class="text" dir="${rtl ? 'rtl' : 'ltr'}">
    <img class="icon" src="${file('assets/icon.png')}">
    <h1>${text.title}</h1><p>${text.tagline}</p><span class="badges">${text.badges}</span>
  </div></body></html>`;
}

// ---------------------------------------------------------------------------

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  fs.writeFileSync(out('assets/brand/logo.svg'), logoSvg);
  fs.writeFileSync(out('assets/brand/icon.svg'), iconSvg);

  render(iconSvg, 512, 512, out('assets/icon.png'), { opaque: true });
  fs.copyFileSync(out('assets/icon.png'), out('website/public/icon.png'));

  // In-app logo (base size 120dp) and app icon (base size 40dp)
  for (const [suffix, scale] of [['', 1], ['@2x', 2], ['@3x', 3]]) {
    render(logoSvg, 120 * scale, 120 * scale, out(`src/assets/images/logo${suffix}.png`));
    render(legacySvg(false), 40 * scale, 40 * scale, out(`src/assets/images/app-icon${suffix}.png`));
  }

  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, scale] of Object.entries(densities)) {
    render(legacySvg(false), 48 * scale, 48 * scale, out(`android/app/src/main/res/mipmap-${d}/ic_launcher.png`));
    render(legacySvg(true), 48 * scale, 48 * scale, out(`android/app/src/main/res/mipmap-${d}/ic_launcher_round.png`));
    render(foregroundSvg, 108 * scale, 108 * scale, out(`android/app/src/main/res/mipmap-${d}/ic_launcher_foreground.png`));
  }

  fs.writeFileSync(path.join(res, 'drawable/ic_launcher_background.xml'), vectorBackground);
  fs.writeFileSync(
    path.join(res, 'drawable/ic_launcher_monochrome.xml'),
    monoVector(108, 62, '#FF000000', 'Themed (monochrome) launcher icon.'),
  );
  fs.writeFileSync(
    path.join(res, 'drawable/ic_notification.xml'),
    monoVector(24, 23, '#FFFFFFFF', 'Status bar icon.'),
  );

  render(featureGraphicHtml('en'), 1024, 500, out('assets/feature-graphic.png'), { opaque: true });
  render(featureGraphicHtml('he'), 1024, 500, out('assets/feature-graphic-he.png'), { opaque: true });

  console.log('Brand assets generated.');
}

export { backgroundSvg, carSvg, iconSvg, logoSvg, monoVector, svg };
