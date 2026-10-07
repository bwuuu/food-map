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
