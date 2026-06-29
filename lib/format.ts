const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB"] as const;

export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const exp = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const value = bytes / 1024 ** exp;
  return `${value.toFixed(exp === 0 ? 0 : decimals)} ${BYTE_UNITS[exp]}`;
}

export function formatSpeed(bytesPerSec: number, decimals = 1): string {
  return `${formatBytes(Math.max(0, bytesPerSec), decimals)}/s`;
}

export function formatGB(gb: number, decimals = 0): string {
  if (!Number.isFinite(gb) || gb <= 0) return "0 GB";
  return `${gb.toFixed(decimals)} GB`;
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(decimals)}%`;
}

export function ratioPercent(used: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, (used / total) * 100));
}

export type LoadLevel = "low" | "mid" | "high" | "critical";
export function loadLevel(percent: number): LoadLevel {
  if (percent >= 90) return "critical";
  if (percent >= 75) return "high";
  if (percent >= 45) return "mid";
  return "low";
}
