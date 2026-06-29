"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlusIcon, MinusIcon, ArrowsInIcon } from "@phosphor-icons/react";
import {
  loadWorldCountries,
  NINE_DASH_LINE,
  type CountryFeature,
  type Position,
  type WorldCountries,
} from "@/lib/countries";
import { useSettings } from "@/components/providers";

export interface FlatMapMarker {
  /** [latitude, longitude] */
  location: [number, number];
  size: number;
}

/** Equirectangular viewBox: longitude 0..360, latitude 0..180. */
const VB_W = 360;
const VB_H = 180;
const MAX_SCALE = 12;
const WHEEL_SENSITIVITY = 0.0015;

/** Equirectangular projection of [lon, lat] into the 0..360 × 0..180 viewBox. */
function project([lon, lat]: Position): { x: number; y: number } {
  return { x: lon + 180, y: 90 - lat };
}

function ringToPath(ring: Position[]): string {
  let path = "";
  let last: { x: number; y: number } | null = null;
  let started = false;

  for (const coord of ring) {
    const point = project(coord);
    // Break the path when a segment wraps across the antimeridian so we don't
    // draw a long horizontal streak across the whole map.
    const wraps = last !== null && Math.abs(point.x - last.x) > 180;
    if (!started || wraps) {
      path += `M ${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
      started = true;
    } else {
      path += `L ${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
    }
    last = point;
  }

  return path;
}

function countryToPath(country: CountryFeature): string {
  if (!country.geometry) return "";
  const polygons =
    country.geometry.type === "Polygon"
      ? [country.geometry.coordinates as Position[][]]
      : (country.geometry.coordinates as Position[][][]);

  return polygons
    .flatMap((polygon) => polygon.map((ring) => ringToPath(ring)))
    .join(" ");
}

// --- Pan / zoom -------------------------------------------------------------

interface View {
  x: number;
  y: number;
  scale: number;
}

const INITIAL_VIEW: View = { x: 0, y: 0, scale: 1 };

/** Clamp scale to [1, MAX] and keep the viewBox inside the world bounds. */
function clampView({ x, y, scale }: View): View {
  const s = Math.min(MAX_SCALE, Math.max(1, scale));
  const w = VB_W / s;
  const h = VB_H / s;
  return {
    scale: s,
    x: Math.min(VB_W - w, Math.max(0, x)),
    y: Math.min(VB_H - h, Math.max(0, y)),
  };
}

/** Zoom to `nextScale` while keeping the viewBox-space `focal` point fixed. */
function zoomAt(view: View, nextScale: number, focal: { x: number; y: number }): View {
  const s = Math.min(MAX_SCALE, Math.max(1, nextScale));
  const tx = (focal.x - view.x) / (VB_W / view.scale);
  const ty = (focal.y - view.y) / (VB_H / view.scale);
  return clampView({ scale: s, x: focal.x - tx * (VB_W / s), y: focal.y - ty * (VB_H / s) });
}

/** Map client (screen) coordinates to viewBox coordinates. */
function clientToView(view: View, rect: DOMRect, clientX: number, clientY: number) {
  return {
    x: view.x + ((clientX - rect.left) / rect.width) * (VB_W / view.scale),
    y: view.y + ((clientY - rect.top) / rect.height) * (VB_H / view.scale),
  };
}

function usePanZoom() {
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef(0);
  const [view, setView] = useState<View>(INITIAL_VIEW);

  // Native non-passive wheel listener so we can preventDefault the page scroll.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      setView((prev) =>
        zoomAt(prev, prev.scale * Math.exp(-e.deltaY * WHEEL_SENSITIVITY), clientToView(prev, rect, e.clientX, e.clientY)),
      );
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    svgRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const prevPt = pointers.current.get(e.pointerId);
    if (!svg || !prevPt) return;
    const rect = svg.getBoundingClientRect();
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);

    if (pointers.current.size >= 2) {
      // Pinch: zoom around the midpoint by the change in finger distance.
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current > 0 && dist > 0) {
        const factor = dist / pinchDist.current;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        setView((prev) => zoomAt(prev, prev.scale * factor, clientToView(prev, rect, mid.x, mid.y)));
      }
      pinchDist.current = dist;
      return;
    }

    // Single pointer: pan by the screen delta translated into viewBox units.
    const dx = cur.x - prevPt.x;
    const dy = cur.y - prevPt.y;
    setView((prev) =>
      clampView({
        scale: prev.scale,
        x: prev.x - (dx / rect.width) * (VB_W / prev.scale),
        y: prev.y - (dy / rect.height) * (VB_H / prev.scale),
      }),
    );
  };

  const onPointerEnd = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = 0;
    if (svgRef.current?.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const zoomByCenter = (factor: number) =>
    setView((prev) =>
      zoomAt(prev, prev.scale * factor, {
        x: prev.x + VB_W / prev.scale / 2,
        y: prev.y + VB_H / prev.scale / 2,
      }),
    );

  return {
    svgRef,
    view,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
    zoomIn: () => zoomByCenter(1.6),
    zoomOut: () => zoomByCenter(1 / 1.6),
    reset: () => setView(INITIAL_VIEW),
  };
}

