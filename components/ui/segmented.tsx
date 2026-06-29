"use client";

import { cn } from "@cloudflare/kumo";
import type { ReactNode } from "react";

export interface SegOption<T extends string | number> {
  value: T;
  label: ReactNode;
  title?: string;
}

/** Compact segmented control built from kumo tokens (used for settings + view toggle). */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  size = "base",
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegOption<T>[];
  size?: "sm" | "base";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "kumo-segmented bg-kumo-recessed inline-flex gap-0.5 rounded-lg p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-[color,background-color,box-shadow] duration-100 ease-out",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
              active
                ? "bg-kumo-base text-kumo-default shadow-sm"
                : "text-kumo-subtle hover:text-kumo-default",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
