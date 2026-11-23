(() => {
'use strict';

// ---------- Helpers ----------
const $ = id => document.getElementById(id);
const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const toBlob = (cv, type, q) => new Promise(res => cv.toBlob(res, type, q));

// ---------- Icons (inline SVG, no downloads) ----------
const ICONS = {
  logo: "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m14.31 8 5.74 9.94\"/><path d=\"M9.69 8h11.48\"/><path d=\"m7.38 12 5.74-9.94\"/><path d=\"M9.69 16 3.95 6.06\"/><path d=\"M14.31 16H2.83\"/><path d=\"m16.62 12-5.74 9.94\"/>",
  undo: "<path d=\"M9 14 4 9l5-5\"/><path d=\"M4 9h10.5a5.5 5.5 0 0 1 0 11H11\"/>",
  redo: "<path d=\"m15 14 5-5-5-5\"/><path d=\"M20 9H9.5a5.5 5.5 0 0 0 0 11H13\"/>",
  upload: "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"m17 8-5-5-5 5\"/><path d=\"M12 3v12\"/>",
  reset: "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/><path d=\"M12 7v5l4 2\"/>",
  download: "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"m7 10 5 5 5-5\"/><path d=\"M12 15V3\"/>",
  eye: "<path d=\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  image: "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><circle cx=\"9\" cy=\"9\" r=\"2\"/><path d=\"m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21\"/>",
  adjust: "<path d=\"M21 4h-7\"/><path d=\"M10 4H3\"/><path d=\"M21 12h-9\"/><path d=\"M8 12H3\"/><path d=\"M21 20h-5\"/><path d=\"M12 20H3\"/><path d=\"M14 2v4\"/><path d=\"M8 10v4\"/><path d=\"M16 18v4\"/>",
  crop: "<path d=\"M6 2v14a2 2 0 0 0 2 2h14\"/><path d=\"M18 22V8a2 2 0 0 0-2-2H2\"/>",
  palette: "<circle cx=\"13.5\" cy=\"6.5\" r=\".5\"/><circle cx=\"17.5\" cy=\"10.5\" r=\".5\"/><circle cx=\"8.5\" cy=\"7.5\" r=\".5\"/><circle cx=\"6.5\" cy=\"12.5\" r=\".5\"/><path d=\"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z\"/>",
  sun: "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2\"/><path d=\"M12 20v2\"/><path d=\"m4.93 4.93 1.41 1.41\"/><path d=\"m17.66 17.66 1.41 1.41\"/><path d=\"M2 12h2\"/><path d=\"M20 12h2\"/><path d=\"m6.34 17.66-1.41 1.41\"/><path d=\"m19.07 4.93-1.41 1.41\"/>",
  sundim: "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 4h.01\"/><path d=\"M20 12h.01\"/><path d=\"M12 20h.01\"/><path d=\"M4 12h.01\"/><path d=\"M17.657 6.343h.01\"/><path d=\"M17.657 17.657h.01\"/><path d=\"M6.343 17.657h.01\"/><path d=\"M6.343 6.343h.01\"/>",
  contrast: "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 18a6 6 0 0 0 0-12v12z\"/>",
  drop: "<path d=\"M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z\"/>",
  hue: "<circle cx=\"9\" cy=\"9\" r=\"7\"/><circle cx=\"15\" cy=\"15\" r=\"7\"/>",
  thermo: "<path d=\"M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z\"/>",
  pipette: "<path d=\"m2 22 1-1h3l9-9\"/><path d=\"M3 21v-3l9-9\"/><path d=\"m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z\"/>",
  triangle: "<path d=\"M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z\"/>",
  waves: "<path d=\"M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1\"/><path d=\"M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1\"/><path d=\"M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1\"/>",
  vignette: "<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/>",
  feather: "<path d=\"M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z\"/><path d=\"M16 8 2 22\"/><path d=\"M17.5 15H9\"/>",
  scan: "<path d=\"M3 7V5a2 2 0 0 1 2-2h2\"/><path d=\"M17 3h2a2 2 0 0 1 2 2v2\"/><path d=\"M21 17v2a2 2 0 0 1-2 2h-2\"/><path d=\"M7 21H5a2 2 0 0 1-2-2v-2\"/>",
  rotl: "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/>",
  rotr: "<path d=\"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8\"/><path d=\"M21 3v5h-5\"/>",
  fliph: "<path d=\"m3 7 5 5-5 5V7\"/><path d=\"m21 7-5 5 5 5V7\"/><path d=\"M12 20v2\"/><path d=\"M12 14v2\"/><path d=\"M12 8v2\"/><path d=\"M12 2v2\"/>",
  flipv: "<path d=\"m17 3-5 5-5-5h10\"/><path d=\"m17 21-5-5-5 5h10\"/><path d=\"M4 12H2\"/><path d=\"M10 12H8\"/><path d=\"M16 12h-2\"/><path d=\"M22 12h-2\"/>",
  ruler: "<path d=\"M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z\"/><path d=\"m14.5 12.5 2-2\"/><path d=\"m11.5 9.5 2-2\"/><path d=\"m8.5 6.5 2-2\"/><path d=\"m17.5 15.5 2-2\"/>",
  arOrig: "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" stroke-dasharray=\"3 3\"/>",
  ar11: "<rect x=\"5\" y=\"5\" width=\"14\" height=\"14\" rx=\"1.5\"/>",
  ar43: "<rect x=\"3\" y=\"6\" width=\"18\" height=\"12\" rx=\"1.5\"/>",
  ar32: "<rect x=\"3\" y=\"6.5\" width=\"18\" height=\"11\" rx=\"1.5\"/>",
  ar169: "<rect x=\"2\" y=\"7\" width=\"20\" height=\"11.25\" rx=\"1.5\"/>",
  ar45: "<rect x=\"5\" y=\"3\" width=\"14\" height=\"17.5\" rx=\"1.5\"/>",
  sparkles: "<path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\"/><path d=\"M20 3v4\"/><path d=\"M22 5h-4\"/><path d=\"M4 17v2\"/><path d=\"M5 18H3\"/>",
  circleFocus: "<circle cx=\"12\" cy=\"12\" r=\"9\" stroke-dasharray=\"3 3\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  bandFocus: "<path d=\"M3 5h18\"/><path d=\"M3 19h18\"/><rect x=\"3\" y=\"9\" width=\"18\" height=\"6\" rx=\"1\"/>",
  eraser: "<path d=\"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21\"/><path d=\"M22 21H7\"/><path d=\"m5 11 9 9\"/>",
  brush: "<path d=\"m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08\"/><path d=\"M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z\"/>",
  blurMore: "<circle cx=\"12\" cy=\"12\" r=\"3\"/><circle cx=\"12\" cy=\"12\" r=\"7\" stroke-dasharray=\"2 3\"/><circle cx=\"12\" cy=\"12\" r=\"10\" stroke-dasharray=\"1 3\"/>",
  move: "<path d=\"M12 2v20\"/><path d=\"m15 19-3 3-3-3\"/><path d=\"m19 9 3 3-3 3\"/><path d=\"M2 12h20\"/><path d=\"m5 9-3 3 3 3\"/><path d=\"m9 5 3-3 3 3\"/>",
  swap: "<path d=\"M8 3 4 7l4 4\"/><path d=\"M4 7h16\"/><path d=\"m16 21 4-4-4-4\"/><path d=\"M20 17H4\"/>",
  brushSize: "<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/>",
  user: "<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>",
  file: "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/>",
  gauge: "<path d=\"m12 14 4-4\"/><path d=\"M3.34 19a10 10 0 1 1 17.32 0\"/>",
  archive: "<rect width=\"20\" height=\"5\" x=\"2\" y=\"3\" rx=\"1\"/><path d=\"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8\"/><path d=\"M10 12h4\"/>",
  target: "<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>",
  flag: "<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\"/><line x1=\"4\" x2=\"4\" y1=\"22\" y2=\"15\"/>",
  maximize2: "<path d=\"M15 3h6v6\"/><path d=\"M9 21H3v-6\"/><path d=\"m21 3-7 7\"/><path d=\"m3 21 7-7\"/>",
  moon: "<path d=\"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z\"/>",
};
const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
function mountIcons(root = document) {
  root.querySelectorAll('i[data-icon]').forEach(el => { if (!el.firstChild) el.innerHTML = svg(el.dataset.icon); });
}
mountIcons();

// Filled slider track: bipolar sliders (min < 0) fill from the centre
function paintRange(el) {
  const min = +el.min, max = +el.max, v = +el.value;
  const pct = x => (x - min) / (max - min) * 100;
  const p = pct(v), z = min < 0 ? pct(0) : 0;
  el.style.setProperty('--a', Math.min(p, z) + '%');
  el.style.setProperty('--b', Math.max(p, z) + '%');
}
document.addEventListener('input', e => { if (e.target.type === 'range') paintRange(e.target); });

// ---------- Theme ----------
const themeBtn = $('themeBtn');
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  themeBtn.innerHTML = `<i data-icon="${t === 'dark' ? 'sun' : 'moon'}"></i>`;
  mountIcons(themeBtn);
  themeBtn.title = t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  try { localStorage.setItem('photo-editor-theme', t); } catch (e) { /* storage unavailable */ }
}
{
  let saved = null;
  try { saved = localStorage.getItem('photo-editor-theme'); } catch (e) { /* ignore */ }
  const light = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved || (light ? 'light' : 'dark'));
}
themeBtn.onclick = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

