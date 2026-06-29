"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader, Button, cn } from "@cloudflare/kumo";
import {
  CloudSlashIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { useDashboard, useSiteConfig } from "@/hooks/useCFSM";
import { useStatsHistory } from "@/hooks/useStatsHistory";
import { groupNames } from "@/lib/aggregate";
import { parseThemeOptions } from "@/lib/theme-settings";
import { cfsm } from "@/lib/cfsm";
import { useSettings, type Columns } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { StatsBar } from "@/components/stats-bar";
import { Toolbar } from "@/components/toolbar";
import { NodeCard } from "@/components/node-card";
import { NodeList } from "@/components/node-list";
import { NodeDetailDialog } from "@/components/node-detail-dialog";
import type { ReactNode } from "react";

const GRID_COLS: Record<Columns, string> = {
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
};

function CenteredState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card
      variant="flat"
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <div className="text-kumo-inactive">{icon}</div>
      <div className="text-kumo-default text-base font-semibold">{title}</div>
      {description ? (
        <div className="text-kumo-subtle max-w-sm text-sm">{description}</div>
      ) : null}
      {action}
    </Card>
  );
}

export function Dashboard() {
  const {
    t,
    view,
    columns,
    overview,
    background,
    backgroundVideo,
    backgroundBrightness,
    getLocalSettings,
    seedDefaults,
  } = useSettings();
  const { views, stats, isLoading, error, lastUpdated, refresh } =
    useDashboard();
  const { data: siteConfig } = useSiteConfig();
  const configData = cfsm.getConfigSync();

  useEffect(() => {
    const title = configData?.title;
    if (title) document.title = title;
  }, [configData]);

  const options = useMemo(
    () => parseThemeOptions(undefined, getLocalSettings()),
    [getLocalSettings],
  );

  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrigin, setDetailOrigin] = useState<DOMRect | null>(null);

  const effectiveBackground = background || configData?.backgroundImage || "";

  useEffect(() => {
    seedDefaults({
      appearance: options.defaultAppearance,
      view: options.defaultView,
      accent: options.defaultAccent,
      columns: options.defaultColumns,
      surface: options.defaultSurface,
      overview: options.defaultOverview,
      lang: options.defaultLang,
      backgroundBrightness: options.backgroundBrightness,
      backgroundImageUrl: options.backgroundUrl,
      backgroundVideoUrl: options.backgroundVideoUrl,
    });
  }, [options, seedDefaults]);

  const groups = useMemo(() => groupNames(views), [views]);
  const statsHistory = useStatsHistory(stats, lastUpdated);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list =
      group === "all"
        ? views
        : views.filter((v) => v.server.server_group === group);
    if (q) {
      list = list.filter((v) =>
        [
          v.server.name,
          v.server.region,
          v.server.os,
          v.server.cpu_info,
          v.server.server_group,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return list;
  }, [views, group, search]);

  const selectedView = useMemo(
    () => views.find((v) => v.server.id === selected) ?? null,
    [views, selected],
  );

  const openDetail = (id: string, origin?: DOMRect) => {
    setDetailOrigin(origin ?? null);
    setSelected(id);
    setDetailOpen(true);
  };

  const showLoading = isLoading && views.length === 0;
  const showError = !!error && views.length === 0;

  return (
    <div className="relative min-h-screen">
      {backgroundVideo ? (
        <video
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover object-center"
          style={{ filter: `brightness(${backgroundBrightness}%)` }}
          src={backgroundVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
      ) : effectiveBackground ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("${effectiveBackground}")`,
            filter: `brightness(${backgroundBrightness}%)`,
          }}
        />
      ) : null}

      <SiteHeader
        siteConfig={siteConfig}
        lastUpdated={lastUpdated}
        search={search}
        onSearch={setSearch}
      />

      <main
        className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6"
        style={{ minHeight: "calc(100vh - 150px)" }}
      >
        {showError ? (
          <CenteredState
            icon={<WarningCircleIcon size={40} />}
            title={t("errorTitle")}
            description={error instanceof Error ? error.message : undefined}
            action={
              <Button variant="secondary" size="sm" onClick={refresh}>
                {t("errorRetry")}
              </Button>
            }
          />
        ) : showLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader size={28} />
          </div>
        ) : (
          <>
            {overview === "show" ? (
              <StatsBar stats={stats} views={views} history={statsHistory} />
            ) : null}
            <Toolbar
              groups={groups}
              activeGroup={group}
              onGroup={setGroup}
              showGroups={options.enableGroupTabs}
            />

            {filtered.length === 0 ? (
              views.length === 0 ? (
                <CenteredState
                  icon={<CloudSlashIcon size={40} />}
                  title={t("noNodes")}
                  description={t("noNodesDesc")}
                />
              ) : (
                <CenteredState
                  icon={<MagnifyingGlassIcon size={40} />}
                  title={t("noResults")}
                  description={t("noResultsDesc")}
                />
              )
            ) : view === "grid" ? (
              <div className={cn("grid gap-3", GRID_COLS[columns])}>
                {filtered.map((v) => (
                  <NodeCard key={v.server.id} view={v} onOpen={openDetail} />
                ))}
              </div>
            ) : (
              <NodeList views={filtered} onOpen={openDetail} />
            )}
          </>
        )}
      </main>

      <footer className="kumo-glass-shell border-kumo-hairline bg-kumo-canvas/80 mt-6 border-t">
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
          <p className="text-kumo-subtle text-xs">
            Powered by{" "}
            <a
              href="https://github.com/cfsm-monitor/cfsm-monitor"
              target="_blank"
              rel="noreferrer"
              className="hover:text-kumo-link underline underline-offset-2 transition-colors duration-100"
            >
              CF-Server-Monitor
            </a>
            {" · "}
            <a
              href="https://github.com/yuanhhs/komari-theme-kumo"
              target="_blank"
              rel="noreferrer"
              className="hover:text-kumo-link underline underline-offset-2 transition-colors duration-100"
            >
              Kumo Theme
            </a>
          </p>
        </div>
      </footer>

      <NodeDetailDialog
        view={selectedView}
        open={detailOpen}
        origin={detailOrigin}
        onOpenChange={setDetailOpen}
        authorized={siteConfig?.authorization}
      />
    </div>
  );
}
