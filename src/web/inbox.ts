import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';
import { SOURCE_TYPES, guessSourceType, type Draft, type Place, type Source, type Suggestion } from '../place.ts';
import { parseCoords } from '../coords.ts';
import { TAIPEI, addTiles, safeImage, safeUrl } from './shared.ts';

const SOURCE_NAMES: Record<Source['type'], string> = { ig: 'Instagram', youtube: 'YouTube', friend: 'Friend', maps: 'Google Maps', web: 'Web' };
const pinIcon = L.divIcon({ className: 'pin', iconSize: [26, 26], iconAnchor: [13, 26] });

const list = document.getElementById('drafts')!;
const empty = document.getElementById('empty')!;
const toast = document.getElementById('toast')!;
/** Places already on the map, to spot a share of somewhere I've saved before. */
let knownPlaces: Place[] = [];

/** Small DOM builder: text is always set as text, never parsed as HTML. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function field(label: string, input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, hint?: string) {
  return el('label', { className: 'field' }, el('span', {}, label), input, ...(hint ? [el('small', {}, hint)] : []));
}

function showToast(message: string) {
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => (toast.hidden = true), 3000);
}

function updateEmpty() {
  empty.hidden = list.children.length > 0;
}

function card(draft: Draft) {
  const source = guessSourceType(draft.url);
  const name = el('input', { required: true, autocomplete: 'off', value: source === 'maps' ? (draft.title ?? '') : '' });
  const why = el('textarea', { required: true, rows: 2 });
  const dishes = el('textarea', { rows: 2 });
  const area = el('input', { autocomplete: 'off' });
  const category = el('input', { autocomplete: 'off', placeholder: 'e.g. Izakaya' });
  const cuisine = el('input', { autocomplete: 'off', placeholder: 'e.g. Japanese' });
  // From Google Places, not shown: kept so a saved place can be matched and looked up later.
  let address: string | null = null;
  let googlePlaceId: string | null = null;
  const extractStatus = el('p', { className: 'extract-status', role: 'status', hidden: true });
  const sourceType = el('select', {}, ...SOURCE_TYPES.map((t) => el('option', { value: t, selected: t === source }, SOURCE_NAMES[t])));
  const sourceDetail = el('input', { autocomplete: 'off', placeholder: '@handle or name' });
  const coords = el('input', { autocomplete: 'off', inputMode: 'decimal', placeholder: 'Paste lat, lng or a Maps link' });
  const pinStatus = el('small', { className: 'pin-status' }, 'No pin yet: tap the map where the place is.');
  const mapDiv = el('div', { className: 'mini-map' });
  const save = el('button', { type: 'submit', className: 'primary' }, 'Save to map');
  const skip = el('button', { type: 'button', className: 'quiet' }, 'Skip');
  const error = el('p', { className: 'error', role: 'alert', hidden: true });

  const shared = [draft.title, draft.text].filter(Boolean).join('\n');
  const link = safeUrl(draft.url);
  const image = safeImage(draft.image);
  const form = el(
    'form',
    { className: 'draft', id: draft.id, noValidate: true },
    el('div', { className: 'shared' },
      ...(image ? [el('img', { src: image, alt: 'Shared screenshot' })] : []),
      ...(shared ? [el('p', { className: 'shared-text' }, shared)] : []),
      ...(link ? [el('a', { href: link, target: '_blank', rel: 'noopener noreferrer' }, 'Open what was shared ↗')] : []),
      el('small', {}, `Shared ${new Date(draft.createdAt).toLocaleString()}`),
    ),
    extractStatus,
    field('Name *', name),
    field('Why I saved it *', why, 'The one thing you’d otherwise forget.'),
    field('What to order', dishes, 'One per line.'),
    field('Area', area, 'e.g. Zhongshan District'),
    el('div', { className: 'row' }, field('Category', category), field('Cuisine', cuisine)),
    el('div', { className: 'row' }, field('Source', sourceType), field('From', sourceDetail)),
    field('Pin *', coords),
    mapDiv,
    pinStatus,
    error,
    el('div', { className: 'actions' }, skip, save),
  );
  list.append(form);

  const map = L.map(mapDiv, { zoomControl: false, attributionControl: false }).setView(TAIPEI, 12);
  addTiles(map);
  let pin: L.Marker | null = null;
  const placePin = (latlng: L.LatLngExpression, pan = false) => {
    if (pin) pin.setLatLng(latlng);
    else pin = L.marker(latlng, { draggable: true, icon: pinIcon }).addTo(map).on('dragend', showPin);
    if (pan) map.setView(latlng, 17);
    showPin();
  };
  const showPin = () => {
    const p = pin!.getLatLng();
    coords.value = `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;
    pinStatus.textContent = `Pin at ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}. Drag it to adjust.`;
  };
  map.on('click', (e) => placePin(e.latlng));
  coords.addEventListener('input', () => {
    const c = parseCoords(coords.value);
    if (c) placePin(c, true);
    else if (coords.value.includes('goo.gl')) pinStatus.textContent = 'Short links are read when shared, not pasted. Paste the full link or tap the map.';
  });
  // A Maps link shared directly may already carry coordinates.
  const fromShare = parseCoords(draft.url ?? '') ?? parseCoords(draft.text ?? '');
  if (fromShare) placePin(fromShare, true);

  /** Fill only what's still empty: never overwrite something I typed while Claude was reading. */
  const applySuggestion = (sg: Suggestion) => {
    const fill = (input: HTMLInputElement | HTMLTextAreaElement, value: string | null) => {
      if (value && !input.value.trim()) input.value = value;
    };
    fill(name, sg.name);
    fill(why, sg.why);
    fill(dishes, sg.dishes.join('\n'));
    fill(area, sg.area);
    fill(category, sg.category);
    fill(cuisine, sg.cuisine);
    address = sg.address;
    googlePlaceId = sg.googlePlaceId;
    if (!pin && sg.lat !== null && sg.lng !== null) placePin([sg.lat, sg.lng], true);
    const warn = sg.confidence === 'low' || sg.note;
    const existing = sg.googlePlaceId ? knownPlaces.find((p) => p.googlePlaceId === sg.googlePlaceId) : undefined;
    extractStatus.textContent = existing
      ? `📍 Already on your map as “${existing.name}”. Saving adds this share as another source.`
      : warn ? `⚠️ ${sg.note ?? 'Not sure about this one. Check every field.'}` : '✨ Filled in from the share. Check it before saving.';
    extractStatus.classList.toggle('warn', !!warn);
    extractStatus.hidden = false;
  };

  const showExtraction = (d: Draft) => {
    if (d.extraction === 'done' && d.suggestion) return applySuggestion(d.suggestion);
    if (d.extraction === 'failed') {
      extractStatus.textContent = 'Couldn’t read this share. Fill it in yourself.';
      extractStatus.classList.add('warn');
      extractStatus.hidden = false;
    }
  };

  if (draft.extraction === 'pending') {
    extractStatus.textContent = 'Reading the share…';
    extractStatus.hidden = false;
    const started = Date.now();
    const poll = async () => {
      if (!form.isConnected) return; // saved or skipped meanwhile
      const res = await fetch(`/api/drafts/${draft.id}`).catch(() => null);
      const latest = res?.ok ? ((await res.json()) as Draft) : null;
      if (latest && latest.extraction !== 'pending') return showExtraction(latest);
      if (Date.now() - started > 90_000) {
        extractStatus.textContent = 'Still reading. Reload later, or fill it in yourself.';
        return;
      }
      setTimeout(poll, 1500);
    };
    setTimeout(poll, 1500);
  } else {
    showExtraction(draft);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const latlng = pin?.getLatLng();
    const problem = !name.value.trim() ? 'Add a name.' : !why.value.trim() ? 'Add why you saved it: that’s the point of the map.' : !latlng ? 'Place the pin.' : null;
    if (problem) {
      error.textContent = problem;
      error.hidden = false;
      return;
    }
    save.disabled = true;
    const res = await fetch(`/api/drafts/${draft.id}/save`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: name.value, why: why.value, lat: latlng!.lat, lng: latlng!.lng,
        dishes: dishes.value.split('\n'), area: area.value, sourceType: sourceType.value, sourceDetail: sourceDetail.value,
        category: category.value, cuisine: cuisine.value, address, googlePlaceId,
      }),
    });
    if (!res.ok) {
      save.disabled = false;
      error.textContent = ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Could not save. Try again.';
      error.hidden = false;
      return;
    }
    const { place, merged } = (await res.json()) as { place: Place; merged: boolean };
    form.remove();
    updateEmpty();
    showToast(merged ? `Already on the map: added this share to “${place.name}”.` : `Saved “${place.name}” to the map.`);
  });

  skip.addEventListener('click', async () => {
    if (!confirm('Skip this share? It and its screenshot will be deleted.')) return;
    const res = await fetch(`/api/drafts/${draft.id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) return showToast('Could not skip. Try again.');
    form.remove();
    updateEmpty();
  });
}

try {
  knownPlaces = await fetch('/api/places').then((r) => (r.ok ? r.json() : []), () => []);
  const res = await fetch('/api/drafts');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  for (const d of (await res.json()) as Draft[]) card(d);
  updateEmpty();
  // Arriving from the share sheet: bring that draft into view.
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target) {
    target.scrollIntoView({ block: 'start' });
    (target.querySelector('input:not([value]), textarea') as HTMLElement | null)?.focus({ preventScroll: true });
  }
} catch (e) {
  console.error(e);
  empty.textContent = 'Could not load the inbox. Try reloading.';
  empty.hidden = false;
}
