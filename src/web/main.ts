import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// After Leaflet's CSS, so our popup and tile styles win.
import './style.css';
import { RANKS, RANK_LABELS, type Place, type Source } from '../place.ts';
import { TAIPEI, addTiles, esc, safeImage, safeUrl } from './shared.ts';

const SOURCE_LABELS: Record<Source['type'], string> = {
  ig: '📸 Instagram', youtube: '▶️ YouTube', friend: '🧑 Friend', maps: '🗺️ Google Maps', web: '🔗 Web',
};
/** Pin colours: orange is "want to go"; visited pins say how it went. Mirrored in the legend. */
const WANT_COLOR = '#f4a261';
const RANK_COLORS: Record<NonNullable<Place['rank']>, string> = {
  T1: '#e63946', T2: '#8d99ae', T3: '#a8dadc', T4: '#43aa8b', T5: '#c77dff',
};

type Filters = { status: 'all' | 'want' | 'visited'; area: string | null; category: string | null };
const FILTERS_KEY = 'food-map:filters';

const map = L.map('map', { zoomControl: false }).setView(TAIPEI, 13);
L.control.zoom({ position: 'bottomright' }).addTo(map);
addTiles(map);
const pins = L.layerGroup().addTo(map);

let places: Place[] = [];
let filters: Filters = loadFilters();
let me: L.CircleMarker | null = null;

// ---------- Popups ----------

function sourceHtml(s: Source) {
  const url = safeUrl(s.url) && esc(s.url!);
  const img = safeImage(s.image);
  return `<li>${SOURCE_LABELS[s.type] ?? esc(s.type)}${s.detail ? ` · ${esc(s.detail)}` : ''}
    ${url ? ` · <a href="${url}" target="_blank" rel="noopener noreferrer">open</a>` : ''}
    ${img ? `<img src="${img}" alt="Screenshot from this source" loading="lazy">` : ''}</li>`;
}

function popupHtml(p: Place) {
  const meta = [p.category, p.cuisine, p.price, p.area].filter(Boolean).map((s) => esc(s!)).join(' · ');
  const status = p.status === 'visited'
    ? `<span class="badge visited" style="background:${RANK_COLORS[p.rank ?? 'T3']}">Visited${p.rank ? ` · ${p.rank} ${RANK_LABELS[p.rank]}` : ''}</span>`
    : '<span class="badge want">Want to go</span>';
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address ?? ''}`.trim())}`;
  const options = RANKS.map((r) => `<option value="${r}"${r === (p.rank ?? 'T4') ? ' selected' : ''}>${r} · ${RANK_LABELS[r]}</option>`).join('');
  return `<article class="place">
    <h2>${esc(p.name)}</h2>
    <div class="meta">${status} ${meta}</div>
    <p class="why">${esc(p.why)}</p>
    ${p.dishes.length ? `<h3>Order</h3><ul>${p.dishes.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
    ${p.sources.length ? `<h3>Saved because of</h3><ul>${p.sources.map(sourceHtml).join('')}</ul>` : ''}
    ${p.notes ? `<h3>Notes</h3><div class="notes">${esc(p.notes)}</div>` : ''}
    <a class="maps" href="${esc(maps)}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
    <details class="visit">
      <summary>${p.status === 'visited' ? 'Update my visit' : 'I went here'}</summary>
      <form class="visit-form" data-id="${esc(p.id)}">
        <label>How was it? <select name="rank">${options}</select></label>
        <label>Note <textarea name="note" rows="2" placeholder="What you had, what to order next time"></textarea></label>
        <button type="submit" class="primary">Save visit</button>
        <p class="error" role="alert" hidden></p>
      </form>
    </details>
  </article>`;
}

// Popup HTML is rebuilt on every open, so its form is wired up here rather than once.
map.on('popupopen', (e) => {
  const form = e.popup.getElement()?.querySelector<HTMLFormElement>('.visit-form');
  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const data = new FormData(form);
    const button = form.querySelector('button')!;
    const error = form.querySelector<HTMLElement>('.error')!;
    button.disabled = true;
    const res = await fetch(`/api/places/${form.dataset.id}/visit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rank: data.get('rank'), note: data.get('note') }),
    }).catch(() => null);
    if (!res?.ok) {
      button.disabled = false;
      error.textContent = 'Could not save the visit. Try again.';
      error.hidden = false;
      return;
    }
    const updated = (await res.json()) as Place;
    places = places.map((p) => (p.id === updated.id ? updated : p));
    map.closePopup();
    render();
  });
});

// ---------- Filters ----------

function loadFilters(): Filters {
  const fallback: Filters = { status: 'all', area: null, category: null };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(FILTERS_KEY) ?? '{}') };
  } catch {
    return fallback;
  }
}

