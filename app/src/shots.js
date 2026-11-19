// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo
// loaded; ?shot=cover shows the cover alone, full frame. `photo` picks the sample
// (samples/<photo>.jpg), `caption` and `subtitle` the words, `size` the export size.
// window.__shotReady is set once the cover is painted.

export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await load(
    `samples/${query.get('photo') ?? 'sample-1'}.jpg`,
    query.get('caption') ?? 'Sunset Heist',
    query.get('subtitle') ?? 'Ocean Drive',
    query.get('size') ?? 'portrait',
  );
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
