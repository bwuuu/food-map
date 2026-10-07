/**
 * Coordinates from what a person would paste: "25.05, 121.55", or a full
 * Google Maps URL (…/@25.05,121.55,17z or …!3d25.05!4d121.55 or ?q=25.05,121.55).
 * Short maps.app.goo.gl links carry no coordinates; Sprint 2 resolves those server-side.
 */
export function parseCoords(input: string): [number, number] | null {
  const n = String.raw`(-?\d{1,3}\.\d+)`;
  const patterns = [
    new RegExp(String.raw`!3d${n}!4d${n}`), // the place itself; checked before @, which is the viewport
    new RegExp(String.raw`[?&](?:q|query|ll)=${n},\s*${n}`),
    new RegExp(String.raw`@${n},${n}`),
    new RegExp(String.raw`^\s*${n}\s*,\s*${n}\s*$`),
  ];
  for (const re of patterns) {
    const m = input.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng];
  }
  return null;
}
