import L from 'leaflet';

export const TAIPEI: L.LatLngTuple = [25.05, 121.55];

// OSM's own tiles: no key (CARTO's free basemaps now require one), fine for one
// user under OSM's tile policy. Darkened in style.css.
// ponytail: public OSM tiles; switch to a keyed provider if usage ever grows.
export const addTiles = (map: L.Map) =>
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

/** Place text comes from shares and, soon, extraction: never trust it as HTML. */
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const safeUrl = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);
export const safeImage = (p: string | null) => (p && /^images\/[\w.-]+$/.test(p) ? `/${p}` : null);
