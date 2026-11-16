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

// ---------- Slider definitions ----------
// [key, label, min, max, panel, default]
const sliders = [
  ['exposure',   'Exposure',      -100, 100, 'adjust', 0],
  ['brightness', 'Brightness',    -100, 100, 'adjust', 0],
  ['contrast',   'Contrast',      -100, 100, 'adjust', 0],
  ['saturation', 'Saturation',    -100, 100, 'adjust', 0],
  ['hue',        'Hue',           -180, 180, 'adjust', 0],
  ['warmth',     'Warmth',        -100, 100, 'adjust', 0],
  ['tint',       'Tint',          -100, 100, 'adjust', 0],
  ['sharpen',    'Sharpen',          0, 100, 'adjust', 0],
  ['blur',       'Blur',             0,  20, 'adjust', 0],
  ['vignette',   'Vignette',         0, 100, 'adjust', 0],
  ['bgBlur',     'Background blur',  0, 100, 'bg',     0],
  ['edge',       'Edge softness',    0,  30, 'bg',     8],
  ['focusSize',  'Focus size (circle / band)', 10, 100, 'bg', 50],
];
const sliderHost = { adjust: 'tab-adjust', bg: 'bgSliders' };

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
sliders.forEach(([key, label, min, max, panel, def]) => {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<label for="s-${key}">${label} <output id="o-${key}">${def}</output></label>
    <input type="range" id="s-${key}" min="${min}" max="${max}" step="1" value="${def}" title="Double-click to reset">`;
  $(sliderHost[panel]).appendChild(row);
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
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
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
    $('compare').style.display = 'block';
    $('info').style.display = 'block';
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
  e.target.dispatchEvent(new Event('input'));
  e.target.dispatchEvent(new Event('change'));
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
