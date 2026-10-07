import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// After Leaflet's CSS, so our popup and tile styles win.
import './style.css';
import type { Place, Source } from '../place.ts';
import { TAIPEI, addTiles, esc, safeImage, safeUrl } from './shared.ts';

const SOURCE_LABELS: Record<Source['type'], string> = {
  ig: '📸 Instagram', youtube: '▶️ YouTube', friend: '🧑 Friend', maps: '🗺️ Google Maps', web: '🔗 Web',
};

const map = L.map('map', { zoomControl: false }).setView(TAIPEI, 13);
L.control.zoom({ position: 'bottomright' }).addTo(map);
addTiles(map);

function sourceHtml(s: Source) {
  const url = safeUrl(s.url) && esc(s.url!);
  const img = safeImage(s.image);
  return `<li>${SOURCE_LABELS[s.type] ?? esc(s.type)}${s.detail ? ` · ${esc(s.detail)}` : ''}
    ${url ? ` · <a href="${url}" target="_blank" rel="noopener noreferrer">open</a>` : ''}
    ${img ? `<img src="${img}" alt="Screenshot from this source" loading="lazy">` : ''}</li>`;
}

function popupHtml(p: Place) {
  const meta = [p.category, p.cuisine, p.price, p.area].filter(Boolean).map((s) => esc(s!)).join(' · ');
  const status = p.status === 'visited' ? `<span class="badge visited">Visited${p.rank ? ` · ${p.rank}` : ''}</span>` : '<span class="badge want">Want to go</span>';
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address ?? ''}`.trim())}`;
  return `<article class="place">
    <h2>${esc(p.name)}</h2>
    <div class="meta">${status} ${meta}</div>
    <p class="why">${esc(p.why)}</p>
    ${p.dishes.length ? `<h3>Order</h3><ul>${p.dishes.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
    ${p.sources.length ? `<h3>Saved because of</h3><ul>${p.sources.map(sourceHtml).join('')}</ul>` : ''}
    ${p.notes ? `<h3>Notes</h3><div class="notes">${esc(p.notes)}</div>` : ''}
    <a class="maps" href="${esc(maps)}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
  </article>`;
}

function showStatus(text: string) {
  const el = document.getElementById('status')!;
  el.textContent = text;
  el.hidden = false;
}

try {
  const res = await fetch('/api/places');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const places: Place[] = await res.json();
  if (!places.length) showStatus('No places yet.');
  const css = getComputedStyle(document.documentElement);
  for (const p of places) {
    L.circleMarker([p.lat, p.lng], {
      radius: 9,
      weight: 2,
      color: '#fff',
      fillColor: css.getPropertyValue(p.status === 'visited' ? '--visited' : '--want').trim(),
      fillOpacity: 0.9,
    })
      .bindPopup(popupHtml(p), {
        maxWidth: Math.min(320, window.innerWidth - 48),
        // Long popups scroll inside instead of running off the top of a phone screen.
        maxHeight: Math.min(480, window.innerHeight * 0.6),
        autoPanPadding: [16, 16],
      })
      .addTo(map);
  }
  if (places.length) map.fitBounds(places.map((p) => [p.lat, p.lng] as L.LatLngTuple), { padding: [40, 40], maxZoom: 15 });
  void showInboxCount();
} catch (e) {
  console.error(e);
  showStatus('Could not load places. Try reloading.');
}

/** The inbox link shows how many shares are waiting. */
async function showInboxCount() {
  const res = await fetch('/api/drafts');
  if (!res.ok) return;
  const n = ((await res.json()) as unknown[]).length;
  if (n) document.getElementById('inbox-count')!.textContent = String(n);
}