// ---------- Slider definitions ----------
// [key, label, min, max, group, default, icon]
const sliders = [
  ['exposure',   'Exposure',      -100, 100, 'light',   0, 'sun'],
  ['brightness', 'Brightness',    -100, 100, 'light',   0, 'sundim'],
  ['contrast',   'Contrast',      -100, 100, 'light',   0, 'contrast'],
  ['saturation', 'Saturation',    -100, 100, 'color',   0, 'drop'],
  ['hue',        'Hue',           -180, 180, 'color',   0, 'hue'],
  ['warmth',     'Warmth',        -100, 100, 'color',   0, 'thermo'],
  ['tint',       'Tint',          -100, 100, 'color',   0, 'pipette'],
  ['sharpen',    'Sharpen',          0, 100, 'effects', 0, 'triangle'],
  ['blur',       'Blur',             0,  20, 'effects', 0, 'waves'],
  ['vignette',   'Vignette',         0, 100, 'effects', 0, 'vignette'],
  ['bgBlur',     'Background blur',  0, 100, 'bg',      0, 'logo'],
  ['edge',       'Edge softness',    0,  30, 'bg',      8, 'feather'],
  ['focusSize',  'Focus size',      10, 100, 'bg',     50, 'scan'],
];
const sliderHost = { light: 'adj-light', color: 'adj-color', effects: 'adj-effects', bg: 'bgSliders' };

// ---------- State ----------
const defaults = () => ({
  ...Object.fromEntries(sliders.map(x => [x[0], x[5]])),
  quarter: 0, straighten: 0, flipH: false, flipV: false,
  aspect: 0, look: 'none'
});
let s = defaults();
let img = null, fileName = 'photo';

// Background-blur mask: alpha 255 = keep sharp, alpha 0 = blur.
// Lives in source-image coordinates (so it follows rotate / flip / crop).
let mask = null;
const focus = { type: 'circle', x: 0.5, y: 0.5, active: false };
let geom = null;               // geometry of the last preview render (for brush mapping)
let tool = null;               // 'sharp' | 'blur' | 'move' | null
let showMaskFlag = false;
let comparing = false;

// ---------- Elements ----------
const view = $('view');
const stage = $('stage');

