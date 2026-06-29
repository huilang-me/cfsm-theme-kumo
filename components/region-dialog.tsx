"use client";

import { useMemo, useState, useEffect } from "react";
import { Dialog, Badge } from "@cloudflare/kumo";
import { XIcon, GlobeIcon, MapTrifoldIcon } from "@phosphor-icons/react";
import { RegionGlobe, type GlobeMarker } from "@/components/region-globe";
import { RegionFlatMap, type FlatMapMarker } from "@/components/region-flat-map";
import { Segmented } from "@/components/ui/segmented";
import { RegionFlag } from "@/components/ui/region-flag";
import { useSettings } from "@/components/providers";
import { regionToCode, regionName, COUNTRY_COORDS } from "@/lib/region";
import type { ServerView } from "@/lib/types";

type RegionViewMode = "globe" | "map";

interface RegionEntry {
  region: string;
  code: string | null;
  count: number;
}

export function RegionDialog({
  views,
  open,
  onOpenChange,
}: {
  views: ServerView[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useSettings();
  const [shouldRenderViz, setShouldRenderViz] = useState(false);
  const [viewMode, setViewMode] = useState<RegionViewMode>("globe");

  useEffect(() => {
    if (open) {
      setShouldRenderViz(true);
    } else {
      const timer = setTimeout(() => setShouldRenderViz(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const regions = useMemo<RegionEntry[]>(() => {
    const map = new Map<string, RegionEntry>();
    for (const v of views) {
      const region = v.server.region;
      if (!region) continue;
      const code = regionToCode(region);
      const key = code ?? region;
      const entry = map.get(key);
      if (entry) entry.count += 1;
      else map.set(key, { region, code, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [views]);

  const markerSig = regions.map((r) => `${r.code ?? "?"}:${r.count}`).join("|");
  const markers = useMemo<GlobeMarker[]>(() => {
    const out: GlobeMarker[] = [];
    for (const r of regions) {
      const coord = r.code ? COUNTRY_COORDS[r.code] : undefined;
      if (!coord) continue;
      out.push({ location: coord, size: 0.04 + Math.min(r.count, 8) * 0.008 });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerSig]);
  const countryCodes = useMemo(
    () => regions.flatMap((r) => (r.code ? [r.code] : [])),
    [regions],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="base" className="kumo-dialog-surface w-full max-w-lg p-0">
        <div className="flex max-h-[85vh] flex-col">
          <div className="border-kumo-hairline flex items-center justify-between gap-3 border-b px-5 py-4">
            <Dialog.Title className="text-kumo-default flex items-center gap-2 text-base font-semibold">
              <GlobeIcon size={20} className="text-kumo-brand" weight="fill" />
              {t("regions")}
              <Badge variant="secondary">{regions.length}</Badge>
            </Dialog.Title>
            <div className="flex items-center gap-2">
              <Segmented<RegionViewMode>
                size="sm"
                value={viewMode}
                onChange={setViewMode}
                options={[
                  {
                    value: "globe",
                    title: t("globeView"),
                    label: (
                      <>
                        <GlobeIcon size={14} weight="bold" />
                        <span className="hidden sm:inline">{t("globeView")}</span>
                      </>
                    ),
                  },
                  {
                    value: "map",
                    title: t("mapView"),
                    label: (
                      <>
                        <MapTrifoldIcon size={14} weight="bold" />
                        <span className="hidden sm:inline">{t("mapView")}</span>
                      </>
                    ),
                  },
                ]}
              />
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label={t("close")}
                className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-tint shrink-0 rounded-md p-1.5 transition-[color,background-color] duration-100"
              >
                <XIcon size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto px-5 py-5">
            {viewMode === "globe" ? (
              <div className="mx-auto aspect-square w-full max-w-[340px]">
                {shouldRenderViz ? (
                  <RegionGlobe markers={markers} countryCodes={countryCodes} />
                ) : null}
              </div>
            ) : (
              <div className="bg-kumo-tint mx-auto aspect-[2/1] w-full overflow-hidden rounded-xl">
                {shouldRenderViz ? (
                  <RegionFlatMap markers={markers} countryCodes={countryCodes} />
                ) : null}
              </div>
            )}

            {regions.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {regions.map((r) => (
                  <div
                    key={r.code ?? r.region}
                    className="bg-kumo-tint flex items-center gap-2 rounded-lg px-3 py-2"
                  >
                    <RegionFlag region={r.region} />
                    <span className="text-kumo-default min-w-0 flex-1 truncate text-xs font-medium">
                      {r.code ? regionName(r.code, lang) : r.region}
                    </span>
                    <span className="text-kumo-subtle text-xs font-semibold tabular-nums">
                      {r.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
