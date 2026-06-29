"use client";

import { cn } from "@cloudflare/kumo";
import type { LoadLevel } from "@/lib/format";

/** Live status dot with a soft ping halo when online. */
export function StatusDot({
  online,
  className,
}: {
  online: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex h-2.5 w-2.5 shrink-0", className)}>
      {online ? (
        <span className="bg-kumo-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
      ) : null}
      <span
        className={cn(
          "relative inline-flex h-2.5 w-2.5 rounded-full",
          online ? "bg-kumo-success" : "bg-kumo-danger",
        )}
      />
    </span>
  );
}

const FILL_BY_LEVEL: Record<LoadLevel, string> = {
  low: "bg-kumo-success",
  mid: "bg-kumo-info",
  high: "bg-kumo-warning",
  critical: "bg-kumo-danger",
};

/** Slim usage bar coloured by load level. `percent` is 0-100. */
export function UsageBar({
  percent,
  level,
  className,
}: {
  percent: number;
  level: LoadLevel;
  className?: string;
}) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div
      className={cn(
        "bg-kumo-recessed h-1.5 w-full overflow-hidden rounded-full",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-150 ease-out",
          FILL_BY_LEVEL[level],
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
