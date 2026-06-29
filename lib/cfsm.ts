import type {
  HistoryResponse,
  Server,
  ServersResponse,
  SiteConfig,
  WsMessage,
} from "./types";

let config: { apiBase: string[]; title: string; backgroundImage: string } | null = null;
let configPromise: Promise<{ apiBase: string[]; title: string; backgroundImage: string }> | null = null;

export function loadConfig() {
  if (config) return Promise.resolve(config);
  if (!configPromise) {
    configPromise = fetch("/config.json", { cache: "no-cache", credentials: "omit" })
      .then((r) => r.json())
      .then((d) => { config = d; return d; });
  }
  return configPromise;
}

export class CfsmError extends Error {
  code: number;
  constructor(msg: string, code: number) {
    super(msg);
    this.code = code;
  }
}

function getTurnstileVerifiedKey(baseUrl: string | null): string {
  const host = baseUrl ? new URL(baseUrl).hostname : location.hostname;
  return `turnstile_verified_${host}`;
}

function createHeaders(baseUrl: string | null = null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const token = localStorage.getItem("turnstile_token");
  if (token) headers["X-Turnstile-Token"] = token;

  const key = getTurnstileVerifiedKey(baseUrl);
  const verified = localStorage.getItem(key);
  if (verified) headers["X-Turnstile-Verified"] = verified;

  return headers;
}

function saveVerifiedFromResponse(res: Response, baseUrl: string | null = null) {
  const headerVerified = res.headers.get("X-Turnstile-Verified");
  if (headerVerified) {
    localStorage.removeItem("turnstile_token");
    const key = getTurnstileVerifiedKey(baseUrl);
    localStorage.setItem(key, headerVerified);
  }
}

function clearTokenAfterSuccess(body: unknown, baseUrl: string | null = null) {
  const hadToken = !!localStorage.getItem("turnstile_token");
  if (!hadToken) return;
  const obj = body as Record<string, unknown> | null;
  if (obj && obj.verified === true && typeof obj.turnstile_verified === "string") {
    localStorage.removeItem("turnstile_token");
    const key = getTurnstileVerifiedKey(baseUrl);
    localStorage.setItem(key, obj.turnstile_verified);
  } else {
    localStorage.removeItem("turnstile_token");
  }
}

async function api<T>(path: string, apiBase?: string): Promise<T> {
  const base = apiBase ?? getApiBases()[0] ?? "";
  const url = base ? `${base}${path}` : path;

  const res = await fetch(url, {
    headers: createHeaders(base),
    credentials: "include",
  });

  saveVerifiedFromResponse(res, base);

  if (!res.ok) {
    if (res.status === 403) {
      localStorage.removeItem("turnstile_token");
      const key = getTurnstileVerifiedKey(base);
      localStorage.removeItem(key);
    }
    let msg = `HTTP ${res.status}`;
    try { const b = await res.json(); if (b.error) msg = b.error; } catch {}
    throw new CfsmError(msg, res.status);
  }

  const text = await res.text();
  if (!text) return {} as T;
  const parsed = JSON.parse(text) as T;
  clearTokenAfterSuccess(parsed, base);
  return parsed;
}

function getApiBases(): string[] {
  return config?.apiBase?.length ? config.apiBase : [location.origin];
}

const apiCache = new Map<string, Promise<unknown>>();

function cachedApi<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (apiCache.has(key)) return apiCache.get(key) as Promise<T>;
  const p = fn();
  apiCache.set(key, p);
  return p;
}

function invalidateApiCache(pattern?: string) {
  if (!pattern) { apiCache.clear(); return; }
  for (const k of apiCache.keys()) { if (k.startsWith(pattern)) apiCache.delete(k); }
}

