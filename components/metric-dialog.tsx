"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Dialog, Badge } from "@cloudflare/kumo";
import {
  XIcon,
  ArrowsDownUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@phosphor-icons/react";
import { Cpu, MemoryStick } from "lucide-react";
import { UsageBar } from "@/components/ui/indicators";
import { Segmented } from "@/components/ui/segmented";
import { TimeSeriesChart, type ChartSeries } from "@/components/charts/time-series-chart";
import { chartColors } from "@/components/charts/chart-theme";
import { useSettings } from "@/components/providers";
import type { DashboardStats } from "@/lib/aggregate";
import type { StatsSample } from "@/hooks/useStatsHistory";
import { formatBytes, formatPercent, formatSpeed, loadLevel } from "@/lib/format";

export type MetricKind = "speed" | "cpu" | "memory";
type Range = "1" | "6" | "24";

const METRIC_ICON: Record<MetricKind, ReactNode> = {
  speed: <ArrowsDownUpIcon size={20} className="text-kumo-brand" weight="fill" />,
  cpu: <Cpu size={18} className="text-kumo-brand" />,
  memory: <MemoryStick size={18} className="text-kumo-brand" />,
};

function UpDown({ up, down }: { up: string; down: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
      <span className="inline-flex items-center gap-0.5">
        <ArrowUpIcon size={12} weight="bold" className="text-kumo-info" />
        {up}
      </span>
      <span className="inline-flex items-center gap-0.5">
        <ArrowDownIcon size={12} weight="bold" className="text-kumo-success" />
        {down}
      </span>
    </span>
  );
}

function SummaryStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-kumo-tint min-w-0 rounded-lg px-3 py-2.5">
      <div className="text-kumo-subtle text-[11px] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div className="text-kumo-default mt-1 text-sm font-semibold tabular-nums">
        {children}
      </div>
    </div>
  );
}

function MetricSummary({ metric, stats }: { metric: MetricKind; stats: DashboardStats }) {
  const { t } = useSettings();

  if (metric === "speed") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SummaryStat label={t("networkSpeed")}>
          <UpDown up={formatSpeed(stats.uploadSpeed)} down={formatSpeed(stats.downloadSpeed)} />
        </SummaryStat>
        <SummaryStat label={t("trafficOverview")}>
          <UpDown up={formatBytes(stats.totalUp)} down={formatBytes(stats.totalDown)} />
        </SummaryStat>
      </div>
    );
  }

  const avg = metric === "cpu" ? stats.avgCpu : stats.avgMemory;
  return (
    <div className="bg-kumo-tint rounded-lg px-3 py-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-kumo-subtle text-[11px] font-medium tracking-wide uppercase">
          {t("average")}
        </span>
        <span className="text-kumo-default text-sm font-semibold tabular-nums">
          {formatPercent(avg, 1)}
        </span>
      </div>
      <UsageBar percent={avg} level={loadLevel(avg)} className="mt-2" />
    </div>
  );
}

/**
 * Drill-down dialog for fleet-wide metric trends. Uses in-memory rolling
 * history for the live view, or fetches all server records for historical ranges.
 */
export function MetricDialog({
  metric,
  stats,
  history,
  onOpenChange,
}: {
  metric: MetricKind | null;
  stats: DashboardStats;
  history: StatsSample[];
  onOpenChange: (open: boolean) => void;
}) {
  const { t, mode } = useSettings();

  const samples = history;

  const series = useMemo<ChartSeries[]>(() => {
    if (!metric) return [];
    const colors = chartColors(mode);
    if (metric === "speed") {
      return [
        { name: t("upload"), color: colors.up, data: samples.map((s) => [s.t, s.uploadSpeed]) },
        { name: t("download"), color: colors.down, data: samples.map((s) => [s.t, s.downloadSpeed]) },
      ];
    }
    return [
      {
        name: metric === "cpu" ? t("cpu") : t("memory"),
        color: colors.brand,
        area: true,
        data: samples.map((s) => [s.t, metric === "cpu" ? s.avgCpu : s.avgMemory]),
      },
    ];
  }, [metric, samples, mode, t]);

  const title = metric === "speed" ? t("networkSpeed") : metric === "cpu" ? t("cpu") : t("memory");
  const isSpeed = metric === "speed";
  const hasChart = samples.length > 1;

  return (
    <Dialog.Root open={metric !== null} onOpenChange={onOpenChange}>
      <Dialog size="base" className="kumo-dialog-surface w-full max-w-lg p-0">
        {metric ? (
          <div className="flex max-h-[85vh] flex-col">
            <div className="border-kumo-hairline flex items-center justify-between gap-3 border-b px-5 py-4">
              <Dialog.Title className="text-kumo-default flex items-center gap-2 text-base font-semibold">
                {METRIC_ICON[metric]}
                {title}
                <Badge variant="secondary">{stats.online}</Badge>
              </Dialog.Title>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label={t("close")}
                className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-tint shrink-0 rounded-md p-1.5 transition-[color,background-color] duration-100"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-5">
              <MetricSummary metric={metric} stats={stats} />

              {hasChart ? (
                <TimeSeriesChart
                  series={series}
                  mode={mode}
                  yMax={isSpeed ? undefined : 100}
                  valueFormatter={
                    isSpeed ? (v) => formatSpeed(v, 0) : (v) => `${Math.round(v)}%`
                  }
                />
              ) : (
                <div className="text-kumo-inactive flex h-[180px] items-center justify-center text-sm">
                  {t("loading")}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Dialog>
    </Dialog.Root>
  );
}
