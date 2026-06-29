import type {
  HistoryResponse,
  Server,
  ServersResponse,
  SiteConfig,
  WsMessage,
} from "./types";

let config: { apiBase: string[]; title: string; backgroundImage: string } | null = null;
let configPromise: Promise<{ apiBase: string[]; title: string; backgroundImage: string }> | null = null;

export function loadConfig(): Promise<{ apiBase: string[]; title: string; backgroundImage: string }> {
  if (config) return Promise.resolve(config);
  if (!configPromise) {
    configPromise = fetch("/config.json", { cache: "no-cache", credentials: "omit" })
      .then((res) => res.json())
      .then((data) => {
        config = data;
        return data;
      });
  }
  return configPromise;
}

export class CfsmError extends Error {
  readonly code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "CfsmError";
    this.code = code;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
  } catch (cause) {
    throw new CfsmError(
      `Network error: ${cause instanceof Error ? cause.message : cause}`,
      -1,
    );
  }
  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body.error) msg = body.error;
    } catch {}
    throw new CfsmError(msg, response.status);
  }
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

function getApiBases(): string[] {
  if (config?.apiBase?.length) return config.apiBase;
  return [location.origin];
}

export const cfsm = {
  getConfig: async (): Promise<SiteConfig> => {
    await loadConfig();
    const bases = getApiBases();
    if (bases.length === 1) {
      return fetchJson<SiteConfig>(`${bases[0]}/api/config`);
    }
    const results = await Promise.allSettled(
      bases.map((b) => fetchJson<SiteConfig>(`${b}/api/config`)),
    );
    const first = results.find((r) => r.status === "fulfilled");
    if (first && first.status === "fulfilled") return first.value;
    throw new CfsmError("All config requests failed", 502);
  },

  getServers: async (): Promise<ServersResponse> => {
    await loadConfig();
    const bases = getApiBases();
    if (bases.length === 1) {
      return fetchJson<ServersResponse>(`${bases[0]}/api/servers`);
    }
    const results = await Promise.allSettled(
      bases.map((b, i) =>
        fetchJson<ServersResponse>(`${b}/api/servers`).then((r) => ({ ...r, source: i })),
      ),
    );
    const fulfilled = results
      .filter((r): r is PromiseFulfilledResult<ServersResponse & { source: number }> =>
        r.status === "fulfilled",
      );
    if (fulfilled.length === 0) {
      throw new CfsmError("All server requests failed", 502);
    }
    const merged: ServersResponse = {
      servers: [],
      stats: { total: 0, online: 0, offline: 0, globalSpeedIn: 0, globalSpeedOut: 0, globalNetTx: 0, globalNetRx: 0 },
      regionStats: {},
      sysConfig: fulfilled[0].value.sysConfig,
    };
    for (const r of fulfilled) {
      const src = (r.value as ServersResponse & { source: number }).source;
      for (const s of r.value.servers) {
        merged.servers.push({ ...s, source: src });
      }
      merged.stats.total += r.value.stats.total;
      merged.stats.online += r.value.stats.online;
      merged.stats.offline += r.value.stats.offline;
      merged.stats.globalSpeedIn += r.value.stats.globalSpeedIn;
      merged.stats.globalSpeedOut += r.value.stats.globalSpeedOut;
      merged.stats.globalNetTx += r.value.stats.globalNetTx;
      merged.stats.globalNetRx += r.value.stats.globalNetRx;
      for (const [k, v] of Object.entries(r.value.regionStats)) {
        merged.regionStats[k] = (merged.regionStats[k] || 0) + v;
      }
    }
    return merged;
  },

  getServer: async (id: string, apiBaseIndex?: number): Promise<Server> => {
    await loadConfig();
    const bases = getApiBases();
    const base = apiBaseIndex !== undefined ? bases[apiBaseIndex] : bases[0];
    return fetchJson<Server>(`${base}/api/server?id=${encodeURIComponent(id)}`);
  },

  getHistory: async (id: string, hours: number, apiBaseIndex?: number): Promise<HistoryResponse> => {
    await loadConfig();
    const bases = getApiBases();
    const base = apiBaseIndex !== undefined ? bases[apiBaseIndex] : bases[0];
    return fetchJson<HistoryResponse>(
      `${base}/api/history/all?id=${encodeURIComponent(id)}&hours=${hours}`,
    );
  },

  connectWs(
    apiBaseIndex: number,
    subscribe: string,
    ids: string[],
    onMessage: (msg: WsMessage) => void,
    onError?: (ev: Event) => void,
  ): WebSocket {
    const bases = getApiBases();
    const base = bases[apiBaseIndex] || bases[0] || location.origin;
    const wsBase = base.replace(/^http/, "ws");
    let url = `${wsBase}/api/ws?subscribe=${encodeURIComponent(subscribe)}`;
    if (subscribe === "all" && ids.length > 0) {
      url += `&ids=${encodeURIComponent(ids.join(","))}`;
    }
    const ws = new WebSocket(url);
    ws.onmessage = (ev) => {
      try {
        onMessage(JSON.parse(ev.data) as WsMessage);
      } catch {}
    };
    ws.onerror = onError ?? (() => {});
    return ws;
  },

  getConfigSync: () => config,
};
