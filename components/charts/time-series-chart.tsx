"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "./echart";
import { chartColors, withAlpha } from "./chart-theme";
import type { Mode } from "@/components/providers";

export interface ChartSeries {
  name: string;
  color: string;
  data: [number, number][];
  area?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function uniqueSeriesData(data: [number, number][]): [number, number][] {
  return [...new Map(data.map((point) => [point[0], point])).values()];
}

export function TimeSeriesChart({
  series,
  mode,
  height = 220,
  yMax,
  yMin = 0,
  valueFormatter = (v) => String(Math.round(v)),
}: {
  series: ChartSeries[];
  mode: Mode;
  height?: number;
  yMax?: number;
  yMin?: number;
  valueFormatter?: (value: number) => string;
}) {
  const colors = chartColors(mode);

  const option = useMemo<EChartsOption>(() => {
    return {
      animation: false,
      grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: mode === "dark" ? "#1c1c1f" : "#ffffff",
        borderColor: colors.split,
        borderWidth: 1,
        textStyle: { color: colors.text, fontSize: 12 },
        formatter: (params: unknown) => {
          const rawItems = params as Array<{
            seriesIndex?: number;
            seriesName: string;
            value: [number, number];
            color: string;
          }>;
          const items = [...new Map(
            rawItems.map((it) => [`${it.seriesIndex ?? it.seriesName}`, it]),
          ).values()];
          if (!items.length) return "";
          const date = new Date(items[0].value[0]);
          const time = date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const rows = items
            .map(
              (it) =>
                `<div style="display:flex;align-items:center;gap:6px;margin-top:2px">
                   <span style="width:8px;height:8px;border-radius:9999px;background:${it.color}"></span>
                   <span style="flex:1">${escapeHtml(it.seriesName)}</span>
                   <span style="font-variant-numeric:tabular-nums;font-weight:600">${valueFormatter(it.value[1])}</span>
                 </div>`,
            )
            .join("");
          return `<div style="font-size:12px;min-width:140px"><div style="opacity:0.6;margin-bottom:2px">${time}</div>${rows}</div>`;
        },
      },
      xAxis: {
        type: "time",
        axisLine: { lineStyle: { color: colors.axis } },
        axisLabel: {
          color: colors.text,
          fontSize: 11,
          hideOverlap: true,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: yMin,
        max: yMax,
        axisLabel: {
          color: colors.text,
          fontSize: 11,
          formatter: (v: number) => valueFormatter(v),
        },
        splitLine: { lineStyle: { color: colors.split } },
      },
      series: series.map((s) => ({
        name: s.name,
        type: "line",
        smooth: true,
        showSymbol: false,
        sampling: "lttb",
        lineStyle: { width: 2, color: s.color },
        itemStyle: { color: s.color },
        areaStyle: s.area
          ? {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: withAlpha(s.color, 0.22) },
                  { offset: 1, color: withAlpha(s.color, 0) },
                ],
              },
            }
          : undefined,
        data: uniqueSeriesData(s.data),
      })),
    };
  }, [series, colors, mode, yMax, yMin, valueFormatter]);

  return <EChart option={option} height={height} />;
}
