/** Reads theme configuration from the CF-Server-Monitor site config. */

import type { SiteConfig, SysConfig } from "./types";
import type {
  Accent,
  Appearance,
  BackgroundBrightness,
  Columns,
  Surface,
  ViewMode,
  OverviewVisibility,
} from "@/components/providers";
import { isSafeResourceUrl } from "@/lib/sanitize";
import type { Lang } from "@/lib/i18n";

export interface ThemeOptions {
  backgroundUrl: string;
  backgroundVideoUrl: string;
  backgroundBrightness: BackgroundBrightness;
  enableGroupTabs: boolean;
  defaultView: ViewMode;
  defaultAppearance: Appearance;
  defaultAccent: Accent;
  defaultColumns: Columns;
  defaultSurface: Surface;
  defaultLang: Lang;
  defaultOverview: OverviewVisibility;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "1" || v === "on";
  return fallback;
}

function asResourceUrl(v: unknown): string {
  const url = asString(v);
  return isSafeResourceUrl(url) ? url : "";
}

function firstResourceUrl(...values: unknown[]): string {
  for (const value of values) {
    const url = asResourceUrl(value);
    if (url) return url;
  }
  return "";
}

function asBrightness(v: unknown): BackgroundBrightness {
  const n = typeof v === "number" ? v : Number(asString(v));
  return n === 20 || n === 40 || n === 60 || n === 80 || n === 100
    ? (n as BackgroundBrightness)
    : 100;
}

const VIEWS: ViewMode[] = ["grid", "list"];
const APPEARANCES: Appearance[] = ["light", "dark", "system"];
const ACCENTS: Accent[] = ["default", "blue", "violet", "emerald", "rose", "cyan"];
const LANGS: Lang[] = ["zh-CN", "en"];
const OVERVIEWS: OverviewVisibility[] = ["show", "hide"];

export function parseThemeOptions(
  sysConfig?: SysConfig,
  localSettings?: Record<string, unknown>,
): ThemeOptions {
  const s = localSettings ?? {};
  const view = asString(s.defaultView);
  const appearance = asString(s.defaultAppearance);
  const accent = asString(s.defaultAccent);
  const columns = asString(s.defaultColumns);
  const cardStyle = asString(s.cardStyle);
  const lang = asString(s.defaultLang);
  const overview = asString(s.overviewVisibility);
  return {
    backgroundUrl: firstResourceUrl(s.backgroundUrl, s.backgroundImage),
    backgroundVideoUrl: firstResourceUrl(s.backgroundVideoUrl, s.videoBackgroundUrl),
    backgroundBrightness: asBrightness(s.backgroundBrightness),
    enableGroupTabs: asBool(s.enableGroupTabs, true),
    defaultView: VIEWS.includes(view as ViewMode) ? (view as ViewMode) : "grid",
    defaultAppearance: APPEARANCES.includes(appearance as Appearance)
      ? (appearance as Appearance)
      : "system",
    defaultAccent: ACCENTS.includes(accent as Accent) ? (accent as Accent) : "default",
    defaultColumns: columns === "4" || columns === "5" ? (Number(columns) as Columns) : 4,
    defaultSurface:
      cardStyle === "solid" || cardStyle === "glass" ? (cardStyle as Surface) : "solid",
    defaultLang: LANGS.includes(lang as Lang) ? (lang as Lang) : "zh-CN",
    defaultOverview: OVERVIEWS.includes(overview as OverviewVisibility)
      ? (overview as OverviewVisibility)
      : "show",
  };
}
