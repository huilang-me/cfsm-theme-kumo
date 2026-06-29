"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LANG,
  detectLang,
  isLang,
  translate,
  type Lang,
  type TKey,
} from "@/lib/i18n";
import { isSafeResourceUrl } from "@/lib/sanitize";
import { isVideoResourceUrl } from "@/lib/background-media";

export type Appearance = "light" | "dark" | "system";
export type Mode = "light" | "dark";
export type ViewMode = "grid" | "list";
export type Accent = "default" | "blue" | "violet" | "emerald" | "rose" | "cyan";
export type Columns = 4 | 5;
export type Surface = "solid" | "glass";
export type OverviewVisibility = "show" | "hide";
export type BackgroundBrightness = 20 | 40 | 60 | 80 | 100;

const ACCENTS: Record<Exclude<Accent, "default">, { brand: string; hover: string }> = {
  blue: {
    brand: "light-dark(oklch(54% 0.2 256), oklch(70% 0.16 256))",
    hover: "light-dark(oklch(48% 0.21 256), oklch(76% 0.15 256))",
  },
  violet: {
    brand: "light-dark(oklch(52% 0.25 295), oklch(70% 0.19 295))",
    hover: "light-dark(oklch(46% 0.26 295), oklch(76% 0.18 295))",
  },
  emerald: {
    brand: "light-dark(oklch(52% 0.15 158), oklch(70% 0.15 158))",
    hover: "light-dark(oklch(46% 0.15 158), oklch(76% 0.14 158))",
  },
  rose: {
    brand: "light-dark(oklch(55% 0.21 14), oklch(70% 0.18 14))",
    hover: "light-dark(oklch(49% 0.22 14), oklch(76% 0.17 14))",
  },
  cyan: {
    brand: "light-dark(oklch(55% 0.12 220), oklch(72% 0.12 220))",
    hover: "light-dark(oklch(49% 0.12 220), oklch(78% 0.11 220))",
  },
};

export const ACCENT_KEYS: Accent[] = [
  "default",
  "blue",
  "violet",
  "emerald",
  "rose",
  "cyan",
];

const LS = {
  appearance: "appearance",
  lang: "language",
  view: "kumo-view",
  accent: "kumo-accent",
  columns: "kumo-cols",
  surface: "kumo-surface",
  overview: "kumo-overview",
  backgroundImageUrl: "kumo-background-image-url",
  backgroundVideoUrl: "kumo-background-video-url",
  backgroundBrightness: "kumo-background-brightness",
  cfsmSettings: "cfsm-theme-settings",
} as const;

