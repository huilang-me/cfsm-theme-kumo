"use client";

import { useEffect, useRef, useState } from "react";
import { cfsm, loadTurnstile } from "@/lib/cfsm";

export function TurnstileGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const siteConfig = await cfsm.getConfig();
      if (cancelled) return;

      if (!siteConfig.turnstile_enabled || siteConfig.verified) {
        setReady(true);
        return;
      }

      await new Promise<void>((resolve) => {
        if (cancelled || !containerRef.current) { resolve(); return; }
        loadTurnstile(siteConfig.turnstile_site_key, containerRef.current, () => {
          resolve();
        });
      });
      if (cancelled) return;

      cfsm.invalidateCache();
      try {
        await cfsm.getConfig();
      } catch {}
      if (!cancelled) setReady(true);
    }

    run().catch((err) => {
      if (cancelled) return;
      if (err?.message?.includes("Turnstile")) {
        setErrorMsg(err.message);
      } else {
        setReady(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-kumo-danger mb-3 text-lg font-semibold">⚠</div>
          <p className="text-kumo-default text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div ref={containerRef} />
      </div>
    );
  }

  return <>{children}</>;
}
