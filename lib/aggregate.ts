import type { Server, ServersResponse, ServerView } from "./types";

export function buildServerViews(data: ServersResponse | undefined): ServerView[] {
  if (!data) return [];
  return data.servers
    .filter((s) => s.is_hidden !== "1")
    .sort(compareServers)
    .map((server) => ({
      server,
      online: server.is_online ?? Date.now() - (server.last_updated ?? 0) < 300_000,
    }));
}

function compareServers(a: Server, b: Server): number {
  const byGroup = (a.server_group ?? "").localeCompare(b.server_group ?? "");
  if (byGroup !== 0) return byGroup;
  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
}

export interface DashboardStats {
  total: number;
  online: number;
  offline: number;
  regions: number;
  uploadSpeed: number;
  downloadSpeed: number;
  totalUp: number;
  totalDown: number;
  avgCpu: number;
  avgMemory: number;
}

export function computeStats(
  views: ServerView[],
  serverStats?: ServersResponse["stats"],
): DashboardStats {
  if (serverStats) {
    const regions = new Set<string>();
    let cpuSum = 0;
    let memSum = 0;
    let onlineCount = 0;
    for (const { server, online } of views) {
      if (server.region) regions.add(server.region);
      if (online) {
        onlineCount += 1;
        cpuSum += server.cpu || 0;
        if (server.ram_total > 0)
          memSum += ((server.ram_used || 0) / server.ram_total) * 100;
      }
    }
    return {
      total: serverStats.total,
      online: serverStats.online,
      offline: serverStats.offline,
      regions: regions.size,
      uploadSpeed: serverStats.globalSpeedOut,
      downloadSpeed: serverStats.globalSpeedIn,
      totalUp: serverStats.globalNetTx,
      totalDown: serverStats.globalNetRx,
      avgCpu: onlineCount > 0 ? cpuSum / onlineCount : 0,
      avgMemory: onlineCount > 0 ? memSum / onlineCount : 0,
    };
  }

  const regions = new Set<string>();
  let online = 0;
  let uploadSpeed = 0;
  let downloadSpeed = 0;
  let totalUp = 0;
  let totalDown = 0;
  let cpuSum = 0;
  let memSum = 0;

  for (const { server, online: isOnline } of views) {
    if (server.region) regions.add(server.region);
    if (isOnline) {
      online += 1;
      uploadSpeed += server.net_out_speed || 0;
      downloadSpeed += server.net_in_speed || 0;
      cpuSum += server.cpu || 0;
      if (server.ram_total > 0)
        memSum += ((server.ram_used || 0) / server.ram_total) * 100;
    }
    totalUp += server.net_tx || 0;
    totalDown += server.net_rx || 0;
  }

  return {
    total: views.length,
    online,
    offline: views.length - online,
    regions: regions.size,
    uploadSpeed,
    downloadSpeed,
    totalUp,
    totalDown,
    avgCpu: online > 0 ? cpuSum / online : 0,
    avgMemory: online > 0 ? memSum / online : 0,
  };
}

export function groupNames(views: ServerView[]): string[] {
  const names = new Set<string>();
  for (const view of views) if (view.server.server_group) names.add(view.server.server_group);
  return [...names];
}