// ---------- Build sliders ----------
sliders.forEach(([key, label, min, max, panel, def, ic]) => {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<label for="s-${key}"><span class="lbl"><i data-icon="${ic}"></i>${label}</span> <output id="o-${key}">${def}</output></label>
    <input type="range" id="s-${key}" min="${min}" max="${max}" step="1" value="${def}" title="Double-click to reset">`;
  $(sliderHost[panel]).appendChild(row);
  mountIcons(row);
  const input = row.querySelector('input');
  input.addEventListener('input', () => {
    s[key] = +input.value;
    $('o-' + key).textContent = input.value;
    if (key === 'focusSize' && focus.active) applyFocus();
    schedule();
  });
  input.addEventListener('change', commit);
  input.addEventListener('dblclick', () => {
    input.value = def;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
});

// ---------- Looks ----------
const looks = {
  none:   ['Original', ''],
  vivid:  ['Vivid',    'saturate(1.45) contrast(1.1)'],
  fade:   ['Fade',     'contrast(.88) brightness(1.1) saturate(.8)'],
  warm:   ['Warm',     'sepia(.25) saturate(1.2) hue-rotate(-8deg)'],
  cool:   ['Cool',     'saturate(1.1) hue-rotate(12deg) brightness(1.03)'],
  mono:   ['Mono',     'grayscale(1) contrast(1.1)'],
  noir:   ['Noir',     'grayscale(1) contrast(1.45) brightness(.9)'],
  sepia:  ['Sepia',    'sepia(.85) contrast(1.05)'],
  punch:  ['Punch',    'contrast(1.3) saturate(1.2) brightness(.95)'],
};
const looksBox = $('looks');
Object.entries(looks).forEach(([key, [name]]) => {
  const b = document.createElement('button');
  b.className = 'look' + (key === 'none' ? ' active' : '');
  b.dataset.look = key;
  b.innerHTML = `<canvas width="96" height="96"></canvas><span>${name}</span>`;
  b.addEventListener('click', () => {
    s.look = key;
    syncUI();
    schedule();
    commit();
  });
  looksBox.appendChild(b);
});
function drawLookThumbs() {
  looksBox.querySelectorAll('.look').forEach(b => {
    const c = b.querySelector('canvas'), ctx = c.getContext('2d');
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.filter = looks[b.dataset.look][1] || 'none';
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 96, 96);
    ctx.filter = 'none';
  });
}

// ---------- Background mask ----------
function initMask() {
  const w = img.naturalWidth, h = img.naturalHeight;
  const ms = Math.min(1, 1024 / Math.max(w, h));
  const cv = mk(w * ms, h * ms);
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  mask = { cv, ctx, w: cv.width, h: cv.height };
  fillMaskOpaque();
  lastMaskData = null;
  maskDirty = false;
  focus.type = 'circle'; focus.x = 0.5; focus.y = 0.5; focus.active = false;
}
function fillMaskOpaque() {
  mask.ctx.globalCompositeOperation = 'source-over';
  mask.ctx.clearRect(0, 0, mask.w, mask.h);
  mask.ctx.fillStyle = '#fff';
  mask.ctx.fillRect(0, 0, mask.w, mask.h);
}
function grabMask() {
  const d = mask.ctx.getImageData(0, 0, mask.w, mask.h).data;
  const out = new Uint8Array(mask.w * mask.h);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3];
  return out;
}
function setMaskData(arr) {
  if (!arr) { fillMaskOpaque(); return; }
  const id = mask.ctx.createImageData(mask.w, mask.h), d = id.data;
  for (let i = 0; i < arr.length; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; d[i * 4 + 3] = arr[i]; }
  mask.ctx.putImageData(id, 0, 0);
}

// Circle / band focus presets
function applyFocus() {
  const { ctx, w, h } = mask;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);
  const size = s.focusSize / 100;
  const cx = focus.x * w, cy = focus.y * h;
  if (focus.type === 'circle') {
    const R = size * Math.min(w, h) * 0.6;
    const g = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    const H = size * h * 0.35;
    const t = v => clamp(v / h, 0, 1);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(t(cy - H), 'rgba(255,255,255,0)');
    g.addColorStop(t(cy - H * 0.45), 'rgba(255,255,255,1)');
    g.addColorStop(t(cy + H * 0.45), 'rgba(255,255,255,1)');
    g.addColorStop(t(cy + H), 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  maskDirty = true;
}
function ensureBlurOn() {
  if (s.bgBlur === 0) { s.bgBlur = 40; syncUI(); }
}
function setBgStatus(t) { $('bgStatus').textContent = t; }

// ---------- AI subject detection (MediaPipe, loaded on demand) ----------
const MP_VER = '0.10.14';
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const SEG_MODELS = {
  person:  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
  objects: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/latest/deeplab_v3.tflite',
};
let mpLib = null, mpFiles = null;
const segmenters = {};
async function getSegmenter(kind) {
  if (!mpLib) {
    setBgStatus('Loading AI engine…');
    mpLib = await import(`${MP_BASE}/vision_bundle.mjs`);
    mpFiles = await mpLib.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
  }
  if (!segmenters[kind]) {
    setBgStatus('Downloading AI model…');
    segmenters[kind] = await mpLib.ImageSegmenter.createFromOptions(mpFiles, {
      baseOptions: { modelAssetPath: SEG_MODELS[kind] },
      runningMode: 'IMAGE',
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });
  }
  return segmenters[kind];
}
async function autoDetect() {
  if (!img) return;
  const btn = $('bgAuto');
  btn.disabled = true;
  try {
    const seg = await getSegmenter($('segModel').value);
    setBgStatus('Finding the subject…');
    await new Promise(r => setTimeout(r, 20));
    const src = mk(mask.w, mask.h);
    src.getContext('2d').drawImage(img, 0, 0, mask.w, mask.h);
    const res = seg.segment(src);
    const cm = res.categoryMask;
    const data = cm.getAsUint8Array();
    const mw = cm.width, mh = cm.height;
    const id = new ImageData(mw, mh);
    let fg = 0;
    for (let i = 0; i < data.length; i++) {
      const on = data[i] > 0;
      if (on) fg++;
      id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255;
      id.data[i * 4 + 3] = on ? 255 : 0;
    }
    if (cm.close) cm.close();
    if (!fg) {
      setBgStatus('No subject was found. Try "Objects, pets, people", Circle focus, or paint with the brush.');
      return;
    }
    const tmp = mk(mw, mh);
    tmp.getContext('2d').putImageData(id, 0, 0);
    mask.ctx.globalCompositeOperation = 'source-over';
    mask.ctx.clearRect(0, 0, mask.w, mask.h);
    mask.ctx.imageSmoothingQuality = 'high';
    mask.ctx.drawImage(tmp, 0, 0, mask.w, mask.h);
    maskDirty = true;
    focus.active = false;
    if (s.bgBlur === 0) s.bgBlur = 40;
    syncUI();
    schedule();
    commit();
    setBgStatus('Done. Adjust the blur amount, or fix the edges with the brush. If the wrong area is blurred, press "Swap sharp / blur".');
  } catch (err) {
    console.error(err);
    setBgStatus('Could not load the AI model (it needs internet the first time). Use Circle focus, Band focus or the brush instead.');
  } finally {
    btn.disabled = false;
  }
}

// ---------- Rendering ----------
function filterString(scale) {
  const exp = Math.pow(2, s.exposure / 100);
  const br = (1 + s.brightness / 100) * exp;
  const parts = [
    `brightness(${Math.max(0, br)})`,
    `contrast(${1 + s.contrast / 100})`,
    `saturate(${1 + s.saturation / 100})`,
  ];
  if (s.hue) parts.push(`hue-rotate(${s.hue}deg)`);
  if (s.blur) parts.push(`blur(${s.blur * scale}px)`);
  const look = looks[s.look][1];
  if (look) parts.push(look);
  return parts.join(' ');
}

// Copy of a canvas with its edge pixels repeated outward, so blurs don't fade at the borders
function padEdges(src, p) {
  const w = src.width, h = src.height, c = mk(w + 2 * p, h + 2 * p), x = c.getContext('2d');
  x.drawImage(src, p, p);
  x.drawImage(src, 0, 0, 1, h, 0, p, p, h);
  x.drawImage(src, w - 1, 0, 1, h, w + p, p, p, h);
  x.drawImage(src, 0, 0, w, 1, p, 0, w, p);
  x.drawImage(src, 0, h - 1, w, 1, p, h + p, w, p);
  x.drawImage(src, 0, 0, 1, 1, 0, 0, p, p);
  x.drawImage(src, w - 1, 0, 1, 1, w + p, 0, p, p);
  x.drawImage(src, 0, h - 1, 1, 1, 0, h + p, p, p);
  x.drawImage(src, w - 1, h - 1, 1, 1, w + p, h + p, p, p);
  return c;
}

function render(canvas, maxDim) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const scale = maxDim ? Math.min(1, maxDim / Math.max(w, h)) : 1;
  const sw = w * scale, sh = h * scale;
  const odd = s.quarter % 2 !== 0;
  const ow = odd ? sh : sw, oh = odd ? sw : sh;

  let cw = ow, ch = oh;
  if (s.aspect) {
    if (ow / oh > s.aspect) cw = oh * s.aspect; else ch = ow / s.aspect;
  }
  cw = Math.round(cw); ch = Math.round(ch);
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const a = s.straighten * Math.PI / 180;
  const zoom = Math.cos(Math.abs(a)) + Math.sin(Math.abs(a)) * Math.max(cw / ch, ch / cw);
  const ang = a + s.quarter * Math.PI / 2;
  const xform = c => {
    c.translate(cw / 2, ch / 2);
    c.scale(zoom, zoom);
    c.rotate(ang);
    c.scale(s.flipH ? -1 : 1, s.flipV ? -1 : 1);
  };
  if (canvas === view) geom = { cw, ch, zoom, ang, flipH: s.flipH, flipV: s.flipV, sw, sh };

  // 1. Base image with CSS-style filters
  ctx.save();
  ctx.filter = filterString(scale);
  xform(ctx);
  ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();

  // 2. Per-pixel colour (warmth and tint)
  if (s.warmth || s.tint) {
    const d = ctx.getImageData(0, 0, cw, ch), p = d.data, k = s.warmth * 0.5, t = s.tint * 0.4;
    for (let i = 0; i < p.length; i += 4) {
      p[i]     = p[i] + k;
      p[i + 1] = p[i + 1] - t;
      p[i + 2] = p[i + 2] - k;
    }
    ctx.putImageData(d, 0, 0);
  }

  // 3. Sharpen (unsharp mask)
  if (s.sharpen) {
    const amt = s.sharpen / 100 * 1.6;
    const bl = mk(cw, ch), bx = bl.getContext('2d', { willReadFrequently: true });
    bx.filter = `blur(${Math.max(0.5, 1.3 * scale)}px)`;
    bx.drawImage(canvas, 0, 0);
    const A = ctx.getImageData(0, 0, cw, ch), B = bx.getImageData(0, 0, cw, ch);
    const pa = A.data, pb = B.data;
    for (let i = 0; i < pa.length; i += 4) {
      pa[i]     = pa[i]     + amt * (pa[i]     - pb[i]);
      pa[i + 1] = pa[i + 1] + amt * (pa[i + 1] - pb[i + 1]);
      pa[i + 2] = pa[i + 2] + amt * (pa[i + 2] - pb[i + 2]);
    }
    ctx.putImageData(A, 0, 0);
  }

  // 4. Background blur (sharp subject over a blurred copy)
  const maskOn = mask && s.bgBlur > 0;
  const showOv = mask && canvas === view && showMaskFlag && !comparing;
  let mc = null;
  if (maskOn || showOv) {
    const edgePx = s.edge * 0.0008 * Math.max(cw, ch);
    const ux = sw / mask.w, uy = sh / mask.h;
    const k = zoom * Math.min(ux, uy);                        // output px per mask px
    const pad = Math.min(200, Math.ceil(edgePx * 3 / Math.max(k, 0.01)) + 2);
    const padded = padEdges(mask.cv, pad);
    mc = mk(cw, ch);
    const mx = mc.getContext('2d');
    mx.save();
    if (edgePx > 0.3) mx.filter = `blur(${edgePx}px)`;
    xform(mx);
    mx.drawImage(padded, -sw / 2 - pad * ux, -sh / 2 - pad * uy, (mask.w + 2 * pad) * ux, (mask.h + 2 * pad) * uy);
    mx.restore();
  }
  if (maskOn) {
    const r = s.bgBlur * 0.0004 * Math.max(cw, ch);           // 100 = 4% of the long side
    const bp = Math.ceil(r * 3) + 2;
    const bpad = padEdges(canvas, bp);
    const bl = mk(cw, ch), bx = bl.getContext('2d');
    bx.filter = `blur(${r}px)`;
    bx.drawImage(bpad, -bp, -bp);
    const sub = mk(cw, ch), sx = sub.getContext('2d');
    sx.drawImage(canvas, 0, 0);
    sx.globalCompositeOperation = 'destination-in';
    sx.drawImage(mc, 0, 0);
    ctx.drawImage(bl, 0, 0);
    ctx.drawImage(sub, 0, 0);
  }

  // 5. Vignette
  if (s.vignette) {
    const r = Math.hypot(cw, ch) / 2;
    const g = ctx.createRadialGradient(cw / 2, ch / 2, r * 0.35, cw / 2, ch / 2, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${s.vignette / 100 * 0.85})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
  }

  // 6. Preview-only: tint the blurred area red
  if (showOv) {
    const ov = mk(cw, ch), ox = ov.getContext('2d');
    ox.fillStyle = 'rgba(255,70,70,0.5)';
    ox.fillRect(0, 0, cw, ch);
    ox.globalCompositeOperation = 'destination-out';
    ox.drawImage(mc, 0, 0);
    ctx.drawImage(ov, 0, 0);
  }
}

let raf = 0;
function schedule() {
  if (!img) return;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    render(view, 1600);
    updateInfo();
  });
}

function outDims() {
  const w = img.naturalWidth, h = img.naturalHeight, odd = s.quarter % 2 !== 0;
  let ow = odd ? h : w, oh = odd ? w : h;
  if (s.aspect) { if (ow / oh > s.aspect) ow = oh * s.aspect; else oh = ow / s.aspect; }
  return [Math.round(ow), Math.round(oh)];
}
function updateInfo() {
  let [ow, oh] = outDims();
  const m = +$('maxSide').value;
  if (m && Math.max(ow, oh) > m) {
    const f = m / Math.max(ow, oh);
    ow = Math.round(ow * f); oh = Math.round(oh * f);
  }
  const txt = `${ow} × ${oh} px`;
  $('info').textContent = txt;
  $('sizeHint').textContent = m ? `Exports at ${txt} (longest side limited to ${m} px).` : `Exports at the original resolution (${txt}).`;
}

// ---------- History (undo / redo) ----------
const hist = [];
let hi = -1, maskDirty = false, lastMaskData = null;
function snap() {
  if (maskDirty) { lastMaskData = grabMask(); maskDirty = false; }
  return { s: JSON.stringify(s), m: lastMaskData };
}
function commit() {
  if (!img) return;
  const sn = snap(), cur = hist[hi];
  if (cur && cur.s === sn.s && cur.m === sn.m) return;
  hist.length = hi + 1;
  hist.push(sn);
  if (hist.length > 40) hist.shift();
  hi = hist.length - 1;
  updateHistBtns();
}
function restore(sn) {
  s = JSON.parse(sn.s);
  setMaskData(sn.m);
  lastMaskData = sn.m; maskDirty = false;
  syncUI();
  schedule();
  updateHistBtns();
}
function undo() { if (img && hi > 0) { hi--; restore(hist[hi]); } }
function redo() { if (img && hi < hist.length - 1) { hi++; restore(hist[hi]); } }
function updateHistBtns() {
  $('undoBtn').disabled = !(img && hi > 0);
  $('redoBtn').disabled = !(img && hi < hist.length - 1);
}
$('undoBtn').onclick = undo;
$('redoBtn').onclick = redo;

// ---------- UI sync ----------
function syncUI() {
  sliders.forEach(([k]) => { $('s-' + k).value = s[k]; $('o-' + k).textContent = s[k]; });
  $('straighten').value = s.straighten;
  $('straightenOut').textContent = s.straighten.toFixed(1) + '°';
  document.querySelectorAll('#aspects button').forEach(b => b.classList.toggle('active', +b.dataset.aspect === s.aspect));
  $('flipH').classList.toggle('active', s.flipH);
  $('flipV').classList.toggle('active', s.flipV);
  looksBox.querySelectorAll('.look').forEach(x => x.classList.toggle('active', x.dataset.look === s.look));
  document.querySelectorAll('input[type=range]').forEach(paintRange);
}
function updateToolUI() {
  [['sharp', 'toolSharp'], ['blur', 'toolBlur'], ['move', 'toolMove']].forEach(([k, id]) =>
    $(id).classList.toggle('active', tool === k));
  $('showMask').classList.toggle('active', showMaskFlag);
  stage.classList.toggle('tool-brush', tool === 'sharp' || tool === 'blur');
  stage.classList.toggle('tool-move', tool === 'move');
  if (!(tool === 'sharp' || tool === 'blur')) $('brushCursor').style.display = 'none';
}

// ---------- Loading ----------
function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  fileName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  const url = URL.createObjectURL(file);
  const im = new Image();
  im.onload = () => {
    URL.revokeObjectURL(url);
    img = im;
    hist.length = 0; hi = -1;
    $('drop').style.display = 'none';
    view.style.display = 'block';
    $('floatbar').style.display = 'flex';
    $('resetBtn').disabled = false;
    $('downloadBtn').disabled = false;
    $('exportStatus').textContent = '';
    setBgStatus('Auto-detect downloads a small AI model the first time, so it needs internet. Circle and Band focus work offline.');
    drawLookThumbs();
    resetAll();
  };
  im.onerror = () => alert('That file could not be read as an image. Try a JPEG, PNG or WebP file.');
  im.src = url;
}

function resetAll() {
  if (!img) return;
  s = defaults();
  initMask();
  tool = null; showMaskFlag = false;
  updateToolUI();
  syncUI();
  schedule();
  commit();
}

// ---------- Events ----------
const picker = $('file');
$('openBtn').onclick = $('openBtn2').onclick = () => picker.click();
picker.onchange = () => { loadFile(picker.files[0]); picker.value = ''; };
$('resetBtn').onclick = resetAll;

['dragenter', 'dragover'].forEach(ev => stage.addEventListener(ev, e => { e.preventDefault(); stage.classList.add('drag'); }));
['dragleave', 'drop'].forEach(ev => stage.addEventListener(ev, e => { e.preventDefault(); stage.classList.remove('drag'); }));
stage.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));
window.addEventListener('paste', e => {
  const f = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith('image/'));
  if (f) loadFile(f);
});

// Tabs
document.querySelectorAll('nav [role=tab]').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('nav [role=tab]').forEach(x => x.setAttribute('aria-selected', x === t));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('show', p.id === 'tab-' + t.dataset.tab));
}));

// Orient
$('rotL').onclick = () => { s.quarter = (s.quarter + 3) % 4; schedule(); commit(); };
$('rotR').onclick = () => { s.quarter = (s.quarter + 1) % 4; schedule(); commit(); };
$('flipH').onclick = () => { s.flipH = !s.flipH; syncUI(); schedule(); commit(); };
$('flipV').onclick = () => { s.flipV = !s.flipV; syncUI(); schedule(); commit(); };
$('straighten').oninput = e => {
  s.straighten = +e.target.value; $('straightenOut').textContent = s.straighten.toFixed(1) + '°'; schedule();
};
$('straighten').onchange = commit;
$('straighten').ondblclick = e => {
  e.target.value = 0;
  e.target.dispatchEvent(new Event('input', { bubbles: true }));
  e.target.dispatchEvent(new Event('change', { bubbles: true }));
};
document.querySelectorAll('#aspects button').forEach(b => b.addEventListener('click', () => {
  s.aspect = +b.dataset.aspect;
  syncUI(); schedule(); commit();
}));

// Background blur: presets
function usePreset(type) {
  if (!img) return;
  focus.type = type; focus.x = 0.5; focus.y = 0.5; focus.active = true;
  applyFocus();
  ensureBlurOn();
  schedule(); commit();
  setBgStatus(type === 'circle'
    ? 'Circle focus set. Use "Move focus" to drag it, and "Focus size" to resize it.'
    : 'Band focus set. Use "Move focus" to drag it, and "Focus size" to change its height.');
}
$('bgAuto').onclick = autoDetect;
$('bgCircle').onclick = () => usePreset('circle');
$('bgBand').onclick = () => usePreset('band');
$('bgClear').onclick = () => {
  if (!img) return;
  fillMaskOpaque(); maskDirty = true; focus.active = false;
  s.bgBlur = 0; syncUI(); schedule(); commit();
  setBgStatus('Background blur cleared.');
};
$('invertMask').onclick = () => {
  if (!img) return;
  const id = mask.ctx.getImageData(0, 0, mask.w, mask.h), d = id.data;
  for (let i = 3; i < d.length; i += 4) d[i] = 255 - d[i];
  mask.ctx.putImageData(id, 0, 0);
  maskDirty = true; focus.active = false;
  ensureBlurOn(); schedule(); commit();
};
$('showMask').onclick = () => { showMaskFlag = !showMaskFlag; updateToolUI(); schedule(); };

// Brush tools
[['sharp', 'toolSharp'], ['blur', 'toolBlur'], ['move', 'toolMove']].forEach(([k, id]) => {
  $(id).onclick = () => {
    tool = tool === k ? null : k;
    showMaskFlag = !!tool;
    updateToolUI();
    schedule();
  };
});
$('brushSize').oninput = e => {
  $('brushOut').textContent = e.target.value;
  $('brushCursor').style.width = $('brushCursor').style.height = e.target.value + 'px';
};
$('brushCursor').style.width = $('brushCursor').style.height = '40px';

function viewToMask(cx, cy) {
  if (!geom || !mask) return null;
  const rect = view.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const px = (cx - rect.left) * geom.cw / rect.width;
  const py = (cy - rect.top) * geom.ch / rect.height;
  const x = (px - geom.cw / 2) / geom.zoom, y = (py - geom.ch / 2) / geom.zoom;
  const cos = Math.cos(-geom.ang), sin = Math.sin(-geom.ang);
  let ux = x * cos - y * sin, uy = x * sin + y * cos;
  if (geom.flipH) ux = -ux;
  if (geom.flipV) uy = -uy;
  const fx = ux / geom.sw + 0.5, fy = uy / geom.sh + 0.5;
  const rView = (+$('brushSize').value / 2) * geom.cw / rect.width;
  const r = rView / geom.zoom * (mask.w / geom.sw);
  return { fx, fy, x: fx * mask.w, y: fy * mask.h, r };
}
function stamp(x, y, r) {
  const c = mask.ctx;
  c.save();
  c.globalCompositeOperation = tool === 'sharp' ? 'source-over' : 'destination-out';
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.65, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.restore();
}
let painting = false, last = null;
function strokeAt(e) {
  const p = viewToMask(e.clientX, e.clientY);
  if (!p) return;
  if (tool === 'move') {
    focus.x = clamp(p.fx, 0, 1); focus.y = clamp(p.fy, 0, 1);
    focus.active = true;
    applyFocus(); ensureBlurOn(); schedule();
    return;
  }
  focus.active = false;
  if (tool === 'blur') ensureBlurOn();
  if (last) {
    const dx = p.x - last.x, dy = p.y - last.y;
    const n = Math.ceil(Math.hypot(dx, dy) / Math.max(1, p.r * 0.25));
    for (let i = 1; i <= n; i++) stamp(last.x + dx * i / n, last.y + dy * i / n, p.r);
  } else {
    stamp(p.x, p.y, p.r);
  }
  last = { x: p.x, y: p.y };
  maskDirty = true;
  schedule();
}
function moveCursor(e) {
  const cur = $('brushCursor');
  if (!(tool === 'sharp' || tool === 'blur')) { cur.style.display = 'none'; return; }
  const r = stage.getBoundingClientRect();
  cur.style.left = (e.clientX - r.left) + 'px';
  cur.style.top = (e.clientY - r.top) + 'px';
  cur.style.display = 'block';
}
view.addEventListener('pointerdown', e => {
  if (!tool || !img) return;
  e.preventDefault();
  view.setPointerCapture(e.pointerId);
  painting = true; last = null;
  strokeAt(e);
});
view.addEventListener('pointermove', e => {
  moveCursor(e);
  if (painting) strokeAt(e);
});
const endStroke = () => { if (painting) { painting = false; last = null; commit(); } };
view.addEventListener('pointerup', endStroke);
view.addEventListener('pointercancel', endStroke);
view.addEventListener('pointerleave', () => { $('brushCursor').style.display = 'none'; });

// Compare (hold to show original)
const cmp = $('compare');
const showOriginal = on => {
  if (!img) return;
  if (on) {
    if (comparing) return;
    comparing = true;
    const keep = s; s = defaults(); s.quarter = keep.quarter; s.flipH = keep.flipH; s.flipV = keep.flipV;
    s.straighten = keep.straighten; s.aspect = keep.aspect;
    render(view, 1600); s = keep;
  } else if (comparing) {
    comparing = false;
    schedule();
  }
};
cmp.addEventListener('pointerdown', () => showOriginal(true));
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => cmp.addEventListener(ev, () => showOriginal(false)));

// Keyboard shortcuts
window.addEventListener('keydown', e => {
  const t = e.target;
  if (t && (t.tagName === 'SELECT' || (t.tagName === 'INPUT' && t.type === 'number'))) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && k === 'y') { e.preventDefault(); redo(); }
  else if (mod && k === 's') { e.preventDefault(); if (img) doDownload(); }
  else if (mod && k === 'o') { e.preventDefault(); picker.click(); }
  else if (e.key === '\\' && !e.repeat) showOriginal(true);
});
window.addEventListener('keyup', e => { if (e.key === '\\') showOriginal(false); });

// ---------- Export ----------
const fmt = $('format'), q = $('quality');

// kind: how the "compress to target size" search works for that format
//   q = lossy quality, levels = colour levels (lossless formats), palette = GIF colours, none = size only
const FORMATS = {
  'image/jpeg':      { label: 'JPEG', ext: 'jpg',  kind: 'q',       native: true  },
  'image/png':       { label: 'PNG',  ext: 'png',  kind: 'levels',  native: true  },
  'image/webp':      { label: 'WebP', ext: 'webp', kind: 'q',       native: true  },
  'image/avif':      { label: 'AVIF', ext: 'avif', kind: 'q',       native: true  },
  'image/gif':       { label: 'GIF',  ext: 'gif',  kind: 'palette', native: false },
  'image/bmp':       { label: 'BMP',  ext: 'bmp',  kind: 'none',    native: false },
  'image/x-icon':    { label: 'ICO',  ext: 'ico',  kind: 'levels',  native: false },
  'application/pdf': { label: 'PDF',  ext: 'pdf',  kind: 'q',       native: false },
};
const COMPRESS_HINT = {
  'image/jpeg': 'Lowers the quality and, if needed, shrinks the dimensions until the file fits.',
  'image/webp': 'Lowers the quality and, if needed, shrinks the dimensions until the file fits. WebP gives the smallest files.',
  'image/avif': 'Lowers the quality and, if needed, shrinks the dimensions until the file fits.',
  'image/png':  'PNG is lossless, so this reduces the number of colours and, if needed, shrinks the dimensions. For small files WebP or JPEG is far better.',
  'image/gif':  'Reduces the number of colours and, if needed, shrinks the dimensions.',
  'image/bmp':  'BMP cannot be compressed, so only the dimensions are reduced. Choose WebP or JPEG for small files.',
  'image/x-icon': 'Icons are limited to 256 px. Colours are reduced if needed.',
  'application/pdf': 'Puts the photo on a single PDF page, lowering the image quality (and size if needed) to fit.',
};
const FORMAT_NOTE = {
  'image/avif': 'AVIF only works in browsers that can create it. It is disabled here if yours cannot.',
  'image/gif': 'GIF uses at most 256 colours, so photos may look banded.',
  'image/bmp': 'BMP files are uncompressed and very large.',
  'image/x-icon': 'The icon is scaled to fit inside 256 × 256 px.',
  'application/pdf': 'Creates a one-page PDF sized to the photo. No transparency.',
  'image/jpeg': 'JPEG has no transparency; transparent areas become white.',
};

function syncExportUI() {
  const type = fmt.value, kind = FORMATS[type].kind, c = $('compressOn').checked;
  $('compressBox').hidden = !c;
  $('qualityOut').textContent = q.value;
  $('qualityRow').style.display = (!c && kind === 'q') ? '' : 'none';
  $('colorsRow').style.display = (!c && kind === 'palette') ? '' : 'none';
  $('compressHint').textContent = COMPRESS_HINT[type] || '';
  $('formatNote').textContent = FORMAT_NOTE[type] || '';
}
fmt.onchange = q.oninput = syncExportUI;
$('compressOn').onchange = syncExportUI;
$('maxSide').onchange = () => { if (img) updateInfo(); };
document.querySelectorAll('#kbPresets button').forEach(b => b.addEventListener('click', () => {
  $('targetKB').value = b.dataset.kb;
  $('compressOn').checked = true;
  syncExportUI();
}));
syncExportUI();
document.querySelectorAll('input[type=range]').forEach(paintRange);

// Disable formats this browser cannot create (WebP / AVIF encoding depends on the browser)
(async function detectSupport() {
  const c = mk(2, 2);
  for (const t of ['image/webp', 'image/avif']) {
    let ok = false;
    try { const b = await toBlob(c, t, 0.8); ok = !!b && b.type === t; } catch (e) { /* unsupported */ }
    if (!ok) {
      const opt = [...fmt.options].find(o => o.value === t);
      if (opt) { opt.disabled = true; opt.textContent += ' (not supported here)'; }
    }
  }
  if (fmt.options[fmt.selectedIndex].disabled) fmt.value = 'image/jpeg';
  syncExportUI();
})();

// <<ENCODERS>>
function step(cv, w, h) {
  const c = mk(w, h), x = c.getContext('2d');
  x.imageSmoothingQuality = 'high';
  x.drawImage(cv, 0, 0, c.width, c.height);
  return c;
}
function resizeTo(cv, tw, th) {   // halves repeatedly for a cleaner downscale
  let cur = cv;
  while (cur.width / tw > 2 || cur.height / th > 2) {
    cur = step(cur, Math.max(tw, Math.round(cur.width / 2)), Math.max(th, Math.round(cur.height / 2)));
  }
  return step(cur, tw, th);
}
function fitMax(cv, maxSide) {
  const m = Math.max(cv.width, cv.height);
  if (m <= maxSide) return cv;
  return resizeTo(cv, Math.round(cv.width * maxSide / m), Math.round(cv.height * maxSide / m));
}
function flattenWhite(cv) {
  const f = mk(cv.width, cv.height), c = f.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, f.width, f.height);
  c.drawImage(cv, 0, 0);
  return f;
}
function posterize(cv, levels) {         // fewer colour levels = smaller PNG
  const out = mk(cv.width, cv.height), c = out.getContext('2d', { willReadFrequently: true });
  c.drawImage(cv, 0, 0);
  const id = c.getImageData(0, 0, out.width, out.height), d = id.data, k = (levels - 1) / 255;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = Math.round(d[i] * k) / k;
    d[i + 1] = Math.round(d[i + 1] * k) / k;
    d[i + 2] = Math.round(d[i + 2] * k) / k;
  }
  c.putImageData(id, 0, 0);
  return out;
}

// --- BMP (24-bit) ---
function encodeBmp(cv) {
  const flat = flattenWhite(cv), w = flat.width, h = flat.height;
  const d = flat.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const row = (w * 3 + 3) & ~3, size = 54 + row * h;
  const buf = new ArrayBuffer(size), v = new DataView(buf), u = new Uint8Array(buf);
  u[0] = 0x42; u[1] = 0x4D;
  v.setUint32(2, size, true); v.setUint32(10, 54, true); v.setUint32(14, 40, true);
  v.setInt32(18, w, true); v.setInt32(22, h, true);
  v.setUint16(26, 1, true); v.setUint16(28, 24, true);
  v.setUint32(34, row * h, true); v.setInt32(38, 2835, true); v.setInt32(42, 2835, true);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s0 = ((h - 1 - y) * w + x) * 4, t = 54 + y * row + x * 3;
      u[t] = d[s0 + 2]; u[t + 1] = d[s0 + 1]; u[t + 2] = d[s0];
    }
  }
  return new Blob([buf], { type: 'image/bmp' });
}

// --- GIF (median-cut palette + LZW) ---
function quantizeImage(d, w, h, maxColors) {
  const n = w * h;
  let hasT = false;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 128) { hasT = true; break; }
  const target = Math.max(2, hasT ? maxColors - 1 : maxColors);
  const stride = Math.max(1, Math.floor(n / 30000));
  const pts = [];
  for (let i = 0; i < n; i += stride) { const k = i * 4; if (d[k + 3] >= 128) pts.push(d[k], d[k + 1], d[k + 2]); }
  if (!pts.length) pts.push(0, 0, 0);
  const m = pts.length / 3;
  let boxes = [Array.from({ length: m }, (_, i) => i)];
  const ranges = b => {
    const mn = [255, 255, 255], mx = [0, 0, 0];
    for (const id of b) for (let c = 0; c < 3; c++) { const v = pts[id * 3 + c]; if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; }
    return [mn, mx];
  };
  while (boxes.length < target) {
    let bi = -1, bs = 0, bc = 0;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      const [mn, mx] = ranges(b);
      let c = 0, r = mx[0] - mn[0];
      if (mx[1] - mn[1] > r) { r = mx[1] - mn[1]; c = 1; }
      if (mx[2] - mn[2] > r) { r = mx[2] - mn[2]; c = 2; }
      const score = r * b.length;
      if (score > bs) { bs = score; bi = i; bc = c; }
    });
    if (bi < 0) break;
    const b = boxes[bi];
    b.sort((x, y) => pts[x * 3 + bc] - pts[y * 3 + bc]);
    const mid = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  const pal = [];
  for (const b of boxes) {
    let r = 0, g = 0, bl = 0;
    for (const id of b) { r += pts[id * 3]; g += pts[id * 3 + 1]; bl += pts[id * 3 + 2]; }
    pal.push(Math.round(r / b.length), Math.round(g / b.length), Math.round(bl / b.length));
  }
  const real = pal.length / 3;
  let trans = -1;
  if (hasT) { trans = real; pal.push(0, 0, 0); }
  let size = 2;
  while (size < pal.length / 3) size *= 2;
  while (pal.length < size * 3) pal.push(0);
  const bpp = Math.log2(size);
  const cache = new Int16Array(32768).fill(-1), idx = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const k = i * 4;
    if (d[k + 3] < 128) { idx[i] = trans; continue; }
    const r = d[k], g = d[k + 1], b = d[k + 2], key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let c = cache[key];
    if (c < 0) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < real; j++) {
        const dr = r - pal[j * 3], dg = g - pal[j * 3 + 1], db = b - pal[j * 3 + 2], dist = dr * dr + dg * dg + db * db;
        if (dist < bd) { bd = dist; best = j; }
      }
      c = cache[key] = best;
    }
    idx[i] = c;
  }
  return { pal, bpp, idx, trans };
}
function lzwEncode(indices, minCode) {
  const clear = 1 << minCode, eoi = clear + 1;
  let codeSize = minCode + 1, next = eoi + 1, cur = 0, bits = 0;
  const out = [];
  const write = c => {
    cur |= c << bits; bits += codeSize;
    while (bits >= 8) { out.push(cur & 255); cur >>= 8; bits -= 8; }
  };
  let dict = new Map();
  write(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = (prefix << 8) | k, found = dict.get(key);
    if (found !== undefined) { prefix = found; continue; }
    write(prefix);
    if (next === 4096) {
      write(clear);
      next = eoi + 1; codeSize = minCode + 1; dict = new Map();
    } else {
      if (next >= (1 << codeSize)) codeSize++;
      dict.set(key, next++);
    }
    prefix = k;
  }
  write(prefix);
  write(eoi);
  if (bits > 0) out.push(cur & 255);
  return out;
}
function encodeGif(cv, colors) {
  const w = cv.width, h = cv.height;
  const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const { pal, bpp, idx, trans } = quantizeImage(d, w, h, colors);
  const le = v => [v & 255, (v >> 8) & 255];
  const out = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, ...le(w), ...le(h), 0x80 | ((bpp - 1) << 4) | (bpp - 1), 0, 0];
  for (const v of pal) out.push(v);
  if (trans >= 0) out.push(0x21, 0xF9, 0x04, 0x01, 0, 0, trans, 0);
  out.push(0x2C, 0, 0, 0, 0, ...le(w), ...le(h), 0);
  const minCode = Math.max(2, bpp);
  out.push(minCode);
  const data = lzwEncode(idx, minCode);
  for (let i = 0; i < data.length; i += 255) {
    const n = Math.min(255, data.length - i);
    out.push(n);
    for (let j = 0; j < n; j++) out.push(data[i + j]);
  }
  out.push(0, 0x3B);
  return new Blob([Uint8Array.from(out)], { type: 'image/gif' });
}

// --- ICO (PNG inside an icon container, max 256 px) ---
async function encodeIco(cv, levels) {
  const c = fitMax(cv, 256);
  const png = await encodeAs('image/png', c, levels);
  if (!png) return null;
  const bytes = new Uint8Array(await png.arrayBuffer());
  const head = new ArrayBuffer(22), v = new DataView(head), u = new Uint8Array(head);
  v.setUint16(2, 1, true); v.setUint16(4, 1, true);
  u[6] = c.width >= 256 ? 0 : c.width; u[7] = c.height >= 256 ? 0 : c.height;
  v.setUint16(10, 1, true); v.setUint16(12, 32, true);
  v.setUint32(14, bytes.length, true); v.setUint32(18, 22, true);
  return new Blob([head, bytes], { type: 'image/x-icon' });
}

// --- PDF (one page, the photo embedded as JPEG) ---
async function encodePdf(cv, quality) {
  const jb = await toBlob(flattenWhite(cv), 'image/jpeg', quality);
  if (!jb) return null;
  const jpeg = new Uint8Array(await jb.arrayBuffer());
  const W = cv.width, H = cv.height, pw = (W * 0.75).toFixed(2), ph = (H * 0.75).toFixed(2);
  const enc = new TextEncoder(), parts = [], offs = [];
  let len = 0;
  const push = b => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length; };
  push('%PDF-1.4\n');
  offs[1] = len; push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  offs[2] = len; push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  offs[3] = len; push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
  offs[4] = len; push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  push(jpeg); push('\nendstream\nendobj\n');
  const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
  offs[5] = len; push(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
  const xref = len;
  let x = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
  push(x);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

// One entry point: p = quality (0-1) for 'q' formats, levels for PNG/ICO, colours for GIF
async function encodeAs(type, cv, p) {
  switch (type) {
    case 'image/jpeg':   return toBlob(flattenWhite(cv), type, p);
    case 'image/webp':
    case 'image/avif':   return toBlob(cv, type, p);
    case 'image/png':    return toBlob(p < 256 ? posterize(cv, p) : cv, 'image/png');
    case 'image/gif':    return encodeGif(cv, p);
    case 'image/bmp':    return encodeBmp(cv);
    case 'image/x-icon': return encodeIco(cv, p);
    case 'application/pdf': return encodePdf(cv, p);
  }
  return null;
}

// --- Compress to a target size, for any format ---
const range = (a, b, st) => { const o = []; for (let v = a; st < 0 ? v >= b - 1e-9 : v <= b + 1e-9; v += st) o.push(Math.round(v * 1000) / 1000); return o; };
const CANDIDATES = {                 // ordered best -> worst
  q:       { balanced: range(0.95, 0.45, -0.025), full: range(0.95, 0.03, -0.02) },
  levels:  { balanced: [256, 128, 96, 64, 48, 32], full: [256, 128, 96, 64, 48, 32, 24, 16, 12, 8, 6, 4] },
  palette: { balanced: [256, 192, 128, 96, 64],    full: [256, 192, 128, 96, 64, 48, 32, 16, 8] },
  none:    { balanced: [0], full: [0] },
};
function paramNote(kind, p) {
  if (kind === 'q') return ` · quality ${Math.round(p * 100)}%`;
  if (kind === 'levels') return p >= 256 ? ' · full colour' : ` · ${p} levels per colour`;
  if (kind === 'palette') return ` · ${p} colours`;
  return '';
}
async function compressTo(src, type, targetBytes, keepDims) {
  const def = FORMATS[type];
  const list = CANDIDATES[def.kind][keepDims ? 'full' : 'balanced'];
  let cap;
  if (type === 'image/x-icon') cap = 256;
  else if (def.kind === 'q') cap = targetBytes <= 200 * 1024 ? 1600 : 4096;
  else cap = targetBytes <= 200 * 1024 ? 1024 : 2048;       // slower encoders: keep the search small
  const base = fitMax(src, cap);
  let cur = base;
  for (let tries = 0; tries < 25; tries++) {
    const cache = new Map();
    const enc = async i => {
      if (!cache.has(i)) cache.set(i, await encodeAs(type, cur, list[i]));
      return cache.get(i);
    };
    const worst = await enc(list.length - 1);
    if (!worst) return { error: 'encode' };
    if (def.native && worst.type !== type) return { error: 'unsupported' };
    if (worst.size <= targetBytes) {
      let lo = 0, hi = list.length - 1;
      const first = await enc(0);
      if (first && first.size <= targetBytes) hi = 0;
      else {
        while (lo < hi) {
          const mid = (lo + hi) >> 1, b = await enc(mid);
          if (b && b.size <= targetBytes) hi = mid; else lo = mid + 1;
        }
      }
      return { blob: cache.get(hi), w: cur.width, h: cur.height, param: list[hi], kind: def.kind };
    }
    if (type === 'image/x-icon' && Math.min(cur.width, cur.height) <= 16) return { error: 'toobig' };
    const f = clamp(Math.sqrt(targetBytes / worst.size) * 1.03, 0.5, 0.93);
    const nw = Math.round(cur.width * f), nh = Math.round(cur.height * f);
    if (Math.min(nw, nh) < 16) return { error: 'toobig' };
    cur = resizeTo(base, nw, nh);
  }
  return { error: 'toobig' };
}
// <<END ENCODERS>>

const setExportStatus = t => { $('exportStatus').textContent = t; };
const fmtSize = b => b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(1) + ' KB';
let busy = false;

async function doDownload() {
  if (!img || busy) return;
  busy = true;
  const btn = $('downloadBtn');
  btn.disabled = true;
  setExportStatus('Preparing…');
  try {
    await new Promise(r => setTimeout(r, 30));              // let the UI repaint first
    const type = fmt.value, def = FORMATS[type];
    let out = mk(1, 1);
    render(out, 0);
    const m = +$('maxSide').value;
    if (m) out = fitMax(out, m);
    if (type === 'image/x-icon') out = fitMax(out, 256);

    const unsupported = () => setExportStatus(`This browser cannot create ${def.label} files. Choose another format (JPEG, PNG and GIF work everywhere).`);
    let blob = null, note = '';
    if ($('compressOn').checked) {
      const kb = clamp(+$('targetKB').value || 20, 2, 5000);
      setExportStatus(`Compressing ${def.label} to under ${fmtSize(kb * 1024)}…`);
      const r = await compressTo(out, type, Math.floor(kb * 1024), $('compressPref').value === 'size');
      if (r.error === 'unsupported') { unsupported(); return; }
      if (r.error) { setExportStatus(`Could not get the image under ${fmtSize(kb * 1024)} as ${def.label}. Try a larger target or another format such as WebP.`); return; }
      blob = r.blob;
      note = `${fmtSize(blob.size)} · ${r.w} × ${r.h} px${paramNote(r.kind, r.param)}`;
    } else {
      const p = def.kind === 'q' ? q.value / 100 : def.kind === 'palette' ? +$('gifColors').value : 256;
      setExportStatus(`Creating ${def.label}…`);
      blob = await encodeAs(type, out, p);
      if (blob && def.native && blob.type !== type) { unsupported(); return; }
      if (blob) note = `${fmtSize(blob.size)} · ${out.width} × ${out.height} px`;
    }
    if (!blob) { setExportStatus('Export failed. Try a smaller image or a different format.'); return; }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName}-edited.${def.ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setExportStatus(`Saved ${fileName}-edited.${def.ext}: ${note}`);
  } catch (err) {
    console.error(err);
    setExportStatus('Export failed. Try a smaller image or a different format.');
  } finally {
    busy = false;
    btn.disabled = false;
  }
}
$('downloadBtn').onclick = doDownload;
})();
