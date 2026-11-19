// Sunset Cover — the cover renderer.
// Draws a GTA-style multi-panel poster onto a canvas: a hero panel, a row of two
// panels and a row of three (five panels on landscape), a Vice City neon-sunset
// grade over every photo, and a bold condensed title with a neon subtitle.
// Everything is drawn from photos already on the machine; no network is used.

export const SIZES = {
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  landscape: { label: 'Landscape 1920 x 1080', w: 1920, h: 1080 },
};

const GAP = 12;

/** Panel rectangles for a size, in cover pixels. Panel 0 is the hero. */
export function layoutFor(sizeKey) {
  if (sizeKey === 'landscape') {
    return [
      { x: 0, y: 0, w: 1150, h: 1080 },
      { x: 1162, y: 0, w: 373, h: 534 },
      { x: 1547, y: 0, w: 373, h: 534 },
      { x: 1162, y: 546, w: 373, h: 534 },
      { x: 1547, y: 546, w: 373, h: 534 },
    ];
  }
  if (sizeKey === 'square') {
    return [
      { x: 0, y: 0, w: 1080, h: 500 },
      { x: 0, y: 512, w: 534, h: 300 },
      { x: 546, y: 512, w: 534, h: 300 },
      { x: 0, y: 824, w: 352, h: 256 },
      { x: 364, y: 824, w: 352, h: 256 },
      { x: 728, y: 824, w: 352, h: 256 },
    ];
  }
  // portrait
  return [
    { x: 0, y: 0, w: 1080, h: 620 },
    { x: 0, y: 632, w: 534, h: 330 },
    { x: 546, y: 632, w: 534, h: 330 },
    { x: 0, y: 974, w: 352, h: 376 },
    { x: 364, y: 974, w: 352, h: 376 },
    { x: 728, y: 974, w: 352, h: 376 },
  ];
}

/** Where the title block sits for a size: rect of the hero, alignment, sizes. */
function titleZone(sizeKey) {
  if (sizeKey === 'landscape') {
    return { align: 'left', x: 48, titleSize: 132, subSize: 44, baseY: 962, subGap: 58 };
  }
  if (sizeKey === 'square') {
    return { align: 'center', x: 540, titleSize: 108, subSize: 38, baseY: 428, subGap: 50 };
  }
  return { align: 'center', x: 540, titleSize: 118, subSize: 40, baseY: 540, subGap: 54 };
}

/** Draws one photo into a panel rect with cover fit, zoom and pan. Returns the clamped pan. */
function drawPhoto(ctx, img, rect, zoom, ox, oy, grade) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const s = base * zoom;
  const dw = iw * s;
  const dh = ih * s;
  const maxOx = Math.max(0, (dw - rect.w) / 2 / rect.w);
  const maxOy = Math.max(0, (dh - rect.h) / 2 / rect.h);
  const cx = Math.max(-maxOx, Math.min(maxOx, ox));
  const cy = Math.max(-maxOy, Math.min(maxOy, oy));
  const dx = rect.x + (rect.w - dw) / 2 + cx * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + cy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = `saturate(${(1 + 0.35 * grade).toFixed(3)}) contrast(${(1 + 0.08 * grade).toFixed(3)}) brightness(${(1 + 0.03 * grade).toFixed(3)})`;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  // Neon-sunset wash: pink at the top, warm orange in the middle, violet at the foot.
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, `rgba(255, 80, 140, ${(0.14 * grade).toFixed(3)})`);
  wash.addColorStop(0.45, `rgba(255, 140, 70, ${(0.1 * grade).toFixed(3)})`);
  wash.addColorStop(1, `rgba(90, 30, 160, ${(0.16 * grade).toFixed(3)})`);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  return { ox: cx, oy: cy };
}

