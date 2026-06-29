"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardStats } from "@/lib/aggregate";

export interface StatsSample {
  t: number;
  avgCpu: number;
  avgMemory: number;
  uploadSpeed: number;
  downloadSpeed: number;
}

const MAX_SAMPLES = 120;

export function useStatsHistory(
  stats: DashboardStats,
  stamp: number | undefined,
): StatsSample[] {
  const [history, setHistory] = useState<StatsSample[]>([]);
  const lastStamp = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!stamp || stamp === lastStamp.current) return;
    lastStamp.current = stamp;
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          t: stamp,
          avgCpu: stats.avgCpu,
          avgMemory: stats.avgMemory,
          uploadSpeed: stats.uploadSpeed,
          downloadSpeed: stats.downloadSpeed,
        },
      ];
      return next.length > MAX_SAMPLES ? next.slice(next.length - MAX_SAMPLES) : next;
    });
  }, [stamp, stats]);

  return history;
}
