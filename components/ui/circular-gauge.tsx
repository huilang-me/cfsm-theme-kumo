"use client";

import type { ReactNode } from "react";

interface CircularGaugeProps {
  /** Fill fraction, 0..1 (clamped). */
  fraction: number;
  /** Progress-arc color (a concrete value, since SVG strokes can't resolve light-dark() tokens). */
  color: string;
  /** Outer diameter in px. */
  size?: number;
  /** Ring stroke width in px. */
  thickness?: number;
  /** Centered content (icon or short text). */
  center?: ReactNode;
  /** Caption rendered beneath the ring. */
  caption?: ReactNode;
  /** Native tooltip / a11y label. */
  title?: string;
}

/**
 * A small circular progress gauge. The track uses the kumo `recessed` surface
 * (same as UsageBar) so it adapts to light/dark automatically.
 */
export function CircularGauge({
  fraction,
  color,
  size = 46,
  thickness = 4,
  center,
  caption,
  title,
}: CircularGaugeProps) {
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const offset = circ * (1 - f);
  const mid = size / 2;

  return (
    <div className="flex flex-col items-center gap-1" title={title}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={mid}
            cy={mid}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            style={{ stroke: "var(--color-kumo-recessed)" }}
          />
          <circle
            cx={mid}
            cy={mid}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.18s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">{center}</div>
      </div>
      {caption != null ? (
        <span className="text-kumo-subtle text-[10px] leading-none font-medium tabular-nums">
          {caption}
        </span>
      ) : null}
    </div>
  );
}