/** A soft warm glow low in the hero, like a sun sitting on the horizon. */
function drawSunGlow(ctx, hero, grade) {
  if (grade <= 0) return;
  const cx = hero.x + hero.w / 2;
  const cy = hero.y + hero.h * 0.3;
  const r = hero.w * 0.42;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  glow.addColorStop(0, `rgba(255, 170, 90, ${(0.22 * grade).toFixed(3)})`);
  glow.addColorStop(0.6, `rgba(255, 110, 120, ${(0.1 * grade).toFixed(3)})`);
  glow.addColorStop(1, 'rgba(255, 110, 120, 0)');
  ctx.save();
  ctx.beginPath();
  ctx.rect(hero.x, hero.y, hero.w, hero.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = glow;
  ctx.fillRect(hero.x, hero.y, hero.w, hero.h);
  ctx.restore();
}

/** The title and subtitle, drawn over a dark scrim at the foot of the hero panel. */
function drawTitle(ctx, hero, zone, caption, subtitle, titleScale) {
  const text = (caption || '').trim().toUpperCase();
  const sub = (subtitle || '').trim().toUpperCase();
  // Scrim so the lettering reads over any photo.
  const scrimTop = zone.baseY - zone.titleSize * 1.5;
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, hero.y + hero.h);
  scrim.addColorStop(0, 'rgba(12, 4, 20, 0)');
  scrim.addColorStop(1, 'rgba(12, 4, 20, 0.8)');
  ctx.save();
  ctx.beginPath();
  ctx.rect(hero.x, hero.y, hero.w, hero.h);
  ctx.clip();
  ctx.fillStyle = scrim;
  ctx.fillRect(hero.x, scrimTop, hero.w, hero.y + hero.h - scrimTop);
  ctx.restore();

  if (!text) return;
  // Fit the title to the hero width, then draw it with a dark outline and a warm fill.
  const maxW = zone.align === 'left' ? hero.w - zone.x - 48 : hero.w - 96;
  let size = zone.titleSize * titleScale;
  ctx.textAlign = zone.align;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  while (ctx.measureText(text).width > maxW && size > 28) {
    size -= 2;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  const fill = ctx.createLinearGradient(0, zone.baseY - size, 0, zone.baseY);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(1, '#ffd9a3');
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1c0a24';
  ctx.lineWidth = Math.max(4, size * 0.09);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.04;
  ctx.strokeText(text, zone.x, zone.baseY);
  ctx.fillStyle = fill;
  ctx.fillText(text, zone.x, zone.baseY);
  ctx.shadowColor = 'rgba(0, 0, 0, 0)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (!sub) return;
  // Neon subtitle, letterspaced, with a thin rule on each side.
  const subY = zone.baseY + zone.subGap;
  let subSize = zone.subSize;
  ctx.font = `${subSize}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
  try { ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`; } catch { /* older canvas: no letter spacing */ }
  while (ctx.measureText(sub).width > maxW && subSize > 16) {
    subSize -= 1;
    ctx.font = `${subSize}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
  }
  const subW = ctx.measureText(sub).width;
  const cy = subY - subSize * 0.35;
  const ruleLen = Math.min(90, (maxW - subW) / 2 - 24);
  if (ruleLen > 12) {
    const rule = ctx.createLinearGradient(0, 0, 1, 0);
    const gx0 = zone.align === 'left' ? zone.x : zone.x - subW / 2 - ruleLen - 16;
    const gx1 = zone.align === 'left' ? zone.x + subW + 16 + ruleLen : zone.x + subW / 2 + ruleLen + 16;
    ctx.strokeStyle = '#ff5ea8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (zone.align === 'left') {
      ctx.moveTo(zone.x + subW + 18, cy);
      ctx.lineTo(zone.x + subW + 18 + ruleLen, cy);
    } else {
      ctx.moveTo(zone.x - subW / 2 - 18, cy);
      ctx.lineTo(zone.x - subW / 2 - 18 - ruleLen, cy);
      ctx.moveTo(zone.x + subW / 2 + 18, cy);
      ctx.lineTo(zone.x + subW / 2 + 18 + ruleLen, cy);
    }
    ctx.stroke();
    void rule; void gx0; void gx1;
  }
  ctx.fillStyle = '#ff5ea8';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = 16;
  ctx.fillText(sub, zone.x, subY);
  ctx.shadowBlur = 0;
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
}

/**
 * Draws the whole cover.
 * state: { sizeKey, caption, subtitle, grade (0..1), titleScale,
 *          photos: Map id -> HTMLImageElement, panels: [{ photoId, zoom, ox, oy }] }
 * opts: { highlight: selected panel index or null } — editor-only chrome (selection
 *   outline and panel numbers); pass null for a clean export.
 */
export function drawCover(canvas, state, opts = {}) {
  const size = SIZES[state.sizeKey];
  const ctx = canvas.getContext('2d');
  const panels = layoutFor(state.sizeKey);
  const grade = state.grade;
  ctx.clearRect(0, 0, size.w, size.h);
  ctx.fillStyle = '#14081f';
  ctx.fillRect(0, 0, size.w, size.h);

  for (let i = 0; i < panels.length; i++) {
    const rect = panels[i];
    const panel = state.panels[i];
    const img = panel ? state.photos.get(panel.photoId) : null;
    if (img) {
      const clamped = drawPhoto(ctx, img, rect, panel.zoom, panel.ox, panel.oy, grade);
      panel.ox = clamped.ox;
      panel.oy = clamped.oy;
    } else {
      ctx.fillStyle = '#241335';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  }

  drawSunGlow(ctx, panels[0], grade);
  drawTitle(ctx, panels[0], titleZone(state.sizeKey), state.caption, state.subtitle, state.titleScale);

  // Gentle vignette so the edges sit down like a printed poster.
  const vg = ctx.createRadialGradient(
    size.w / 2, size.h / 2, Math.min(size.w, size.h) * 0.45,
    size.w / 2, size.h / 2, Math.max(size.w, size.h) * 0.75,
  );
  vg.addColorStop(0, 'rgba(10, 4, 16, 0)');
  vg.addColorStop(1, 'rgba(10, 4, 16, 0.26)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, size.w, size.h);

  if (opts.highlight !== null && opts.highlight !== undefined) {
    for (let i = 0; i < panels.length; i++) {
      const rect = panels[i];
      const selected = i === opts.highlight;
      ctx.strokeStyle = selected ? '#ff2e88' : 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = selected ? 6 : 2;
      ctx.strokeRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6);
      const bx = rect.x + 18;
      const by = rect.y + 18;
      ctx.beginPath();
      ctx.arc(bx + 13, by + 13, 13, 0, Math.PI * 2);
      ctx.fillStyle = selected ? '#ff2e88' : 'rgba(12, 4, 20, 0.75)';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), bx + 13, by + 14);
    }
  }
}
