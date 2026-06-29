"use client";

import { cn } from "@cloudflare/kumo";
import { forwardRef, type HTMLAttributes } from "react";

export type CardVariant = "flat" | "raised";

const VARIANT_CLASSES: Record<CardVariant, string> = {
  flat: "bg-kumo-base border-kumo-hairline border",
  raised: "bg-kumo-base border-kumo-hairline border shadow-sm",
};

/**
 * Minimal card container built from kumo surface tokens.
 * (Kumo's `Surface` is deprecated and `LayerCard` is heavier than we need here.)
 */
export const Card = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }
>(({ variant = "flat", className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("kumo-surface rounded-xl", VARIANT_CLASSES[variant], className)}
    {...props}
  />
));

Card.displayName = "Card";
