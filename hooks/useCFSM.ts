"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { cfsm, loadConfig } from "@/lib/cfsm";
import { buildServerViews, computeStats } from "@/lib/aggregate";
import type { Server, ServersResponse } from "@/lib/types";

const NUMERIC_KEYS: (keyof Server)[] = [
  "cpu", "net_in_speed", "net_out_speed", "net_rx", "net_tx",
  "net_rx_monthly", "net_tx_monthly", "processes", "tcp_conn", "udp_conn",
  "ping_ct", "ping_cu", "ping_cm", "ping_bd",
  "loss_ct", "loss_cu", "loss_cm", "loss_bd",
  "ram_total", "ram_used", "swap_total", "swap_used",
  "disk_total", "disk_used", "cpu_cores", "gpu",
  "sort_order", "last_updated",
];

function normalizeServer(raw: Record<string, unknown>): Server {
  const out: Record<string, unknown> = { ...raw };
  for (const key of NUMERIC_KEYS) {
    if (out[key] !== undefined && out[key] !== null && typeof out[key] === "string") {
      out[key] = Number(out[key]);
    }
  }
  return out as unknown as Server;
}

const CONFIG_INTERVAL = 60_000;
const WS_RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
const WS_MAX_RETRIES = 10;

export function useSiteConfig() {
  return useSWR("site-config", () => cfsm.getConfig(), {
    revalidateOnFocus: false,
    refreshInterval: CONFIG_INTERVAL,
  });
}

export function useDashboard() {
  const [serversData, setServersData] = useState<ServersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const wsRefs = useRef<WebSocket[]>([]);
  const reconnectTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const retryRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const data = await cfsm.getServers();
        if (!mounted) return;
        setServersData(data);
        setIsLoading(false);

        const apiBases = cfsm.getConfigSync()?.apiBase ?? [location.origin];
        const baseServers: Map<number, string[]> = new Map();
        for (const s of data.servers) {
          const idx = s.source ?? 0;
          if (!baseServers.has(idx)) baseServers.set(idx, []);
          baseServers.get(idx)!.push(s.id);
        }

        retryRef.current = 0;
        for (let i = 0; i < apiBases.length; i++) {
          const ids = baseServers.get(i) ?? [];
          if (ids.length > 0) connectWs(i, ids);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    }

    function connectWs(baseIndex: number, ids: string[]) {
      if (!mounted) return;
      const ws = cfsm.connectWs(baseIndex, "all", ids, (msg) => {
        if (!mounted) return;
        retryRef.current = 0;
        if (msg.type === "batchUpdate" && msg.updates) {
          setServersData((prev) => {
            if (!prev) return prev;
            const serverMap = new Map(prev.servers.map((s) => [s.id, s]));
            for (const u of msg.updates!) {
              const existing = serverMap.get(u.serverId);
              serverMap.set(u.serverId, {
                ...existing,
                ...normalizeServer(u.data as unknown as Record<string, unknown>),
                id: u.serverId,
                source: existing?.source ?? baseIndex,
              });
            }
            return { ...prev, servers: Array.from(serverMap.values()) };
          });
        } else if (msg.type === "update" && msg.serverId && msg.data) {
          setServersData((prev) => {
            if (!prev) return prev;
            const serverMap = new Map(prev.servers.map((s) => [s.id, s]));
            const existing = serverMap.get(msg.serverId!);
            serverMap.set(msg.serverId!, {
              ...existing,
              ...normalizeServer(msg.data as unknown as Record<string, unknown>),
              id: msg.serverId!,
              source: existing?.source ?? baseIndex,
            });
            return { ...prev, servers: Array.from(serverMap.values()) };
          });
        }
      }, () => {
        if (mounted && retryRef.current < WS_MAX_RETRIES) {
          const delay = WS_RECONNECT_DELAYS[Math.min(retryRef.current, WS_RECONNECT_DELAYS.length - 1)];
          retryRef.current += 1;
          reconnectTimers.current[baseIndex] = setTimeout(() => connectWs(baseIndex, ids), delay);
        }
      });
      wsRefs.current[baseIndex] = ws;
    }

    init();

    const onVisibility = () => {
      if (document.hidden) {
        for (const t of reconnectTimers.current) if (t) clearTimeout(t);
        for (const ws of wsRefs.current) ws?.close();
        wsRefs.current = [];
      } else if (!wsRefs.current.length) {
        retryRef.current = 0;
        const data = serversData;
        if (data) {
          const apiBases = cfsm.getConfigSync()?.apiBase ?? [location.origin];
          const baseServers: Map<number, string[]> = new Map();
          for (const s of data.servers) {
            const idx = s.source ?? 0;
            if (!baseServers.has(idx)) baseServers.set(idx, []);
            baseServers.get(idx)!.push(s.id);
          }
          for (let i = 0; i < apiBases.length; i++) {
            const ids = baseServers.get(i) ?? [];
            if (ids.length > 0) connectWs(i, ids);
          }
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", onVisibility);
      for (const t of reconnectTimers.current) if (t) clearTimeout(t);
      for (const ws of wsRefs.current) ws?.close();
      wsRefs.current = [];
    };
  }, []);

  const views = buildServerViews(serversData ?? undefined);
  const stats = computeStats(views, serversData?.stats);

  return {
    views,
    stats,
    serverStats: serversData?.stats,
    isLoading,
    error,
    lastUpdated: latestTimestamp(views),
    refresh: async () => {
      try {
        const data = await cfsm.getServers();
        setServersData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
  };
}

function latestTimestamp(views: { server: Server }[]): number | undefined {
  let max = 0;
  for (const { server } of views) {
    const t = server.last_updated ?? 0;
    if (t > max) max = t;
  }
  return max || undefined;
}

export function useServerHistory(
  id: string | undefined,
  hours: number,
  enabled = true,
  apiBaseIndex?: number,
) {
  return useSWR(
    enabled && id ? ["server-history", id, hours, apiBaseIndex] : null,
    () => cfsm.getHistory(id!, hours, apiBaseIndex),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );
}
