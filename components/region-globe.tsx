"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Globe } from "cobe";
import { useSettings } from "@/components/providers";
import {
  loadWorldCountries,
  NINE_DASH_LINE,
  type CountryFeature,
  type MultiPolygon,
  type Polygon,
  type Position,
} from "@/lib/countries";

export interface GlobeMarker {
  /** [latitude, longitude] */
  location: [number, number];
  size: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  front: boolean;
}

function latLonToVector(lat: number, lon: number) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return {
    x: cosLat * Math.cos(lonRad),
    y: Math.sin(latRad),
    z: -cosLat * Math.sin(lonRad),
  };
}

function projectPoint([lon, lat]: Position, phi: number, theta: number): ProjectedPoint {
  const point = latLonToVector(lat, lon);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const x = cosPhi * point.x + sinPhi * point.z;
  const y = sinPhi * sinTheta * point.x + cosTheta * point.y - cosPhi * sinTheta * point.z;
  const z = -sinPhi * cosTheta * point.x + sinTheta * point.y + cosPhi * cosTheta * point.z;

  return {
    x: 50 + x * 40,
    y: 50 - y * 40,
    front: z >= -0.02 || x * x + y * y >= 0.64,
  };
}

function ringToPath(ring: Position[], phi: number, theta: number) {
  let path = "";
  let open = false;
  let last: ProjectedPoint | null = null;
  let segmentPoints = 0;

  for (const coord of ring) {
    const point = projectPoint(coord, phi, theta);
    const tooFar =
      last && Math.hypot(point.x - last.x, point.y - last.y) > 32;

    if (!point.front || tooFar) {
      open = false;
      last = point.front ? point : null;
      segmentPoints = 0;
      continue;
    }

    if (!open) {
      path += `M ${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
      open = true;
      segmentPoints = 1;
    } else {
      path += `L ${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
      segmentPoints += 1;
    }

    last = point;
  }

  return segmentPoints > 1 ? path : "";
}

function countryToPath(country: CountryFeature, phi: number, theta: number) {
  if (!country.geometry) return "";
  const polygons =
    country.geometry.type === "Polygon"
      ? [country.geometry.coordinates as Polygon]
      : (country.geometry.coordinates as MultiPolygon);

  return polygons
    .flatMap((polygon) => polygon.map((ring) => ringToPath(ring, phi, theta)))
    .join(" ");
}

function CountryHighlights({
  countryCodes,
  dark,
  phi,
}: {
  countryCodes: string[];
  dark: boolean;
  phi: number;
}) {
  const [countriesByCode, setCountriesByCode] = useState<Map<string, CountryFeature[]> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void loadWorldCountries().then((world) => {
      if (!cancelled) setCountriesByCode(world.byCode);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const paths = useMemo(() => {
    if (!countriesByCode) return [];
    const codes = new Set(countryCodes);
    const out: string[] = [];
    for (const code of codes) {
      const countries = countriesByCode.get(code);
      if (!countries) continue;
      for (const country of countries) {
        const path = countryToPath(country, phi, 0.25);
        if (path) out.push(path);
      }
    }
    return out;
  }, [countriesByCode, countryCodes, phi]);

  if (paths.length === 0) return null;

  const dashPath = ringToPath(NINE_DASH_LINE, phi, 0.25);

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-95"
      style={{ mixBlendMode: dark ? "screen" : "multiply" }}
    >
      <defs>
        <clipPath id="region-globe-disc">
          <circle cx="50" cy="50" r="40" />
        </clipPath>
      </defs>
      <g clipPath="url(#region-globe-disc)">
        {paths.map((path, i) => (
          <path
            key={`${i}-${path.slice(0, 24)}`}
            d={path}
            fill={dark ? "rgba(255, 160, 72, 0.24)" : "rgba(245, 132, 35, 0.30)"}
            stroke={dark ? "rgba(255, 190, 102, 0.36)" : "rgba(191, 91, 16, 0.36)"}
            strokeWidth="0.28"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {dashPath && (
          <path
            d={dashPath}
            fill="none"
            stroke={dark ? "rgba(255, 190, 102, 0.6)" : "rgba(191, 91, 16, 0.6)"}
            strokeWidth="0.3"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="1.5 0.8"
          />
        )}
      </g>
    </svg>
  );
}

/**
 * A small WebGL globe (cobe) that auto-rotates and can be dragged to spin,
 * with glowing markers at the countries that have nodes. cobe is imported
 * lazily inside the effect so it never runs during SSR. cobe v2 is driven by
 * calling `globe.update()` each frame (there is no `onRender` callback).
 */
export function RegionGlobe({
  markers,
  countryCodes,
}: {
  markers: GlobeMarker[];
  countryCodes: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerMovement = useRef(0);
  const [highlightPhi, setHighlightPhi] = useState(0);
  const { mode } = useSettings();
  const dark = mode === "dark";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let globe: Globe | undefined;
    let raf = 0;
    let cancelled = false;
    let phi = 0;
    let frame = 0;
    let width = canvas.offsetWidth || 360;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1);

    const ro = new ResizeObserver(() => {
      width = canvas.offsetWidth || width;
    });
    ro.observe(canvas);

    void import("cobe").then(({ default: createGlobe }) => {
      if (cancelled || !canvas) return;
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width: width * dpr,
        height: width * dpr,
        phi: 0,
        theta: 0.25,
        dark: dark ? 1 : 0,
        diffuse: 1.8,
        mapSamples: 16000,
        mapBrightness: dark ? 6 : 9.5,
        baseColor: dark ? [0.32, 0.37, 0.47] : [0.62, 0.67, 0.74],
        markerColor: [1.0, 0.6, 0.2],
        glowColor: dark ? [0.2, 0.25, 0.35] : [0.95, 0.85, 0.7],
        markers,
      });

      const tick = () => {
        if (cancelled || !globe) return;
        if (pointerInteracting.current === null) phi += 0.004;
        const nextPhi = phi + pointerMovement.current / 200;
        globe.update({
          phi: nextPhi,
          width: width * dpr,
          height: width * dpr,
        });
        frame += 1;
        if (frame % 3 === 0 || pointerInteracting.current !== null) {
          setHighlightPhi(nextPhi);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      requestAnimationFrame(() => {
        if (!cancelled && canvas) canvas.style.opacity = "1";
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (globe) {
        try {
          globe.destroy();
        } catch (e) {
          // Ignore destroy errors during unmount
        }
      }
    };
  }, [markers, dark]);

  return (
    <div className="relative h-full w-full" style={{ contain: "layout paint size" }}>
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab opacity-0 transition-opacity duration-200"
        style={{ aspectRatio: "1" }}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX - pointerMovement.current;
          if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = "grab";
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = "grab";
        }}
        onPointerMove={(e) => {
          if (pointerInteracting.current !== null) {
            pointerMovement.current = e.clientX - pointerInteracting.current;
          }
        }}
      />
      <CountryHighlights countryCodes={countryCodes} dark={dark} phi={highlightPhi} />
    </div>
  );
}
