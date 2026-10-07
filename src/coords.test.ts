import { describe, expect, it } from 'vitest';
import { parseCoords } from './coords.ts';

describe('parseCoords', () => {
  it('reads what people paste', () => {
    expect(parseCoords('25.0512345, 121.5612345')).toEqual([25.0512345, 121.5612345]);
    expect(parseCoords('https://www.google.com/maps/@25.0478,121.5170,17z')).toEqual([25.0478, 121.517]);
    expect(parseCoords('https://www.google.com/maps/search/?api=1&query=25.05,121.55')).toEqual([25.05, 121.55]);
  });

  it('prefers the place pin over the viewport centre in a place URL', () => {
    const url = 'https://www.google.com/maps/place/X/@25.0400,121.5000,15z/data=!4m6!3m5!1s0x0:0x0!8m2!3d25.0512345!4d121.5612345';
    expect(parseCoords(url)).toEqual([25.0512345, 121.5612345]);
  });

  it('returns null for short links, junk and out-of-range numbers', () => {
    expect(parseCoords('https://maps.app.goo.gl/AbCdEf')).toBeNull();
    expect(parseCoords('hello')).toBeNull();
    expect(parseCoords('125.0, 121.5')).toBeNull();
  });
});
