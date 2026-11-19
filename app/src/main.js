// Sunset Cover — the editor.
// Wires the page: load photos (samples are bundled, uploads stay on the machine),
// pick a panel, crop and position each photo, write the caption, export the PNG.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { SIZES, layoutFor, drawCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const gradeInput = document.getElementById('grade');
const gradeVal = document.getElementById('gradeVal');
const scaleInput = document.getElementById('titleScale');
const scaleVal = document.getElementById('titleScaleVal');
const panelLabel = document.getElementById('panelLabel');
const panelPhoto = document.getElementById('panelPhoto');
const zoomInput = document.getElementById('zoom');
const zoomVal = document.getElementById('zoomVal');
const panXInput = document.getElementById('panX');
const panYInput = document.getElementById('panY');
const thumbsEl = document.getElementById('thumbs');

const state = {
  sizeKey: 'portrait',
  caption: 'Sunset Heist',
  subtitle: 'Ocean Drive',
  grade: 0.7,
  titleScale: 1,
  photos: new Map(), // id -> HTMLImageElement (what the renderer reads)
  panels: [], // { photoId, zoom, ox, oy } — one per layout panel
  selected: 0,
};
const photoMeta = new Map(); // id -> display name
let photoSeq = 0;
let canvasSizeKey = '';

const DEFAULTS = {
  portrait: [
    { photo: 'sample-1', zoom: 1.12, ox: 0, oy: -0.04 },
    { photo: 'sample-2', zoom: 1.25, ox: 0.04, oy: 0 },
    { photo: 'sample-1', zoom: 1.6, ox: -0.06, oy: 0.04 },
    { photo: 'sample-2', zoom: 1.5, ox: 0, oy: -0.06 },
    { photo: 'sample-1', zoom: 1.35, ox: 0.08, oy: 0 },
    { photo: 'sample-2', zoom: 1.2, ox: -0.04, oy: 0.04 },
  ],
  square: [
    { photo: 'sample-1', zoom: 1.12, ox: 0, oy: -0.04 },
    { photo: 'sample-2', zoom: 1.25, ox: 0.04, oy: 0 },
    { photo: 'sample-1', zoom: 1.6, ox: -0.06, oy: 0.04 },
    { photo: 'sample-2', zoom: 1.5, ox: 0, oy: -0.06 },
    { photo: 'sample-1', zoom: 1.35, ox: 0.08, oy: 0 },
    { photo: 'sample-2', zoom: 1.2, ox: -0.04, oy: 0.04 },
  ],
  landscape: [
    { photo: 'sample-1', zoom: 1.15, ox: 0, oy: -0.03 },
    { photo: 'sample-2', zoom: 1.3, ox: 0.05, oy: 0 },
    { photo: 'sample-1', zoom: 1.55, ox: -0.05, oy: 0.03 },
    { photo: 'sample-2', zoom: 1.45, ox: 0, oy: -0.05 },
    { photo: 'sample-1', zoom: 1.25, ox: 0.06, oy: 0.02 },
  ],
};

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function render(highlight = state.selected) {
  const size = SIZES[state.sizeKey];
  if (canvasSizeKey !== state.sizeKey) {
    canvas.width = size.w;
    canvas.height = size.h;
    canvasSizeKey = state.sizeKey;
  }
  drawCover(canvas, state, { highlight });
  syncPanelControls();
}

function syncPanels() {
  const layout = layoutFor(state.sizeKey);
  const defaults = DEFAULTS[state.sizeKey];
  const next = [];
  for (let i = 0; i < layout.length; i++) {
    if (state.panels[i]) {
      next.push(state.panels[i]);
    } else {
      const d = defaults[i];
      next.push({ photoId: d.photo, zoom: d.zoom, ox: d.ox, oy: d.oy });
    }
  }
  state.panels = next;
  if (state.selected >= next.length) state.selected = 0;
}

