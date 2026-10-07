import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';
import { SOURCE_TYPES, guessSourceType, type Draft, type Place, type Source } from '../place.ts';
import { parseCoords } from './coords.ts';
import { TAIPEI, addTiles, safeImage, safeUrl } from './shared.ts';

const SOURCE_NAMES: Record<Source['type'], string> = { ig: 'Instagram', youtube: 'YouTube', friend: 'Friend', maps: 'Google Maps', web: 'Web' };
const pinIcon = L.divIcon({ className: 'pin', iconSize: [26, 26], iconAnchor: [13, 26] });

const list = document.getElementById('drafts')!;
const empty = document.getElementById('empty')!;
const toast = document.getElementById('toast')!;

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
    field('Name *', name),
    field('Why I saved it *', why, 'The one thing you’d otherwise forget.'),
    field('What to order', dishes, 'One per line.'),
    field('Area', area, 'e.g. Zhongshan District'),
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
    else if (coords.value.includes('goo.gl')) pinStatus.textContent = 'Short Google Maps links can’t be read yet. Tap the map instead.';
  });
  // A Maps link shared directly may already carry coordinates.
  const fromShare = parseCoords(draft.url ?? '') ?? parseCoords(draft.text ?? '');
  if (fromShare) placePin(fromShare, true);

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
      }),
    });
    if (!res.ok) {
      save.disabled = false;
      error.textContent = ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Could not save. Try again.';
      error.hidden = false;
      return;
    }
    const place = (await res.json()) as Place;
    form.remove();
    updateEmpty();
    showToast(`Saved “${place.name}” to the map.`);
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
