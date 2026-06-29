"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@cloudflare/kumo";
import {
  PulseIcon,
  GlobeIcon,
  ArrowsDownUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@phosphor-icons/react";
import { Cpu, MemoryStick } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UsageBar } from "@/components/ui/indicators";
import { RegionDialog } from "@/components/region-dialog";
import { MetricDialog, type MetricKind } from "@/components/metric-dialog";
import { useSettings } from "@/components/providers";
import type { DashboardStats } from "@/lib/aggregate";
import type { StatsSample } from "@/hooks/useStatsHistory";
import type { ServerView } from "@/lib/types";
import { formatPercent, formatSpeed, loadLevel } from "@/lib/format";

function StatTile({
  icon,
  label,
  children,
  onClick,
  bar,
  wrap,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  onClick?: () => void;
  bar?: number;
  wrap?: boolean;
}) {
  return (
    <Card
      variant="flat"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "flex min-w-0 items-center gap-3 p-3.5",
        onClick &&
          "hover:border-kumo-line hover:bg-kumo-tint focus-visible:ring-kumo-focus cursor-pointer transition-[background-color,border-color,box-shadow] duration-100 focus-visible:ring-2 focus-visible:outline-none",
      )}
    >
      <div className="bg-kumo-tint text-kumo-subtle flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-kumo-subtle truncate text-xs">{label}</div>
        <div
          className={cn(
            "text-kumo-default min-w-0 font-semibold tabular-nums",
            wrap ? "text-xs leading-tight" : "truncate text-sm",
          )}
        >
          {children}
        </div>
        {bar !== undefined ? (
          <UsageBar percent={bar} level={loadLevel(bar)} className="mt-1.5" />
        ) : null}
      </div>
    </Card>
  );
}

function UpDown({ up, down }: { up: string; down: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
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

export function StatsBar({
  stats,
  views,
  history,
}: {
  stats: DashboardStats;
  views: ServerView[];
  history: StatsSample[];
}) {
  const { t } = useSettings();
  const [regionOpen, setRegionOpen] = useState(false);
  const [metric, setMetric] = useState<MetricKind | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={<PulseIcon size={18} />} label={t("online")}>
          <span className="text-kumo-success">{stats.online}</span>
          <span className="text-kumo-subtle"> / {stats.total}</span>
        </StatTile>
        <StatTile
          icon={<GlobeIcon size={18} />}
          label={t("regions")}
          onClick={() => setRegionOpen(true)}
        >
          {stats.regions}
        </StatTile>
        <StatTile
          icon={<ArrowsDownUpIcon size={18} />}
          label={t("networkSpeed")}
          onClick={() => setMetric("speed")}
          wrap
        >
          <UpDown up={formatSpeed(stats.uploadSpeed)} down={formatSpeed(stats.downloadSpeed)} />
        </StatTile>
        <StatTile
          icon={<Cpu size={18} />}
          label={t("cpu")}
          onClick={() => setMetric("cpu")}
          bar={stats.avgCpu}
        >
          {formatPercent(stats.avgCpu, 1)}
        </StatTile>
        <StatTile
          icon={<MemoryStick size={18} />}
          label={t("memory")}
          onClick={() => setMetric("memory")}
          bar={stats.avgMemory}
        >
          {formatPercent(stats.avgMemory, 1)}
        </StatTile>
      </div>
      <RegionDialog views={views} open={regionOpen} onOpenChange={setRegionOpen} />
      <MetricDialog
        metric={metric}
        stats={stats}
        history={history}
        onOpenChange={(open) => {
          if (!open) setMetric(null);
        }}
      />
    </>
  );
}