function syncPanelControls() {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panelLabel.textContent = `Panel ${state.selected + 1}${state.selected === 0 ? ' — Hero' : ''}`;
  panelPhoto.value = panel.photoId;
  zoomInput.value = Math.round(panel.zoom * 100);
  zoomVal.textContent = `${Math.round(panel.zoom * 100)}%`;
  panXInput.value = Math.round(panel.ox * 100);
  panYInput.value = Math.round(panel.oy * 100);
}

function refreshPhotoUI() {
  // Thumbnails: click one to put that photo in the selected panel.
  thumbsEl.innerHTML = '';
  for (const [id, img] of state.photos) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = photoMeta.get(id) || id;
    const t = document.createElement('img');
    t.src = img.src;
    t.alt = photoMeta.get(id) || id;
    b.appendChild(t);
    b.addEventListener('click', () => {
      state.panels[state.selected].photoId = id;
      render();
    });
    thumbsEl.appendChild(b);
  }
  // Panel photo dropdown.
  const current = state.panels[state.selected] ? state.panels[state.selected].photoId : '';
  panelPhoto.innerHTML = '';
  for (const [id] of state.photos) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = photoMeta.get(id) || id;
    panelPhoto.appendChild(o);
  }
  panelPhoto.value = current;
}

async function addPhoto(url, name) {
  const id = `photo-${++photoSeq}`;
  const img = await loadImage(url);
  state.photos.set(id, img);
  photoMeta.set(id, name);
  return id;
}

function setStatus(text) {
  statusEl.textContent = text;
}

// --- events ---------------------------------------------------------------

