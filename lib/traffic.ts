export type TrafficCalcType = "total" | "ul" | "dl";

export function trafficUsedByType(
  type: string,
  up: number,
  down: number,
): number {
  switch (type) {
    case "dl":
      return down;
    case "ul":
      return up;
    case "total":
    default:
      return up + down;
  }
}

export function parseTrafficLimit(limit: string): number {
  if (!limit) return 0;
  const match = limit.match(/^([\d.]+)\s*(B|KB|MB|GB|TB|PB)?$/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = (match[2] ?? "GB").toUpperCase();
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
    PB: 1024 ** 5,
  };
  return value * (units[unit] ?? 1);
}
