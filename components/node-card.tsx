"use client";

import type { ReactNode } from "react";
import { cn, Badge } from "@cloudflare/kumo";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowsDownUpIcon,
} from "@phosphor-icons/react";
import { Cpu, MemoryStick, ReplaceAll, HardDrive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UsageBar } from "@/components/ui/indicators";
import { RegionFlag } from "@/components/ui/region-flag";
import { OsIcon } from "@/components/ui/os-icon";
import { CircularGauge } from "@/components/ui/circular-gauge";
import { chartColors } from "@/components/charts/chart-theme";
import { useSettings } from "@/components/providers";
import { formatBytes, formatGB, formatPercent, formatSpeed, loadLevel, ratioPercent } from "@/lib/format";
import { parseTrafficLimit, trafficUsedByType } from "@/lib/traffic";
import type { ServerView } from "@/lib/types";

const SPEED_FULL = 100 * 1024 * 1024;
function speedFraction(bytesPerSec: number): number {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return 0;
  return Math.min(1, Math.log10(bytesPerSec + 1) / Math.log10(SPEED_FULL));
}

function MetricRow({
  label,
  percent,
  detail,
  icon,
}: {
  label: string;
  percent: number;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-kumo-subtle flex items-center" title={label}>
          {icon ?? label}
        </span>
        <span className="text-kumo-default text-xs font-semibold tabular-nums">
          {detail ?? formatPercent(percent, 0)}
        </span>
      </div>
      <UsageBar percent={percent} level={loadLevel(percent)} />
    </div>
  );
}

export function NodeCard({
  view,
  onOpen,
}: {
  view: ServerView;
  onOpen: (id: string, origin?: DOMRect) => void;
}) {
  const { t, mode } = useSettings();
  const colors = chartColors(mode);
  const { server, online } = view;

  const cpu = server.cpu ?? 0;
  const memPct = ratioPercent(server.ram_used, server.ram_total);
  const diskPct = ratioPercent(server.disk_used, server.disk_total);
  const swapPct = ratioPercent(server.swap_used, server.swap_total);

  const trafficLimit = parseTrafficLimit(server.traffic_limit);
  const trafficUsed =
    trafficLimit > 0
      ? trafficUsedByType(server.traffic_calc_type, server.net_tx_monthly, server.net_rx_monthly)
      : 0;
  const hasTrafficLimit = trafficLimit > 0;
  const trafficFraction = hasTrafficLimit ? Math.max(0, trafficUsed / trafficLimit) : 0;
  const trafficPercent = trafficFraction * 100;
  const trafficColor =
    trafficPercent >= 100
      ? colors.danger
      : trafficPercent >= 80
        ? colors.warning
        : colors.info;

  const open = (element: HTMLElement) => onOpen(server.id, element.getBoundingClientRect());

  const hasGpu = server.gpu !== null && server.gpu !== undefined && server.gpu > 0;

  return (
    <Card
      variant="raised"
      role="button"
      tabIndex={0}
      onClick={(e) => open(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(e.currentTarget);
        }
      }}
      className={cn(
        "kumo-fade-in flex cursor-pointer flex-col gap-3 p-4 transition-[transform,box-shadow,border-color,opacity] duration-100 ease-out",
        "hover:ring-kumo-line hover:-translate-y-px hover:ring-2",
        "focus-visible:ring-kumo-focus focus-visible:ring-2 focus-visible:outline-none",
        !online && "opacity-65",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="text-kumo-default min-w-0 truncate text-sm font-semibold"
            title={server.name}
          >
            {server.name}
          </span>
          {server.server_group ? (
            <Badge variant="secondary" className="max-w-[6rem] shrink-0 truncate">
              {server.server_group}
            </Badge>
          ) : null}
        </div>
        <div className="text-kumo-subtle flex shrink-0 items-center gap-1.5" title={server.os}>
          <OsIcon os={server.os} size={16} className="shrink-0" />
          {server.region ? <RegionFlag region={server.region} /> : null}
        </div>
      </div>

      {online ? (
        <>
          <div className="space-y-2.5">
            <MetricRow label={t("cpu")} percent={cpu} icon={<Cpu size={14} />} />
            <MetricRow
              label={t("memory")}
              percent={memPct}
              detail={formatPercent(memPct, 0)}
              icon={<MemoryStick size={14} />}
            />
            {server.swap_total > 0 ? (
              <MetricRow
                label={t("swap")}
                percent={swapPct}
                detail={formatPercent(swapPct, 0)}
                icon={<ReplaceAll size={14} />}
              />
            ) : null}
            <MetricRow
              label={t("disk")}
              percent={diskPct}
              detail={formatPercent(diskPct, 0)}
              icon={<HardDrive size={14} />}
            />
          </div>

          <div className="border-kumo-hairline border-t pt-3">
            <div
              className={cn(
                "grid place-items-center gap-2",
                hasTrafficLimit ? "grid-cols-3" : "grid-cols-2",
              )}
            >
              <CircularGauge
                fraction={speedFraction(server.net_out_speed)}
                color={colors.up}
                title={t("upload")}
                center={<ArrowUpIcon size={16} weight="bold" color={colors.up} />}
                caption={formatSpeed(server.net_out_speed)}
              />
              <CircularGauge
                fraction={speedFraction(server.net_in_speed)}
                color={colors.down}
                title={t("download")}
                center={<ArrowDownIcon size={16} weight="bold" color={colors.down} />}
                caption={formatSpeed(server.net_in_speed)}
              />
              {hasTrafficLimit ? (
                <CircularGauge
                  fraction={trafficFraction}
                  color={trafficColor}
                  title={`${t("traffic")}: ${formatBytes(trafficUsed)} / ${formatBytes(trafficLimit)}`}
                  center={<ArrowsDownUpIcon size={15} weight="bold" color={trafficColor} />}
                  caption={formatPercent(trafficPercent, 0)}
                />
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-[7.5rem] flex-col items-center justify-center gap-1 text-center">
          <span className="text-kumo-danger text-sm font-medium">{t("offline")}</span>
          {server.last_updated ? (
            <span className="text-kumo-subtle text-xs">
              {t("lastReport")}:{" "}
              {new Date(server.last_updated).toLocaleTimeString()}
            </span>
          ) : null}
          <OfflineFootprint ramTotal={server.ram_total} diskTotal={server.disk_total} />
        </div>
      )}
    </Card>
  );
}

function OfflineFootprint({
  ramTotal,
  diskTotal,
}: {
  ramTotal: number;
  diskTotal: number;
}) {
  return (
    <span className="text-kumo-inactive mt-1 text-xs tabular-nums">
      {formatGB(ramTotal)} RAM · {formatGB(diskTotal)} disk
    </span>
  );
}