document.getElementById('photo').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  for (const file of files) {
    const url = URL.createObjectURL(file);
    try {
      const id = await addPhoto(url, file.name);
      // If every panel is empty, fill them with the first photo added.
      if (state.panels.every((p) => !state.photos.get(p.photoId))) {
        for (const p of state.panels) p.photoId = id;
      }
    } catch {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  refreshPhotoUI();
  render();
  setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} added — click a panel, then a photo to place it.`);
  e.target.value = '';
});

captionInput.addEventListener('input', () => { state.caption = captionInput.value; render(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; render(); });
gradeInput.addEventListener('input', () => {
  state.grade = gradeInput.value / 100;
  gradeVal.textContent = `${gradeInput.value}%`;
  render();
});
scaleInput.addEventListener('input', () => {
  state.titleScale = scaleInput.value / 100;
  scaleVal.textContent = `${scaleInput.value}%`;
  render();
});
panelPhoto.addEventListener('change', () => {
  state.panels[state.selected].photoId = panelPhoto.value;
  render();
});
zoomInput.addEventListener('input', () => {
  state.panels[state.selected].zoom = zoomInput.value / 100;
  render();
});
panXInput.addEventListener('input', () => {
  state.panels[state.selected].ox = panXInput.value / 100;
  render();
});
panYInput.addEventListener('input', () => {
  state.panels[state.selected].oy = panYInput.value / 100;
  render();
});
document.getElementById('centerBtn').addEventListener('click', () => {
  const p = state.panels[state.selected];
  p.ox = 0; p.oy = 0; p.zoom = 1;
  render();
});
document.getElementById('fillAllBtn').addEventListener('click', () => {
  const id = state.panels[state.selected].photoId;
  for (const p of state.panels) p.photoId = id;
  render();
  setStatus('Every panel now uses the selected panel’s photo.');
});
document.getElementById('shuffleBtn').addEventListener('click', () => {
  for (const p of state.panels) {
    p.zoom = 1.15 + Math.random() * 0.55;
    p.ox = (Math.random() - 0.5) * 0.24;
    p.oy = (Math.random() - 0.5) * 0.24;
  }
  render();
  setStatus('Crops shuffled — each panel shows a different crop.');
});
document.querySelectorAll('input[name="size"]').forEach((r) => {
  r.addEventListener('change', () => {
    if (!r.checked) return;
    state.sizeKey = r.value;
    syncPanels();
    render();
  });
});

// Canvas: click a panel to select it, drag to move its photo.
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}
function panelAt(x, y) {
  const panels = layoutFor(state.sizeKey);
  for (let i = 0; i < panels.length; i++) {
    const r = panels[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return -1;
}
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  state.selected = i;
  const rect = layoutFor(state.sizeKey)[i];
  drag = { x: p.x, y: p.y, rect };
  canvas.setPointerCapture(e.pointerId);
  render();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[state.selected];
  panel.ox += (p.x - drag.x) / drag.rect.w;
  panel.oy += (p.y - drag.y) / drag.rect.h;
  drag = { x: p.x, y: p.y, rect: drag.rect };
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

// Export: render clean (no editor chrome), save the PNG, restore the editor view.
function exportBlob() {
  return new Promise((resolve) => {
    render(null);
    canvas.toBlob((blob) => {
      render();
      resolve(blob);
    }, 'image/png');
  });
}
document.getElementById('export').addEventListener('click', async () => {
  const size = SIZES[state.sizeKey];
  const blob = await exportBlob();
  if (!blob) { setStatus('Export failed — try again.'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sunset-cover-${size.w}x${size.h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  setStatus(`Saved sunset-cover-${size.w}x${size.h}.png`);
});

// Headless testing hook: resolves to a data URL of the clean exported PNG.
window.__getCoverDataURL = () => new Promise((resolve) => {
  render(null);
  canvas.toBlob((blob) => {
    render();
    if (!blob) { resolve(null); return; }
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  }, 'image/png');
});
window.__getState = () => ({
  sizeKey: state.sizeKey,
  caption: state.caption,
  photos: [...state.photos.keys()],
  panels: state.panels.map((p) => ({ ...p })),
  selected: state.selected,
});

// --- startup --------------------------------------------------------------
async function startup() {
  syncPanels();
  // Bundled samples, so the app makes a cover before any upload.
  try { await addPhoto('samples/sample-1.jpg', 'Sample — Sunset Girl'); } catch { /* samples are optional */ }
  try { await addPhoto('samples/sample-2.jpg', 'Sample — Ocean Drive'); } catch { /* samples are optional */ }
  // The default panels name the samples by their ids: remap if they loaded.
  const ids = [...state.photos.keys()];
  const byName = new Map([...photoMeta].map(([id, name]) => [name, id]));
  const s1 = byName.get('Sample — Sunset Girl');
  const s2 = byName.get('Sample — Ocean Drive');
  if (s1 || s2) {
    for (let i = 0; i < state.panels.length; i++) {
      const d = DEFAULTS[state.sizeKey][i];
      state.panels[i].photoId = d.photo === 'sample-1' ? (s1 ?? state.panels[i].photoId) : (s2 ?? state.panels[i].photoId);
    }
  }
  refreshPhotoUI();
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px "Bebas Neue"'),
    ]);
  } catch { /* fall back to system fonts */ }
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), async (sample, text, sub, sizeKey) => {
      if (sizeKey && SIZES[sizeKey] && sizeKey !== state.sizeKey) {
        state.sizeKey = sizeKey;
        document.querySelector(`input[name="size"][value="${sizeKey}"]`).checked = true;
        syncPanels();
      }
      state.caption = text;
      state.subtitle = sub;
      captionInput.value = text;
      subtitleInput.value = sub;
      // By default the shot keeps the app's own panel assignment (both samples,
      // each panel its own crop). ?fill=all puts one photo in every panel.
      if (new URLSearchParams(location.search).get('fill') === 'all') {
        const wanted = sample.replace('samples/', '').replace('.jpg', '');
        const found = [...photoMeta].find(([, name]) => name.toLowerCase().includes(wanted.includes('sample-1') ? 'sunset girl' : 'ocean drive'));
        if (found) {
          for (const p of state.panels) p.photoId = found[0];
        }
      }
      render(shot === 'cover' ? null : state.selected);
    });
  } else {
    render();
  }
  void ids;
}

startup();
