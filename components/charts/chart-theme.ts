import type { Mode } from "@/components/providers";

/**
 * Fixed per-mode palettes for charts. Canvas can't resolve `light-dark()`/oklch
 * kumo tokens reliably, so we mirror the kumo look with concrete colors instead.
 */
export interface ChartColors {
  text: string;
  axis: string;
  split: string;
  brand: string;
  success: string;
  danger: string;
  info: string;
  warning: string;
  up: string;
  down: string;
}

const DARK: ChartColors = {
  text: "#9aa0a6",
  axis: "rgba(255,255,255,0.16)",
  split: "rgba(255,255,255,0.06)",
  brand: "#fb9f4b",
  success: "#46c08a",
  danger: "#ff6166",
  info: "#5b9bff",
  warning: "#f5b544",
  up: "#5b9bff",
  down: "#46c08a",
};

const LIGHT: ChartColors = {
  text: "#6b7280",
  axis: "rgba(0,0,0,0.14)",
  split: "rgba(0,0,0,0.05)",
  brand: "#f6821f",
  success: "#3aa675",
  danger: "#e5484d",
  info: "#3b82f6",
  warning: "#d9870b",
  up: "#3b82f6",
  down: "#3aa675",
};

export function chartColors(mode: Mode): ChartColors {
  return mode === "dark" ? DARK : LIGHT;
}

/** Apply alpha to a hex/rgb color for area fills. */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
