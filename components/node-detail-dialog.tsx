"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Dialog, Badge, Button, cn } from "@cloudflare/kumo";
import { XIcon } from "@phosphor-icons/react";
import {
  Cpu,
  MemoryStick,
  ReplaceAll,
  HardDrive,
  ArrowDownUp,
  Network,
  ListTree,
  Gauge,
  Thermometer,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/indicators";
import { RegionFlag } from "@/components/ui/region-flag";
import { OsIcon } from "@/components/ui/os-icon";
import { Segmented } from "@/components/ui/segmented";
import { TimeSeriesChart, type ChartSeries } from "@/components/charts/time-series-chart";
import { chartColors } from "@/components/charts/chart-theme";
import { useSettings } from "@/components/providers";
import { useServerHistory } from "@/hooks/useCFSM";
import { cfsm } from "@/lib/cfsm";
import type { ServerView, Server } from "@/lib/types";
import { getServerPings as getServerPingsFn } from "@/lib/types";
import {
  formatBytes,
  formatGB,
  formatPercent,
  formatSpeed,
  ratioPercent,
} from "@/lib/format";
import { parseTrafficLimit, trafficUsedByType } from "@/lib/traffic";

type Range = "0.167" | "0.5" | "1" | "6" | "12" | "24";
type MotionPhase = "idle" | "entering" | "open" | "closing";

const DETAIL_MOTION_MS = 110;

function Chip({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="bg-kumo-tint flex flex-col gap-0.5 rounded-lg px-3 py-2">
      <span className="text-kumo-subtle flex items-center gap-1 text-[11px] tracking-wide uppercase">
        {icon}
        {label}
      </span>
      <span className="text-kumo-default text-sm font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
  icon,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <Card variant="flat" className={cn("p-4", className)}>
      <div className="text-kumo-subtle mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        {icon}
        {title}
      </div>
      {children}
    </Card>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  if (!value) return null;
  return (
    <div className="border-kumo-hairline flex items-start justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-kumo-subtle flex shrink-0 items-center gap-1.5 text-xs">
        {icon}
        {label}
      </span>
      <span className="text-kumo-default text-right text-xs font-medium break-all">
        {value}
      </span>
    </div>
  );
}

function NoData({ label }: { label: string }) {
  return (
    <div className="text-kumo-inactive flex h-[180px] items-center justify-center text-sm">
      {label}
    </div>
  );
}

function PingOverview({
  server,
  colors,
}: {
  server: Server;
  colors: ReturnType<typeof chartColors>;
}) {
  const pings = getServerPingsFn(server);
  if (pings.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {pings.map((ping) => {
        const latency = ping.latency;
        const loss = Number(ping.loss ?? 0);
        const color =
          latency === null
            ? colors.text
            : loss >= 50 || latency >= 250
              ? colors.danger
              : loss >= 10 || latency >= 120
                ? colors.warning
                : colors.success;
        return (
          <div
            key={ping.label}
            className="bg-kumo-tint border-kumo-hairline flex min-w-0 flex-col gap-2 rounded-lg border px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="text-kumo-default truncate text-sm font-semibold">
                {ping.label}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
                style={{ color }}
              >
                {latency !== null ? `${Math.round(latency)} ms` : "—"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-kumo-subtle">Loss</div>
                <div className="text-kumo-default font-medium tabular-nums">
                  {loss.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-kumo-subtle">Provider</div>
                <div className="text-kumo-default font-medium">
                  {ping.label}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function NodeDetailDialog({
  view,
  open,
  origin,
  onOpenChange,
  authorized = false,
}: {
  view: ServerView | null;
  open: boolean;
  origin?: DOMRect | null;
  onOpenChange: (open: boolean) => void;
  authorized?: boolean;
}) {
  const { t, mode, lang } = useSettings();
  const [range, setRange] = useState<Range>("0.167");
  const [motionPhase, setMotionPhase] = useState<MotionPhase>("idle");
  const closeTimerRef = useRef<number | null>(null);
  const uuid = view?.server.id;

  useEffect(() => {
    if (!open || !uuid) return;
    let mounted = true;

    async function load() {
      if (!mounted || !uuid) return;
      try {
        const server = await cfsm.getServer(uuid, view?.server.source);
        if (mounted && view) Object.assign(view.server, server);
      } catch {}
    }

    load();

    return () => { mounted = false; };
  }, [open, uuid]);

  const hours = Number(range);
  const needsLogin = hours > 1 && !authorized;
  const historyQuery = useServerHistory(uuid, hours, open && !!uuid && !needsLogin, view?.server.source);
  const colors = chartColors(mode);

  const historyRows = (historyQuery.data as Record<string, unknown>[] | undefined) ?? [];
  const isLoadingHistory = historyQuery.isValidating && historyRows.length === 0;
  const liveRecord: Record<string, unknown> | null = view ? {
    timestamp: view.server.last_updated,
    cpu: view.server.cpu,
    gpu: view.server.gpu,
    ram_total: view.server.ram_total,
    ram_used: view.server.ram_used,
    disk_total: view.server.disk_total,
    disk_used: view.server.disk_used,
    processes: view.server.processes,
    net_in_speed: view.server.net_in_speed,
    net_out_speed: view.server.net_out_speed,
    tcp_conn: view.server.tcp_conn,
    udp_conn: view.server.udp_conn,
    ping_ct: view.server.ping_ct,
    ping_cu: view.server.ping_cu,
    ping_cm: view.server.ping_cm,
    ping_bd: view.server.ping_bd,
    loss_ct: view.server.loss_ct,
    loss_cu: view.server.loss_cu,
    loss_cm: view.server.loss_cm,
    loss_bd: view.server.loss_bd,
    swap_total: view.server.swap_total,
    swap_used: view.server.swap_used,
    load_avg: view.server.load_avg,
  } : null;
  const records = (() => {
    const merged = liveRecord
      ? [...historyRows, liveRecord]
      : historyRows;
    return merged
      .slice()
      .sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));
  })();

  const hasLoad = !isLoadingHistory && records.length > 0;

  const num = (r: Record<string, unknown>, key: string) => Number(r[key]) || 0;

  const cpuRam = useMemo<ChartSeries[]>(() => {
    if (!hasLoad) return [];
    const base: ChartSeries[] = [
      {
        name: t("cpu"),
        color: colors.brand,
        area: true,
        data: records.map((r) => [num(r, "timestamp"), num(r, "cpu")]),
      },
      {
        name: t("memory"),
        color: colors.info,
        area: true,
        data: records.map((r) => [
          num(r, "timestamp"),
          ratioPercent(num(r, "ram_used"), num(r, "ram_total")),
        ]),
      },
    ];
    if ((view?.server.swap_total ?? 0) > 0) {
      base.push({
        name: t("swap"),
        color: colors.success,
        data: records.map((r) => [
          num(r, "timestamp"),
          ratioPercent(num(r, "swap_used"), num(r, "swap_total")),
        ]),
      });
    }
    return base;
  }, [hasLoad, records, colors.brand, colors.info, colors.success, view?.server.swap_total, t]);

  const netSeries = useMemo<ChartSeries[]>(
    () =>
      hasLoad
        ? [
            {
              name: t("upload"),
              color: colors.up,
              data: records.map((r) => [num(r, "timestamp"), num(r, "net_out_speed")]),
            },
            {
              name: t("download"),
              color: colors.down,
              data: records.map((r) => [num(r, "timestamp"), num(r, "net_in_speed")]),
            },
          ]
        : [],
    [hasLoad, records, colors.up, colors.down, t],
  );

  const connSeries = useMemo<ChartSeries[]>(
    () =>
      hasLoad
        ? [
            {
              name: "TCP",
              color: colors.brand,
              area: true,
              data: records.map((r) => [num(r, "timestamp"), num(r, "tcp_conn")]),
            },
            {
              name: "UDP",
              color: colors.info,
              data: records.map((r) => [num(r, "timestamp"), num(r, "udp_conn")]),
            },
          ]
        : [],
    [hasLoad, records, colors.brand, colors.info],
  );

  const procSeries = useMemo<ChartSeries[]>(
    () =>
      hasLoad
        ? [
            {
              name: t("processes"),
              color: colors.success,
              area: true,
              data: records.map((r) => [num(r, "timestamp"), num(r, "processes")]),
            },
          ]
        : [],
    [hasLoad, records, colors.success, t],
  );

  const loadSeries = useMemo<ChartSeries[]>(
    () =>
      hasLoad
        ? records[0]?.load_avg
          ? [
              { name: "1m", color: colors.brand, data: records.map((r) => [num(r, "timestamp"), parseFloat(String(r.load_avg || " ").split(" ")[0]) || 0]) },
              { name: "5m", color: colors.info, data: records.map((r) => [num(r, "timestamp"), parseFloat(String(r.load_avg || " ").split(" ")[1]) || 0]) },
              { name: "15m", color: colors.success, data: records.map((r) => [num(r, "timestamp"), parseFloat(String(r.load_avg || " ").split(" ")[2]) || 0]) },
            ]
          : []
        : [],
    [hasLoad, records, colors.brand, colors.info, colors.success],
  );

  const diskSeries = useMemo<ChartSeries[]>(
    () =>
      hasLoad
        ? [
            {
              name: t("disk"),
              color: colors.warning,
              area: true,
              data: records.map((r) => [
                num(r, "timestamp"),
                ratioPercent(num(r, "disk_used"), num(r, "disk_total")),
              ]),
            },
          ]
        : [],
    [hasLoad, records, colors.warning, t],
  );

  const gpuSeries = useMemo<ChartSeries[]>(
    () =>
      hasLoad && records.some((r) => num(r, "gpu") > 0)
        ? [
            {
              name: t("gpu"),
              color: colors.danger,
              area: true,
              data: records.map((r) => [num(r, "timestamp"), num(r, "gpu")]),
            },
          ]
        : [],
    [hasLoad, records, colors.danger, t],
  );

  const pingSeries = useMemo<ChartSeries[]>(
    () =>
      hasLoad
        ? [
            { name: "CT", color: colors.brand, data: records.map((r) => [num(r, "timestamp"), num(r, "ping_ct") || 0]) },
            { name: "CU", color: colors.info, data: records.map((r) => [num(r, "timestamp"), num(r, "ping_cu") || 0]) },
            { name: "CM", color: colors.success, data: records.map((r) => [num(r, "timestamp"), num(r, "ping_cm") || 0]) },
            { name: "BD", color: colors.warning, data: records.map((r) => [num(r, "timestamp"), num(r, "ping_bd") || 0]) },
          ]
        : [],
    [hasLoad, records, colors.brand, colors.info, colors.success, colors.warning],
  );

  const lossSeries = useMemo<ChartSeries[]>(
    () =>
      hasLoad
        ? [
            { name: "CT", color: colors.brand, data: records.map((r) => [num(r, "timestamp"), num(r, "loss_ct") || 0]) },
            { name: "CU", color: colors.info, data: records.map((r) => [num(r, "timestamp"), num(r, "loss_cu") || 0]) },
            { name: "CM", color: colors.success, data: records.map((r) => [num(r, "timestamp"), num(r, "loss_cm") || 0]) },
            { name: "BD", color: colors.warning, data: records.map((r) => [num(r, "timestamp"), num(r, "loss_bd") || 0]) },
          ]
        : [],
    [hasLoad, records, colors.brand, colors.info, colors.success, colors.warning],
  );

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setMotionPhase("idle");
      return;
    }

    let openFrame = 0;
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMotionPhase("entering");
    openFrame = requestAnimationFrame(() => setMotionPhase("open"));

    return () => {
      cancelAnimationFrame(openFrame);
    };
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      onOpenChange(true);
      return;
    }
    setMotionPhase("closing");
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onOpenChange(false);
    }, DETAIL_MOTION_MS);
  };

  if (!view) return null;
  const { server, online } = view;

  const trafficLimit = parseTrafficLimit(server.traffic_limit);
  const trafficUsed =
    trafficLimit > 0
      ? trafficUsedByType(
          server.traffic_calc_type,
          server.net_tx_monthly ?? 0,
          server.net_rx_monthly ?? 0,
        )
      : 0;
  const trafficPercent = trafficLimit > 0 ? (trafficUsed / trafficLimit) * 100 : 0;
  const trafficRemaining = trafficLimit > 0 ? Math.max(0, trafficLimit - trafficUsed) : 0;
  const trafficColor =
    trafficPercent >= 100
      ? colors.danger
      : trafficPercent >= 80
        ? colors.warning
        : colors.info;

  const chips: { label: string; value: ReactNode; icon: ReactNode }[] = [];
  if (online) {
    if (server.load_avg)
      chips.push({
        label: t("load"),
        value: server.load_avg,
        icon: <Gauge size={12} />,
      });
    if (server.processes > 0)
      chips.push({ label: t("processes"), value: server.processes, icon: <ListTree size={12} /> });
    if (server.tcp_conn > 0 || server.udp_conn > 0)
      chips.push({
        label: t("connections"),
        value: `${server.tcp_conn} / ${server.udp_conn}`,
        icon: <Network size={12} />,
      });
    if (server.swap_total > 0)
      chips.push({
        label: t("swap"),
        value: formatPercent(ratioPercent(server.swap_used, server.swap_total), 0),
        icon: <ReplaceAll size={12} />,
      });
    if (server.gpu !== null && server.gpu !== undefined && server.gpu > 0)
      chips.push({
        label: t("gpu"),
        value: formatPercent(server.gpu, 0),
        icon: <Thermometer size={12} />,
      });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog
        size="xl"
        className={cn(
          "node-detail-motion-panel kumo-dialog-surface w-full max-w-4xl min-w-0! p-0 sm:min-w-[48rem]!",
          motionPhase === "entering" && "node-detail-motion-from",
          motionPhase === "open" && "node-detail-motion-open",
          motionPhase === "closing" && "node-detail-motion-to",
        )}
      >
        <div className="flex max-h-[85vh] flex-col">
          <div className="border-kumo-hairline flex items-center justify-between gap-3 border-b px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <StatusDot online={online} />
              <div className="min-w-0">
                <Dialog.Title className="text-kumo-default flex items-center gap-2 text-base font-semibold">
                  <span className="truncate">{server.name}</span>
                  {server.region ? <RegionFlag region={server.region} /> : null}
                </Dialog.Title>
                <div className="text-kumo-subtle truncate text-xs">{server.cpu_info}</div>
              </div>
              {server.server_group ? <Badge variant="secondary">{server.server_group}</Badge> : null}
              <Badge variant={online ? "primary" : "destructive"}>
                {online ? t("online") : t("offline")}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              aria-label={t("close")}
              className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-tint shrink-0 rounded-md p-1.5 transition-[color,background-color] duration-100"
            >
              <XIcon size={18} />
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto px-6 py-5">
            {chips.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {chips.map((c) => (
                  <Chip key={c.label} label={c.label} value={c.value} icon={c.icon} />
                ))}
              </div>
            ) : null}

            <div className="flex items-center justify-end">
              <Segmented<Range>
                value={range}
                onChange={setRange}
                size="sm"
                options={[
                  { value: "0.167", label: t("range10m") },
                  { value: "0.5", label: t("range30m") },
                  { value: "1", label: t("range1h") },
                  { value: "6", label: t("range6h") },
                  { value: "12", label: t("range12h") },
                  { value: "24", label: t("range24h") },
                ]}
              />
            </div>

            {needsLogin ? (
              <Card variant="flat" className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <div className="text-kumo-subtle text-sm">{t("loginRequired")}</div>
                <Button variant="secondary" size="sm" onClick={() => { window.location.href = "/admin"; }}>
                  {t("login")}
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel
                  title={
                    server.swap_total > 0
                      ? `${t("cpu")} / ${t("memory")} / ${t("swap")}`
                      : `${t("cpu")} / ${t("memory")}`
                  }
                  icon={
                    <span className="flex items-center gap-1">
                      <Cpu size={13} />
                      <MemoryStick size={13} />
                      {server.swap_total > 0 ? <ReplaceAll size={13} /> : null}
                    </span>
                  }
                >
                  {hasLoad ? (
                    <TimeSeriesChart
                      series={cpuRam}
                      mode={mode}
                      yMax={100}
                      valueFormatter={(v) => `${Math.round(v)}%`}
                    />
                  ) : (
                    <NoData label={t("loading")} />
                  )}
                </Panel>
                <Panel title={t("networkSpeed")} icon={<ArrowDownUp size={13} />}>
                  {hasLoad ? (
                    <TimeSeriesChart
                      series={netSeries}
                      mode={mode}
                      valueFormatter={(v) => formatSpeed(v, 0)}
                    />
                  ) : (
                    <NoData label={t("loading")} />
                  )}
                </Panel>
                <Panel title={t("connections")} icon={<Network size={13} />}>
                  {hasLoad ? (
                    <TimeSeriesChart
                      series={connSeries}
                      mode={mode}
                      valueFormatter={(v) => String(Math.round(v))}
                    />
                  ) : (
                    <NoData label={t("loading")} />
                  )}
                </Panel>
                <Panel title={t("processes")} icon={<ListTree size={13} />}>
                  {hasLoad ? (
                    <TimeSeriesChart
                      series={procSeries}
                      mode={mode}
                      valueFormatter={(v) => String(Math.round(v))}
                    />
                  ) : (
                    <NoData label={t("loading")} />
                  )}
                </Panel>
                {loadSeries.length > 0 && (
                  <Panel title={t("load")} icon={<Gauge size={13} />}>
                    <TimeSeriesChart
                      series={loadSeries}
                      mode={mode}
                      valueFormatter={(v) => v.toFixed(2)}
                    />
                  </Panel>
                )}
                <Panel title={t("disk")} icon={<HardDrive size={13} />}>
                  {hasLoad ? (
                    <TimeSeriesChart
                      series={diskSeries}
                      mode={mode}
                      yMax={100}
                      valueFormatter={(v) => `${Math.round(v)}%`}
                    />
                  ) : (
                    <NoData label={t("loading")} />
                  )}
                </Panel>
                {gpuSeries.length > 0 && (
                  <Panel title={t("gpu")} icon={<Thermometer size={13} />}>
                    <TimeSeriesChart
                      series={gpuSeries}
                      mode={mode}
                      yMax={100}
                      valueFormatter={(v) => `${Math.round(v)}%`}
                    />
                  </Panel>
                )}
                <Panel title={t("networkLatency")} icon={<Activity size={13} />}>
                  {hasLoad ? (
                    <TimeSeriesChart
                      series={pingSeries}
                      mode={mode}
                      valueFormatter={(v) => `${Math.round(v)} ms`}
                    />
                  ) : (
                    <NoData label={t("loading")} />
                  )}
                </Panel>
                <Panel title="Loss" icon={<Activity size={13} />}>
                  {hasLoad ? (
                    <TimeSeriesChart
                      series={lossSeries}
                      mode={mode}
                      yMax={100}
                      valueFormatter={(v) => `${Math.round(v)}%`}
                    />
                  ) : (
                    <NoData label={t("loading")} />
                  )}
                </Panel>
              </div>
            )}

            {trafficLimit > 0 ? (
              <Panel title={t("traffic")} icon={<ArrowDownUp size={13} />}>
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <TrafficSummary
                      label={t("upload")}
                      value={formatBytes(server.net_tx_monthly ?? 0)}
                      accent={colors.up}
                    />
                    <TrafficSummary
                      label={t("download")}
                      value={formatBytes(server.net_rx_monthly ?? 0)}
                      accent={colors.down}
                    />
                    <TrafficSummary
                      label={`${t("used")}`}
                      value={`${formatBytes(trafficUsed)} · ${formatPercent(trafficPercent, 2)}`}
                      accent={trafficColor}
                    />
                    <TrafficSummary
                      label={t("remaining")}
                      value={formatBytes(trafficRemaining)}
                    />
                  </div>
                </div>
              </Panel>
            ) : null}

            <Panel title={t("system")}>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <div>
                  <InfoRow
                    label={t("os")}
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <OsIcon os={server.os} size={13} className="opacity-80" />
                        {server.os}
                      </span>
                    }
                  />
                  <InfoRow label={t("arch")} value={server.arch} />
                  <InfoRow label={t("bandwidth")} value={server.bandwidth} />
                  <InfoRow
                    label={t("ip")}
                    value={`IPv4: ${server.ip_v4 === "1" ? "Yes" : "No"} · IPv6: ${server.ip_v6 === "1" ? "Yes" : "No"}`}
                  />
                </div>
                <div>
                  <InfoRow
                    label={t("cores")}
                    icon={<Cpu size={12} />}
                    value={String(server.cpu_cores)}
                  />
                  <InfoRow label={t("memory")} icon={<MemoryStick size={12} />} value={formatGB(server.ram_total / 1024)} />
                  {server.swap_total > 0 ? (
                    <InfoRow
                      label={t("swap")}
                      icon={<ReplaceAll size={12} />}
                      value={formatGB(server.swap_total / 1024)}
                    />
                  ) : null}
                  <InfoRow label={t("disk")} icon={<HardDrive size={12} />} value={formatGB(server.disk_total / 1024)} />
                  {server.gpu_info ? (
                    <InfoRow label={t("gpu")} value={server.gpu_info} />
                  ) : null}
                  {server.price ? (
                    <InfoRow label={t("price")} value={server.price} />
                  ) : null}
                  {server.expire_date ? (
                    <InfoRow label={t("expiresAt")} value={server.expire_date} />
                  ) : null}
                  {server.bandwidth ? (
                    <InfoRow label={t("bandwidth")} value={server.bandwidth} />
                  ) : null}
                </div>
              </div>
            </Panel>

            {online ? (
              <Panel title={t("networkLatency")} icon={<Activity size={13} />}>
                <PingOverview server={server} colors={colors} />
              </Panel>
            ) : null}
          </div>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}

function TrafficSummary({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-kumo-tint rounded-lg px-3 py-2">
      <div className="text-kumo-subtle text-[11px] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div
        className="text-kumo-default mt-1 text-sm font-semibold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
