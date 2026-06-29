/** Region helpers: flag-emoji → ISO code, country centroids (for the globe), and localized names. */

/**
 * Komari's `region` is usually a flag emoji (e.g. "🇺🇸"). Convert it to an
 * ISO 3166-1 alpha-2 code (lowercase). Returns null when it isn't a flag/code.
 */
export function regionToCode(region: string): string | null {
  const chars = [...region];
  if (chars.length >= 2) {
    const a = chars[0].codePointAt(0) ?? 0;
    const b = chars[1].codePointAt(0) ?? 0;
    if (a >= 0x1f1e6 && a <= 0x1f1ff && b >= 0x1f1e6 && b <= 0x1f1ff) {
      return (
        String.fromCharCode(a - 0x1f1e6 + 97) + String.fromCharCode(b - 0x1f1e6 + 97)
      );
    }
  }
  const trimmed = region.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(trimmed)) return trimmed;
  return null;
}

/** Localized country name from an alpha-2 code (falls back to the upper-cased code). */
export function regionName(code: string, lang: string): string {
  try {
    const dn = new Intl.DisplayNames([lang], { type: "region" });
    return dn.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/**
 * Approximate country centroids as [latitude, longitude], keyed by lowercase
 * ISO 3166-1 alpha-2. Used to place markers on the globe. Not exhaustive — any
 * region without an entry simply gets no globe marker (it still appears in the list).
 */
export const COUNTRY_COORDS: Record<string, [number, number]> = {
  // North & Central America
  us: [39.8, -98.6], ca: [56.1, -106.3], mx: [23.6, -102.5], gt: [15.8, -90.2],
  bz: [17.2, -88.5], hn: [15.2, -86.2], sv: [13.8, -88.9], ni: [12.9, -85.2],
  cr: [9.7, -83.8], pa: [8.5, -80.8], cu: [21.5, -77.8], do: [18.7, -70.2],
  ht: [19.0, -72.3], jm: [18.1, -77.3], pr: [18.2, -66.5], bs: [25.0, -77.4],
  tt: [10.7, -61.2], bb: [13.2, -59.5],
  // South America
  br: [-14.2, -51.9], ar: [-38.4, -63.6], cl: [-35.7, -71.5], co: [4.6, -74.3],
  pe: [-9.2, -75.0], ve: [6.4, -66.6], ec: [-1.8, -78.2], bo: [-16.3, -63.6],
  py: [-23.4, -58.4], uy: [-32.5, -55.8], gy: [4.9, -58.9], sr: [3.9, -56.0],
  // Western & Northern Europe
  gb: [54.0, -2.0], ie: [53.4, -8.2], fr: [46.6, 2.2], de: [51.2, 10.4],
  nl: [52.1, 5.3], be: [50.5, 4.5], lu: [49.8, 6.1], ch: [46.8, 8.2],
  at: [47.6, 14.6], se: [60.1, 18.6], no: [60.5, 8.5], dk: [56.3, 9.5],
  fi: [61.9, 25.7], is: [64.96, -19.0],
  // Southern Europe
  it: [41.9, 12.6], es: [40.0, -3.7], pt: [39.4, -8.2], gr: [39.1, 21.8],
  mt: [35.9, 14.4], cy: [35.1, 33.4], al: [41.2, 20.2], mk: [41.6, 21.7],
  rs: [44.0, 21.0], hr: [45.1, 15.2], si: [46.15, 14.99], ba: [43.9, 17.7],
  me: [42.7, 19.4], xk: [42.6, 20.9], ad: [42.5, 1.5], mc: [43.7, 7.4],
  sm: [43.9, 12.5], li: [47.2, 9.55], va: [41.9, 12.45],
  // Eastern Europe
  pl: [51.9, 19.1], cz: [49.8, 15.5], sk: [48.7, 19.7], hu: [47.2, 19.5],
  ro: [45.9, 24.97], bg: [42.7, 25.5], ua: [48.4, 31.2], by: [53.7, 27.95],
  md: [47.4, 28.4], ee: [58.6, 25.0], lv: [56.9, 24.6], lt: [55.2, 23.9],
  ru: [61.5, 105.3],
  // Middle East & Caucasus
  tr: [38.96, 35.2], ge: [42.3, 43.4], am: [40.1, 45.0], az: [40.1, 47.6],
  ir: [32.4, 53.7], iq: [33.2, 43.7], sa: [23.9, 45.1], ae: [23.4, 53.8],
  qa: [25.4, 51.2], kw: [29.3, 47.5], bh: [26.0, 50.55], om: [21.5, 55.9],
  ye: [15.6, 48.0], jo: [30.6, 36.2], il: [31.0, 34.9], ps: [31.9, 35.2],
  lb: [33.9, 35.9], sy: [34.8, 38.997],
  // Central & South Asia
  kz: [48.0, 66.9], uz: [41.4, 64.6], tm: [38.97, 59.6], tj: [38.9, 71.3],
  kg: [41.2, 74.8], af: [33.9, 67.7], pk: [30.4, 69.35], in: [20.6, 78.96],
  bd: [23.68, 90.36], lk: [7.87, 80.77], np: [28.4, 84.12], bt: [27.5, 90.4],
  mv: [3.2, 73.2],
  // East & Southeast Asia
  cn: [35.9, 104.2], hk: [22.3, 114.2], mo: [22.2, 113.55], tw: [23.7, 121.0],
  jp: [36.2, 138.3], kr: [35.9, 127.8], kp: [40.3, 127.5], mn: [46.86, 103.8],
  sg: [1.35, 103.8], my: [4.2, 101.98], th: [15.9, 100.99], vn: [14.06, 108.3],
  id: [-0.79, 113.9], ph: [12.88, 121.77], kh: [12.57, 104.99], la: [19.86, 102.5],
  mm: [21.9, 95.96], bn: [4.5, 114.7],
  // Africa
  eg: [26.8, 30.8], ly: [26.3, 17.2], tn: [33.9, 9.6], dz: [28.0, 1.7],
  ma: [31.8, -7.1], za: [-30.6, 22.9], ng: [9.08, 8.7], ke: [-0.02, 37.9],
  gh: [7.95, -1.02], et: [9.15, 40.5], tz: [-6.4, 34.9], ug: [1.37, 32.3],
  ci: [7.54, -5.55], sn: [14.5, -14.5], cm: [7.37, 12.35], ao: [-11.2, 17.9],
  mz: [-18.7, 35.5], zw: [-19.0, 29.2], zm: [-13.1, 27.8], rw: [-1.94, 29.9],
  mg: [-18.8, 47.0], mu: [-20.3, 57.6], sd: [12.9, 30.2], so: [5.15, 46.2],
  dj: [11.8, 42.6], na: [-22.96, 18.5], bw: [-22.3, 24.7], cd: [-4.0, 21.8],
  cg: [-0.66, 14.9], ga: [-0.8, 11.6], ml: [17.6, -4.0], ne: [17.6, 8.1],
  bf: [12.2, -1.6], gn: [9.9, -9.7], bj: [9.3, 2.3], tg: [8.6, 0.8],
  // Oceania
  au: [-25.3, 133.8], nz: [-40.9, 174.9], pg: [-6.3, 143.96], fj: [-17.7, 178.0],
};
