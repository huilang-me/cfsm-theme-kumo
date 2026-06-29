/**
 * Types for the CF-Server-Monitor REST API.
 * Field definitions follow theme-develop.md.
 */

export interface Server {
  id: string;
  name: string;
  server_group: string;
  price: string;
  expire_date: string;
  bandwidth: string;
  traffic_limit: string;
  traffic_calc_type: string;
  reset_day: number;
  report_interval: number;
  ping_mode: "http" | "tcp";
  is_hidden: "0" | "1";
  sort_order: number;
  cpu: number;
  load_avg: string;
  net_in_speed: number;
  net_out_speed: number;
  net_rx: number;
  net_tx: number;
  net_rx_monthly: number;
  net_tx_monthly: number;
  processes: number;
  tcp_conn: number;
  udp_conn: number;
  ping_ct: number | null;
  ping_cu: number | null;
  ping_cm: number | null;
  ping_bd: number | null;
  loss_ct: number | null;
  loss_cu: number | null;
  loss_cm: number | null;
  loss_bd: number | null;
  ram_total: number;
  ram_used: number;
  swap_total: number;
  swap_used: number;
  disk_total: number;
  disk_used: number;
  cpu_cores: number;
  cpu_info: string;
  gpu: number | null;
  gpu_info: string;
  arch: string;
  os: string;
  region: string;
  ip_v4: "0" | "1";
  ip_v6: "0" | "1";
  collect_interval: number;
  boot_time: string;
  last_updated: number;
  is_online?: boolean;
  source?: number;
  sysConfig?: SysConfig;
}

export interface SysConfig {
  show_price: boolean;
  show_expire: boolean;
  show_bw: boolean;
  show_tf: boolean;
  show_time: boolean;
  site_title: string;
  show_long_history?: boolean;
}

export interface SiteConfig {
  version: string;
  is_public: boolean;
  authorization: boolean;
  turnstile_enabled: boolean;
  turnstile_site_key: string;
  verified: boolean;
  turnstile_verified: string | null;
  show_long_history: boolean;
}

export interface ServersResponse {
  servers: Server[];
  stats: {
    total: number;
    online: number;
    offline: number;
    globalSpeedIn: number;
    globalSpeedOut: number;
    globalNetTx: number;
    globalNetRx: number;
  };
  regionStats: Record<string, number>;
  sysConfig: SysConfig;
}

export type HistoryResponse = Record<string, unknown>[];

export interface WsMessage {
  type: "hello" | "ping" | "pong" | "update" | "batchUpdate" | "subscribe";
  ts?: number;
  subscribed?: string;
  serverId?: string;
  data?: Server;
  updates?: Array<{ serverId: string; ts: number; data: Server }>;
}

export type PingProvider = "ct" | "cu" | "cm" | "bd";

export interface PingDisplay {
  label: string;
  latency: number | null;
  loss: number | null;
}

export function getServerPings(server: Server): PingDisplay[] {
  const providers: [PingProvider, string][] = [
    ["ct", "CT"],
    ["cu", "CU"],
    ["cm", "CM"],
    ["bd", "BD"],
  ];
  return providers
    .map(([key, label]) => ({
      label,
      latency: Number(server[`ping_${key}` as keyof Server]) || null,
      loss: Number(server[`loss_${key}` as keyof Server]) || null,
    }))
    .filter((p) => p.latency !== null || p.loss !== null);
}

export interface ServerView {
  server: Server;
  online: boolean;
}