function readLS(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function readJsonLS(key: string): Record<string, unknown> | null {
  const raw = readLS(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJsonLS(key: string, value: Record<string, unknown>) {
  writeLS(key, JSON.stringify(value));
}

function parseBackgroundBrightness(value: string | null): BackgroundBrightness {
  const n = Number(value);
  return n === 20 || n === 40 || n === 60 || n === 80 || n === 100 ? n : 100;
}

interface SettingsContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
  mode: Mode;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  accent: Accent;
  setAccent: (a: Accent) => void;
  columns: Columns;
  setColumns: (c: Columns) => void;
  surface: Surface;
  setSurface: (s: Surface) => void;
  overview: OverviewVisibility;
  setOverview: (v: OverviewVisibility) => void;
  background: string;
  backgroundVideo: string;
  backgroundBrightness: BackgroundBrightness;
  setBackgroundBrightness: (value: BackgroundBrightness) => void;
  backgroundImageUrl: string;
  setBackgroundImageUrl: (url: string) => void;
  backgroundVideoUrl: string;
  setBackgroundVideoUrl: (url: string) => void;
  clearBackground: () => void;
  seedDefaults: (d: {
    appearance: Appearance;
    view: ViewMode;
    accent: Accent;
    columns: Columns;
    surface: Surface;
    overview: OverviewVisibility;
    lang: Lang;
    backgroundBrightness: BackgroundBrightness;
    backgroundImageUrl: string;
    backgroundVideoUrl: string;
  }) => void;
  getLocalSettings: () => Record<string, unknown>;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>("system");
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [view, setViewState] = useState<ViewMode>("grid");
  const [accent, setAccentState] = useState<Accent>("default");
  const [columns, setColumnsState] = useState<Columns>(4);
  const [surface, setSurfaceState] = useState<Surface>("solid");
  const [overview, setOverviewState] = useState<OverviewVisibility>("show");
  const [background, setBackgroundState] = useState<string>("");
  const [backgroundVideo, setBackgroundVideoState] = useState<string>("");
  const [backgroundBrightness, setBackgroundBrightnessState] =
    useState<BackgroundBrightness>(100);
  const [backgroundImageUrl, setBackgroundImageUrlState] = useState("");
  const [backgroundVideoUrl, setBackgroundVideoUrlState] = useState("");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const a = readLS(LS.appearance);
    if (a === "light" || a === "dark" || a === "system") setAppearanceState(a);
    const l = readLS(LS.lang);
    setLangState(isLang(l) ? l : detectLang());
    const v = readLS(LS.view);
    if (v === "grid" || v === "list") setViewState(v);
    const ac = readLS(LS.accent);
    if (ac && (ac === "default" || ac in ACCENTS)) setAccentState(ac as Accent);
    const c = readLS(LS.columns);
    if (c === "4" || c === "5") setColumnsState(Number(c) as Columns);
    const sf = readLS(LS.surface);
    if (sf === "solid" || sf === "glass") setSurfaceState(sf);
    const ov = readLS(LS.overview);
    if (ov === "show" || ov === "hide") setOverviewState(ov);
    setBackgroundBrightnessState(parseBackgroundBrightness(readLS(LS.backgroundBrightness)));
    const imageUrl = readLS(LS.backgroundImageUrl)?.trim() ?? "";
    const videoUrl = readLS(LS.backgroundVideoUrl)?.trim() ?? "";
    const imageIsVideo = imageUrl && isVideoResourceUrl(imageUrl);
    const nextImageUrl = imageIsVideo ? "" : imageUrl;
    const nextVideoUrl = videoUrl || (imageIsVideo ? imageUrl : "");
    setBackgroundImageUrlState(nextImageUrl);
    setBackgroundVideoUrlState(nextVideoUrl);
    if (nextImageUrl && isSafeResourceUrl(nextImageUrl)) {
      setBackgroundState(nextImageUrl);
    }
    if (nextVideoUrl && isSafeResourceUrl(nextVideoUrl)) {
      setBackgroundVideoState(nextVideoUrl);
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const mode: Mode =
    appearance === "system" ? (systemDark ? "dark" : "light") : appearance;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-mode", mode);
    root.style.colorScheme = mode;
  }, [mode]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.documentElement.setAttribute("data-surface", surface);
  }, [surface]);

  useEffect(() => {
    const root = document.documentElement;
    if (accent === "default") {
      root.style.removeProperty("--color-kumo-brand");
      root.style.removeProperty("--color-kumo-brand-hover");
    } else {
      root.style.setProperty("--color-kumo-brand", ACCENTS[accent].brand);
      root.style.setProperty("--color-kumo-brand-hover", ACCENTS[accent].hover);
    }
  }, [accent]);

  const setAppearance = useCallback((a: Appearance) => {
    setAppearanceState(a);
    writeLS(LS.appearance, a);
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    writeLS(LS.lang, l);
  }, []);
  const setView = useCallback((v: ViewMode) => {
    setViewState(v);
    writeLS(LS.view, v);
  }, []);
  const setAccent = useCallback((a: Accent) => {
    setAccentState(a);
    writeLS(LS.accent, a);
  }, []);
  const setColumns = useCallback((c: Columns) => {
    setColumnsState(c);
    writeLS(LS.columns, String(c));
  }, []);
  const setSurface = useCallback((s: Surface) => {
    setSurfaceState(s);
    writeLS(LS.surface, s);
  }, []);
  const setOverview = useCallback((v: OverviewVisibility) => {
    setOverviewState(v);
    writeLS(LS.overview, v);
  }, []);
  const setBackgroundBrightness = useCallback((value: BackgroundBrightness) => {
    setBackgroundBrightnessState(value);
    writeLS(LS.backgroundBrightness, String(value));
  }, []);
  const setBackgroundImageUrl = useCallback((url: string) => {
    const next = url.trim();
    const isVideo = isVideoResourceUrl(next);
    const imageUrl = isVideo ? "" : next;
    const videoUrl = isVideo ? next : "";
    setBackgroundImageUrlState(imageUrl);
    setBackgroundVideoUrlState(videoUrl);
    writeLS(LS.backgroundImageUrl, imageUrl);
    writeLS(LS.backgroundVideoUrl, videoUrl);
    setBackgroundState(imageUrl && isSafeResourceUrl(imageUrl) ? imageUrl : "");
    setBackgroundVideoState(videoUrl && isSafeResourceUrl(videoUrl) ? videoUrl : "");
  }, []);
  const setBackgroundVideoUrl = useCallback((url: string) => {
    const next = url.trim();
    setBackgroundVideoUrlState(next);
    writeLS(LS.backgroundVideoUrl, next);
    setBackgroundVideoState(next && isSafeResourceUrl(next) ? next : "");
  }, []);
  const clearBackground = useCallback(() => {
    setBackgroundImageUrlState("");
    setBackgroundVideoUrlState("");
    writeLS(LS.backgroundImageUrl, "");
    writeLS(LS.backgroundVideoUrl, "");
    setBackgroundState("");
    setBackgroundVideoState("");
  }, []);

  const seedDefaults = useCallback(
    (d: {
      appearance: Appearance;
      view: ViewMode;
      accent: Accent;
      columns: Columns;
      surface: Surface;
      overview: OverviewVisibility;
      lang: Lang;
      backgroundBrightness: BackgroundBrightness;
      backgroundImageUrl: string;
      backgroundVideoUrl: string;
    }) => {
      setAppearance(d.appearance);
      setView(d.view);
      setAccent(d.accent);
      setColumns(d.columns);
      setSurface(d.surface);
      setOverview(d.overview);
      setLang(d.lang);
      setBackgroundBrightness(d.backgroundBrightness);
      if (d.backgroundVideoUrl) {
        setBackgroundImageUrl("");
        setBackgroundVideoUrl(d.backgroundVideoUrl);
      } else {
        setBackgroundVideoUrl("");
        setBackgroundImageUrl(d.backgroundImageUrl);
      }
    },
    [
      setAppearance,
      setView,
      setAccent,
      setColumns,
      setSurface,
      setOverview,
      setLang,
      setBackgroundBrightness,
      setBackgroundImageUrl,
      setBackgroundVideoUrl,
    ],
  );

  const getLocalSettings = useCallback((): Record<string, unknown> => {
    return readJsonLS(LS.cfsmSettings) ?? {};
  }, []);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) =>
      translate(lang, key, vars),
    [lang],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      lang,
      setLang,
      appearance,
      setAppearance,
      mode,
      view,
      setView,
      accent,
      setAccent,
      columns,
      setColumns,
      surface,
      setSurface,
      overview,
      setOverview,
      background,
      backgroundVideo,
      backgroundBrightness,
      setBackgroundBrightness,
      backgroundImageUrl,
      setBackgroundImageUrl,
      backgroundVideoUrl,
      setBackgroundVideoUrl,
      clearBackground,
      seedDefaults,
      getLocalSettings,
      t,
    }),
    [lang, setLang, appearance, setAppearance, mode, view, setView, accent, setAccent, columns, setColumns, surface, setSurface, overview, setOverview, background, backgroundVideo, backgroundBrightness, setBackgroundBrightness, backgroundImageUrl, setBackgroundImageUrl, backgroundVideoUrl, setBackgroundVideoUrl, clearBackground, seedDefaults, getLocalSettings, t],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within <Providers>");
  return ctx;
}
