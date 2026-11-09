(() => {
// ---------- State ----------
const defaults = () => ({
  exposure: 0, brightness: 0, contrast: 0, saturation: 0,
  warmth: 0, blur: 0, vignette: 0,
  quarter: 0, straighten: 0, flipH: false, flipV: false,
  aspect: 0, look: 'none'
});
let s = defaults();
let img = null, fileName = 'photo';

// ---------- Elements ----------
const $ = id => document.getElementById(id);
const view = $('view'), vctx = view.getContext('2d');
const stage = $('stage');

// ---------- Slider definitions ----------
const sliders = [
  ['exposure',   'Exposure',   -100, 100],
  ['brightness', 'Brightness', -100, 100],
  ['contrast',   'Contrast',   -100, 100],
  ['saturation', 'Saturation', -100, 100],
  ['warmth',     'Warmth',     -100, 100],
  ['blur',       'Blur',          0,  20],
  ['vignette',   'Vignette',      0, 100],
];
const adjustPanel = $('tab-adjust');
sliders.forEach(([key, label, min, max]) => {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<label for="s-${key}">${label} <output id="o-${key}">0</output></label>
    <input type="range" id="s-${key}" min="${min}" max="${max}" step="1" value="0" title="Double-click to reset">`;
  adjustPanel.appendChild(row);
  const input = row.querySelector('input');
  input.addEventListener('input', () => { s[key] = +input.value; $('o-' + key).textContent = input.value; schedule(); });
  input.addEventListener('dblclick', () => { input.value = 0; input.dispatchEvent(new Event('input')); });
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
    looksBox.querySelectorAll('.look').forEach(x => x.classList.toggle('active', x === b));
    schedule();
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

// ---------- Rendering ----------
function filterString(scale) {
  const exp = Math.pow(2, s.exposure / 100);
  const br = (1 + s.brightness / 100) * exp;
  const parts = [
    `brightness(${Math.max(0, br)})`,
    `contrast(${1 + s.contrast / 100})`,
    `saturate(${1 + s.saturation / 100})`,
  ];
  if (s.blur) parts.push(`blur(${s.blur * scale}px)`);
  const look = looks[s.look][1];
  if (look) parts.push(look);
  return parts.join(' ');
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

  ctx.save();
  ctx.filter = filterString(scale);
  ctx.translate(cw / 2, ch / 2);
  ctx.scale(zoom, zoom);
  ctx.rotate(a);
  ctx.rotate(s.quarter * Math.PI / 2);
  ctx.scale(s.flipH ? -1 : 1, s.flipV ? -1 : 1);
  ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();

  if (s.warmth) {
    const d = ctx.getImageData(0, 0, cw, ch), p = d.data, k = s.warmth * 0.5;
    for (let i = 0; i < p.length; i += 4) {
      p[i]     = Math.min(255, Math.max(0, p[i] + k));
      p[i + 2] = Math.min(255, Math.max(0, p[i + 2] - k));
    }
    ctx.putImageData(d, 0, 0);
  }
  if (s.vignette) {
    const r = Math.hypot(cw, ch) / 2;
    const g = ctx.createRadialGradient(cw / 2, ch / 2, r * 0.35, cw / 2, ch / 2, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${s.vignette / 100 * 0.85})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
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

function updateInfo() {
  // Show the export dimensions
  const w = img.naturalWidth, h = img.naturalHeight, odd = s.quarter % 2 !== 0;
  let ow = odd ? h : w, oh = odd ? w : h;
  if (s.aspect) { if (ow / oh > s.aspect) ow = oh * s.aspect; else oh = ow / s.aspect; }
  const txt = `${Math.round(ow)} × ${Math.round(oh)} px`;
  $('info').textContent = txt;
  $('sizeHint').textContent = `Exports at the original resolution (${txt}).`;
}

// ---------- Loading ----------
function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  fileName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  const url = URL.createObjectURL(file);
  const im = new Image();
  im.onload = () => {
    img = im;
    resetAll();
    $('drop').style.display = 'none';
    view.style.display = 'block';
    $('compare').style.display = 'block';
    $('info').style.display = 'block';
    $('resetBtn').disabled = false;
    $('downloadBtn').disabled = false;
    drawLookThumbs();
    schedule();
  };
  im.onerror = () => alert('That file could not be read as an image. Try a JPEG, PNG or WebP file.');
  im.src = url;
}

function resetAll() {
  s = defaults();
  sliders.forEach(([k]) => { $('s-' + k).value = 0; $('o-' + k).textContent = '0'; });
  $('straighten').value = 0; $('straightenOut').textContent = '0°';
  document.querySelectorAll('#aspects button').forEach((b, i) => b.classList.toggle('active', i === 0));
  $('flipH').classList.remove('active'); $('flipV').classList.remove('active');
  looksBox.querySelectorAll('.look').forEach(x => x.classList.toggle('active', x.dataset.look === 'none'));
  schedule();
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
$('rotL').onclick = () => { s.quarter = (s.quarter + 3) % 4; schedule(); };
$('rotR').onclick = () => { s.quarter = (s.quarter + 1) % 4; schedule(); };
$('flipH').onclick = e => { s.flipH = !s.flipH; e.currentTarget.classList.toggle('active', s.flipH); schedule(); };
$('flipV').onclick = e => { s.flipV = !s.flipV; e.currentTarget.classList.toggle('active', s.flipV); schedule(); };
$('straighten').oninput = e => {
  s.straighten = +e.target.value; $('straightenOut').textContent = s.straighten.toFixed(1) + '°'; schedule();
};
$('straighten').ondblclick = e => { e.target.value = 0; e.target.dispatchEvent(new Event('input')); };
document.querySelectorAll('#aspects button').forEach(b => b.addEventListener('click', () => {
  s.aspect = +b.dataset.aspect;
  document.querySelectorAll('#aspects button').forEach(x => x.classList.toggle('active', x === b));
  schedule();
}));

// Compare (hold to show original)
const cmp = $('compare');
const showOriginal = on => {
  if (!img) return;
  if (on) {
    const keep = s; s = defaults(); s.quarter = keep.quarter; s.flipH = keep.flipH; s.flipV = keep.flipV;
    s.straighten = keep.straighten; s.aspect = keep.aspect;
    render(view, 1600); s = keep;
  } else schedule();
};
cmp.addEventListener('pointerdown', () => showOriginal(true));
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => cmp.addEventListener(ev, () => showOriginal(false)));

// Export
const fmt = $('format'), q = $('quality');
const syncQuality = () => {
  $('qualityOut').textContent = q.value;
  $('qualityRow').style.display = fmt.value === 'image/png' ? 'none' : '';
};
fmt.onchange = q.oninput = syncQuality;
syncQuality();

$('downloadBtn').onclick = () => {
  if (!img) return;
  const out = document.createElement('canvas');
  render(out, 0);
  const type = fmt.value;
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type];
  if (type === 'image/jpeg') {            // JPEG has no transparency: fill white behind it
    const flat = document.createElement('canvas');
    flat.width = out.width; flat.height = out.height;
    const c = flat.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, flat.width, flat.height);
    c.drawImage(out, 0, 0);
    flat.toBlob(save, type, q.value / 100);
  } else {
    out.toBlob(save, type, q.value / 100);
  }
  function save(blob) {
    if (!blob) { alert('Export failed. Try a smaller image or a different format.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName}-edited.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
};
})();
