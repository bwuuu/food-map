/** One place on the map. See docs/product-concept.md, "What a place remembers". */
export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  area: string | null;
  /** De-duplication key once places come from Google Places (Sprint 2). */
  googlePlaceId: string | null;
  category: string | null;
  cuisine: string | null;
  price: string | null;
  /** The one line I would otherwise forget. Required. */
  why: string;
  dishes: string[];
  sources: Source[];
  status: 'want' | 'visited';
  /** Set after visiting: T1 bad … T5 favourite. */
  rank: 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | null;
  notes: string | null;
}

export interface Source {
  type: 'ig' | 'youtube' | 'friend' | 'maps' | 'web';
  /** Free text: a handle, a friend's name, "same post as …". */
  detail: string | null;
  url: string | null;
  /** Path under the data directory, e.g. "images/rachel_screenshot.jpg". */
  image: string | null;
}

/** A raw share from the Android share sheet, waiting in the inbox. */
export interface Draft {
  id: string;
  createdAt: string;
  title: string | null;
  text: string | null;
  url: string | null;
  /** Path under the data directory, e.g. "images/d_….jpg". */
  image: string | null;
}

/** What the inbox sends to turn a draft into a place. */
export interface SaveInput {
  name: string;
  why: string;
  lat: number;
  lng: number;
  dishes: string[];
  area: string | null;
  sourceType: Source['type'];
  sourceDetail: string | null;
}

export const SOURCE_TYPES: Source['type'][] = ['ig', 'youtube', 'friend', 'maps', 'web'];

/** Best guess at where a share came from; the inbox lets me correct it. */
export function guessSourceType(url: string | null): Source['type'] {
  if (!url) return 'ig'; // a bare screenshot is almost always from Instagram
  if (/instagram\.com/i.test(url)) return 'ig';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/maps\.app\.goo\.gl|google\.[a-z.]+\/maps|goo\.gl\/maps/i.test(url)) return 'maps';
  return 'web';
}
