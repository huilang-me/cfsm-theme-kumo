/**
 * Shared world-country geometry + name→ISO-code resolution, used by both the
 * 3D globe and the flat map. The topojson is loaded lazily (never during SSR)
 * and cached after the first load.
 */

export type Position = [number, number];
export type Polygon = Position[][];
export type MultiPolygon = Polygon[];

export interface CountryFeature {
  properties?: {
    name?: string;
  };
  geometry?: {
    type: "Polygon" | "MultiPolygon";
    coordinates: Polygon | MultiPolygon;
  };
}

interface CountriesTopology {
  objects: {
    countries: unknown;
  };
}

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  "bosnia and herzegovina": "ba",
  "bosnia and herz": "ba",
  "central african rep": "cf",
  "dem rep congo": "cd",
  "dominican rep": "do",
  "eq guinea": "gq",
  "falkland is": "fk",
  "hong kong": "hk",
  "kosovo": "xk",
  "laos": "la",
  "macao": "mo",
  "macedonia": "mk",
  "n cyprus": "cy",
  "north korea": "kp",
  "papua new guinea": "pg",
  "palestine": "ps",
  "solomon is": "sb",
  "s sudan": "ss",
  "singapore": "sg",
  "south korea": "kr",
  "taiwan": "cn",
  "timor leste": "tl",
  "united states": "us",
  "united states of america": "us",
  "united kingdom": "gb",
  "w sahara": "eh",
};

function normalizeCountryName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

const COUNTRY_NAME_TO_CODE = (() => {
  const map = new Map<string, string>();
  let displayNames: Intl.DisplayNames | null = null;
  try {
    displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    displayNames = null;
  }

  if (displayNames) {
    for (let a = 65; a <= 90; a += 1) {
      for (let b = 65; b <= 90; b += 1) {
        const code = String.fromCharCode(a, b);
        const name = displayNames.of(code);
        if (name && name !== code) map.set(normalizeCountryName(name), code.toLowerCase());
      }
    }
  }

  for (const [name, code] of Object.entries(COUNTRY_NAME_ALIASES)) {
    map.set(normalizeCountryName(name), code);
  }
  return map;
})();

/**
 * 南海九段线坐标（GCJ-02 坐标系近似值）。
 * 从台湾海峡南端顺时针至越南东部海域，共九段。
 */
export const NINE_DASH_LINE: Position[] = [
  [21.5, 117.5],   // 第一段起点：台湾海峡南端
  [18.5, 116.0],   // 第二段
  [15.0, 115.5],   // 第三段
  [12.0, 114.5],   // 第四段
  [7.5, 112.5],    // 第五段
  [5.5, 110.5],    // 第六段
  [4.5, 109.0],    // 第七段
  [7.0, 106.5],    // 第八段
  [10.0, 106.0],   // 第九段终点：越南东部
];

export function countryFeatureCode(country: CountryFeature) {
  const name = country.properties?.name;
  if (!name) return null;
  return COUNTRY_NAME_TO_CODE.get(normalizeCountryName(name)) ?? null;
}

export interface WorldCountries {
  /** Every country feature (for drawing the full base map). */
  features: CountryFeature[];
  /** Node-bearing lookup: lowercase ISO alpha-2 → its features. */
  byCode: Map<string, CountryFeature[]>;
}

let worldCache: WorldCountries | null = null;

export async function loadWorldCountries(): Promise<WorldCountries> {
  if (worldCache) return worldCache;
  const [{ feature }, topologyModule] = await Promise.all([
    import("topojson-client"),
    import("world-atlas/countries-50m.json"),
  ]);
  const topology = topologyModule.default as CountriesTopology;
  const countryCollection = feature(
    topology,
    topology.objects.countries,
  ) as unknown as { features: CountryFeature[] };

  const byCode = new Map<string, CountryFeature[]>();
  for (const country of countryCollection.features) {
    const code = countryFeatureCode(country);
    if (!code) continue;
    const list = byCode.get(code);
    if (list) list.push(country);
    else byCode.set(code, [country]);
  }

  worldCache = { features: countryCollection.features, byCode };
  return worldCache;
}
