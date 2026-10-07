import { describe, expect, it } from 'vitest';
import { migrate } from './migrate-v1.ts';

const rachel = {
  name: '芮秋 Rachel',
  rank: 'T0',
  area: 'Songshan District',
  lat: 25.0512345,
  lng: 121.5612345,
  plusCode: '3H2Q+XX Songshan District, Taipei City',
  notes: 'Opens 08:00',
  sources: [
    { type: 'Instagram', detail: '@foodie_account (same post)', link: 'https://www.instagram.com/p/DXMeLh4geME/', image: './images/rachel_screenshot.jpg' },
    { type: 'Friend', detail: '小明' },
  ],
  whyTry: 'Dutch baby pancake',
  dishRecommendations: 'Dutch baby, with pork belly',
  mood: 'Chill',
  bestFor: 'Weekend morning',
};

describe('migrate', () => {
  it('maps a v1 place onto the new model', () => {
    const [p] = migrate([rachel]);
    expect(p).toMatchObject({
      name: '芮秋 Rachel',
      lat: 25.0512345, // full precision kept
      status: 'want',
      rank: null, // T0 meant "not tried", which is now status: want
      why: 'Dutch baby pancake',
      dishes: ['Dutch baby, with pork belly'],
      sources: [
        { type: 'ig', detail: '@foodie_account (same post)', url: 'https://www.instagram.com/p/DXMeLh4geME/', image: 'images/rachel_screenshot.jpg' },
        { type: 'friend', detail: '小明', url: null, image: null },
      ],
      notes: 'Opens 08:00\nPlus Code: 3H2Q+XX Songshan District, Taipei City\nMood: Chill\nBest for: Weekend morning',
    });
  });

  it('keeps a visited rank and gives stable ids', () => {
    const [a] = migrate([{ ...rachel, rank: 'T4' }]);
    const [b] = migrate([rachel]);
    expect(a).toMatchObject({ status: 'visited', rank: 'T4' });
    expect(a!.id).toBe(b!.id);
    expect(a!.id).toMatch(/^p_[0-9a-f]{8}$/);
  });
});
