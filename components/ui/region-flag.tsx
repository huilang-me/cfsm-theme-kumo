"use client";

import { useState } from "react";
import { cn } from "@cloudflare/kumo";
import { regionToCode } from "@/lib/region";

export function RegionFlag({
  region,
  className,
}: {
  region: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!region) return null;

  const code = regionToCode(region);
  if (!code || failed) {
    return (
      <span className={cn("text-kumo-subtle text-xs", className)} title={region}>
        {region}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt={code.toUpperCase()}
      title={code.toUpperCase()}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn(
        "inline-block h-3.5 w-[1.4rem] shrink-0 rounded-[2px] object-cover ring-1 ring-black/10",
        className,
      )}
    />
  );
}