function setFilters(next: Partial<Filters>) {
  filters = { ...filters, ...next };
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // Private mode or blocked storage: filters just won't be remembered.
  }
  render();
}

const matches = (p: Place) =>
  (filters.status === 'all' || p.status === filters.status) &&
  (!filters.area || p.area === filters.area) &&
  (!filters.category || p.category === filters.category);

/** One row of choice chips. Labels come from my own data, so they're set as text. */
function chips<T extends string | null>(label: string, options: { value: T; text: string }[], current: T, pick: (v: T) => void) {
  const row = document.createElement('div');
  row.className = 'chip-row';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', label);
  const title = document.createElement('span');
  title.className = 'chip-label';
  title.textContent = label;
  row.append(title);
  for (const o of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = o.text;
    b.setAttribute('aria-pressed', String(o.value === current));
    b.addEventListener('click', () => pick(o.value));
    row.append(b);
  }
  return row;
}

const STATUS_OPTIONS: { value: Filters['status']; text: string }[] = [
  { value: 'all', text: 'All' }, { value: 'want', text: 'Want to go' }, { value: 'visited', text: 'Visited' },
];

const distinct = (key: 'area' | 'category') =>
  [...new Set(places.map((p) => p[key]).filter((v): v is string => !!v))].sort();

function renderFilterPanel(shown: number) {
  const body = document.getElementById('filter-body')!;
  body.replaceChildren(
    chips('Status', STATUS_OPTIONS, filters.status, (status) => setFilters({ status })),
    chips('Area', [{ value: null, text: 'Any' }, ...distinct('area').map((a) => ({ value: a, text: a }))], filters.area, (area) => setFilters({ area })),
    chips('Category', [{ value: null, text: 'Any' }, ...distinct('category').map((c) => ({ value: c, text: c }))], filters.category, (category) => setFilters({ category })),
  );
  const active = filters.status !== 'all' || filters.area || filters.category;
  document.getElementById('filter-count')!.textContent = active ? `${shown}/${places.length}` : '';
  document.getElementById('filter-summary')!.textContent = `${shown} of ${places.length} places`;
}

// ---------- Drawing ----------

function render() {
  pins.clearLayers();
  const shown = places.filter(matches);
  for (const p of shown) {
    L.circleMarker([p.lat, p.lng], {
      radius: p.rank === 'T5' ? 11 : 9,
      weight: 2,
      color: '#fff',
      fillColor: p.status === 'visited' && p.rank ? RANK_COLORS[p.rank] : WANT_COLOR,
      fillOpacity: 0.9,
    })
      .bindPopup(() => popupHtml(p), {
        maxWidth: Math.min(320, window.innerWidth - 48),
        // Long popups scroll inside instead of running off the top of a phone screen.
        maxHeight: Math.min(480, window.innerHeight * 0.6),
        // Keep the popup clear of the Filter / Near me / Inbox buttons (16 px + 44 px + gap).
        autoPanPaddingTopLeft: [16, 76],
        autoPanPaddingBottomRight: [16, 16],
      })
      .addTo(pins);
  }
  renderFilterPanel(shown.length);
  if (!places.length) showStatus('No places yet.');
  else if (!shown.length) showStatus('No places match these filters.');
  else hideStatus();
  return shown;
}

function showStatus(text: string) {
  const el = document.getElementById('status')!;
  el.textContent = text;
  el.hidden = false;
}
const hideStatus = () => (document.getElementById('status')!.hidden = true);

// ---------- Near me ----------

document.getElementById('near-me')!.addEventListener('click', () => {
  if (!navigator.geolocation) return showStatus('This browser can’t share your location.');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const here: L.LatLngTuple = [pos.coords.latitude, pos.coords.longitude];
      me?.remove();
      me = L.circleMarker(here, { radius: 7, weight: 3, color: '#fff', fillColor: '#4285f4', fillOpacity: 1, interactive: false }).addTo(map);
      // Near me means "where can I go now": only places I haven't tried.
      setFilters({ status: 'want' });
      map.setView(here, 15);
    },
    () => showStatus('Couldn’t get your location. Check the browser’s location permission.'),
    { enableHighAccuracy: true, timeout: 10_000 },
  );
});

const panel = document.getElementById('filters')!;
const toggle = document.getElementById('filter-toggle')!;
toggle.addEventListener('click', () => {
  panel.hidden = !panel.hidden;
  toggle.setAttribute('aria-expanded', String(!panel.hidden));
});
document.getElementById('filter-reset')!.addEventListener('click', () => setFilters({ status: 'all', area: null, category: null }));

// ---------- Start ----------

try {
  const res = await fetch('/api/places');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  places = await res.json();
  const shown = render();
  const bounds = (shown.length ? shown : places).map((p) => [p.lat, p.lng] as L.LatLngTuple);
  if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
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