export const cfsm = {
  getConfig: async (): Promise<SiteConfig> => {
    await loadConfig();
    const bases = getApiBases();
    const key = `config:${bases.join(",")}`;
    return cachedApi(key, async () => {
      if (bases.length === 1) return api<SiteConfig>("/api/config", bases[0]);
      const results = await Promise.allSettled(bases.map((b) => api<SiteConfig>("/api/config", b)));
      const ok = results.filter((r): r is PromiseFulfilledResult<SiteConfig> => r.status === "fulfilled");
      if (!ok.length) throw new CfsmError("All config requests failed", 502);
      for (const r of ok) {
        if (r.value.turnstile_enabled) {
          throw new CfsmError("检测到其中一个远程端点开启了 Turnstile，请在该站点关闭后继续使用。", 403);
        }
      }
      return ok[0].value;
    });
  },

  getServers: async (): Promise<ServersResponse> => {
    await loadConfig();
    const bases = getApiBases();
    const key = `servers:${bases.join(",")}`;
    return cachedApi(key, async () => {
      if (bases.length === 1) return api<ServersResponse>("/api/servers", bases[0]);
      const results = await Promise.allSettled(
        bases.map((b, i) => api<ServersResponse>("/api/servers", b).then((r) => ({ ...r, source: i }))),
      );
      const ok = results.filter((r): r is PromiseFulfilledResult<ServersResponse & { source: number }> =>
        r.status === "fulfilled");
      if (!ok.length) throw new CfsmError("All server requests failed", 502);
      const merged: ServersResponse = {
        servers: [],
        stats: { total: 0, online: 0, offline: 0, globalSpeedIn: 0, globalSpeedOut: 0, globalNetTx: 0, globalNetRx: 0 },
        regionStats: {},
        sysConfig: ok[0].value.sysConfig,
      };
      for (const r of ok) {
        const src = (r.value as ServersResponse & { source: number }).source;
        for (const s of r.value.servers) merged.servers.push({ ...s, source: src });
        merged.stats.total += r.value.stats.total;
        merged.stats.online += r.value.stats.online;
        merged.stats.offline += r.value.stats.offline;
        merged.stats.globalSpeedIn += r.value.stats.globalSpeedIn;
        merged.stats.globalSpeedOut += r.value.stats.globalSpeedOut;
        merged.stats.globalNetTx += r.value.stats.globalNetTx;
        merged.stats.globalNetRx += r.value.stats.globalNetRx;
        for (const [k, v] of Object.entries(r.value.regionStats))
          merged.regionStats[k] = (merged.regionStats[k] || 0) + v;
      }
      return merged;
    });
  },

  getServer: async (id: string, apiBaseIndex?: number): Promise<Server> => {
    await loadConfig();
    return api<Server>(`/api/server?id=${encodeURIComponent(id)}`, getApiBases()[apiBaseIndex ?? 0]);
  },

  getHistory: async (id: string, hours: number, apiBaseIndex?: number): Promise<HistoryResponse> => {
    await loadConfig();
    return api<HistoryResponse>(
      `/api/history/all?id=${encodeURIComponent(id)}&hours=${hours}`,
      getApiBases()[apiBaseIndex ?? 0],
    );
  },

  connectWs(apiBaseIndex: number, subscribe: string, ids: string[],
    onMessage: (msg: WsMessage) => void, onError?: (ev: Event) => void): WebSocket {
    const base = getApiBases()[apiBaseIndex] || location.origin;
    const wsBase = base.replace(/^http/, "ws");
    let url = `${wsBase}/api/ws?subscribe=${encodeURIComponent(subscribe)}`;
    if (subscribe === "all" && ids.length > 0) url += `&ids=${encodeURIComponent(ids.join(","))}`;
    const ws = new WebSocket(url);
    ws.onmessage = (ev) => { try { onMessage(JSON.parse(ev.data) as WsMessage); } catch {} };
    ws.onerror = onError ?? (() => {});
    return ws;
  },

  getConfigSync: () => config,
  getVerifiedSync: () => {
    const bases = getApiBases();
    const key = getTurnstileVerifiedKey(bases[0] ?? null);
    return localStorage.getItem(key);
  },
  invalidateCache: invalidateApiCache,
};

let turnstileLoaded = false;

export function loadTurnstile(siteKey: string, container: HTMLElement, callback: (token: string) => void) {
  const render = () => {
    const t = (window as unknown as Record<string, { render: (el: HTMLElement, opts: Record<string, unknown>) => string }>).turnstile;
    if (!t) return;
    t.render(container, {
      sitekey: siteKey,
      callback: (token: string) => {
        localStorage.setItem("turnstile_token", token);
        callback(token);
      },
    });
  };
  if (turnstileLoaded) { render(); return; }
  const s = document.createElement("script");
  s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  s.onload = () => { turnstileLoaded = true; render(); };
  document.head.appendChild(s);
}