// --- Component --------------------------------------------------------------

/**
 * A flat (equirectangular) world map drawn as SVG, sharing the globe's palette:
 * a muted land base with node-bearing countries highlighted in the brand orange
 * and glowing markers sized by node count. Supports wheel / pinch zoom and drag
 * to pan via viewBox manipulation, with on-screen zoom controls.
 */
export function RegionFlatMap({
  markers,
  countryCodes,
}: {
  markers: FlatMapMarker[];
  countryCodes: string[];
}) {
  const { mode, t } = useSettings();
  const dark = mode === "dark";
  const [world, setWorld] = useState<WorldCountries | null>(null);
  const { svgRef, view, handlers, zoomIn, zoomOut, reset } = usePanZoom();

  useEffect(() => {
    let cancelled = false;
    void loadWorldCountries().then((w) => {
      if (!cancelled) setWorld(w);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Base map is independent of the highlighted set, so it's only recomputed
  // when the world geometry loads — not on every poll that shifts node counts.
  const basePaths = useMemo(() => {
    if (!world) return null;
    const out: string[] = [];
    for (const country of world.features) {
      const path = countryToPath(country);
      if (path) out.push(path);
    }
    return out;
  }, [world]);

  const highlightPaths = useMemo(() => {
    if (!world) return [];
    const out: string[] = [];
    for (const code of new Set(countryCodes)) {
      const list = world.byCode.get(code);
      if (!list) continue;
      for (const country of list) {
        const path = countryToPath(country);
        if (path) out.push(path);
      }
    }
    return out;
  }, [world, countryCodes]);

  const dots = useMemo(
    () =>
      markers.map((m) => {
        const { x, y } = project([m.location[1], m.location[0]]);
        return { x, y, r: 0.8 + m.size * 18 };
      }),
    [markers],
  );

  const baseFill = dark ? "rgba(120, 134, 158, 0.22)" : "rgba(150, 162, 180, 0.30)";
  const baseStroke = dark ? "rgba(150, 165, 190, 0.18)" : "rgba(120, 135, 160, 0.22)";
  const hlFill = dark ? "rgba(255, 160, 72, 0.30)" : "rgba(245, 132, 35, 0.32)";
  const hlStroke = dark ? "rgba(255, 190, 102, 0.55)" : "rgba(191, 91, 16, 0.50)";
  const dotCore = dark ? "rgba(255, 178, 96, 1)" : "rgba(232, 110, 18, 1)";

  const zoomed = view.scale > 1;

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${VB_W / view.scale} ${VB_H / view.scale}`}
        preserveAspectRatio="xMidYMid meet"
        className={`h-full w-full touch-none opacity-0 transition-opacity duration-200 ${
          zoomed ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        style={basePaths ? { opacity: 1 } : undefined}
        aria-hidden
        {...handlers}
      >
        <defs>
          <radialGradient id="flat-map-dot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={dotCore} stopOpacity="0.95" />
            <stop offset="55%" stopColor={dotCore} stopOpacity="0.5" />
            <stop offset="100%" stopColor={dotCore} stopOpacity="0" />
          </radialGradient>
        </defs>

        {basePaths?.map((d, i) => (
          <path
            key={`base-${i}`}
            d={d}
            fill={baseFill}
            stroke={baseStroke}
            strokeWidth="0.18"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {highlightPaths.map((d, i) => (
          <path
            key={`hl-${i}`}
            d={d}
            fill={hlFill}
            stroke={hlStroke}
            strokeWidth="0.35"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {dots.map((dot, i) => (
          <g key={`dot-${i}`}>
            <circle cx={dot.x} cy={dot.y} r={dot.r * 2.2} fill="url(#flat-map-dot)" />
            <circle cx={dot.x} cy={dot.y} r={dot.r * 0.6} fill={dotCore} />
          </g>
        ))}

        <path
          d={NINE_DASH_LINE.map((p, i) => {
            const { x, y } = project(p);
            return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
          }).join(" ")}
          fill="none"
          stroke={dark ? "rgba(255, 190, 102, 0.6)" : "rgba(191, 91, 16, 0.6)"}
          strokeWidth="0.3"
          strokeDasharray="1.5 0.8"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        <ZoomButton label={t("zoomIn")} onClick={zoomIn} disabled={view.scale >= MAX_SCALE}>
          <PlusIcon size={14} weight="bold" />
        </ZoomButton>
        <ZoomButton label={t("zoomOut")} onClick={zoomOut} disabled={!zoomed}>
          <MinusIcon size={14} weight="bold" />
        </ZoomButton>
        <ZoomButton label={t("resetView")} onClick={reset} disabled={!zoomed}>
          <ArrowsInIcon size={14} weight="bold" />
        </ZoomButton>
      </div>
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="bg-kumo-base/85 text-kumo-subtle hover:text-kumo-default border-kumo-hairline flex h-7 w-7 items-center justify-center rounded-md border shadow-sm backdrop-blur transition-colors duration-100 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
