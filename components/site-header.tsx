"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@cloudflare/kumo";
import { XIcon } from "@phosphor-icons/react";
import { LogIn, Moon, Search, Settings, Sun, SunMoon } from "lucide-react";
import { SettingsDialog } from "@/components/settings-dialog";
import { useSettings } from "@/components/providers";
import { cfsm } from "@/lib/cfsm";
import type { SiteConfig } from "@/lib/types";

const HEADER_ICON_SIZE = 16;
const SEARCH_INPUT_ICON_SIZE = 15;

export function SiteHeader({
  siteConfig,
  lastUpdated,
  search,
  onSearch,
}: {
  siteConfig?: SiteConfig;
  lastUpdated?: number;
  search: string;
  onSearch: (value: string) => void;
}) {
  const { t, appearance, setAppearance } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const siteTitle = cfsm.getConfigSync()?.title || "CF-Server-Monitor";
  const AppearanceIcon = appearance === "light" ? Sun : appearance === "dark" ? Moon : SunMoon;
  const toggleMode = () =>
    setAppearance(appearance === "light" ? "dark" : appearance === "dark" ? "system" : "light");

  const timeSinceUpdate = lastUpdated
    ? Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000))
    : undefined;
  const isLive = timeSinceUpdate !== undefined && timeSinceUpdate < 300;

  useEffect(() => {
    if (!searchOpen) return;
    inputRef.current?.focus();

    const closeOnOutside = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [searchOpen]);

  return (
    <header className="kumo-glass-shell border-kumo-hairline bg-kumo-canvas/80 sticky top-0 z-30 border-b">
      <div className="mx-auto flex h-16 max-w-[var(--app-max-width,1400px)] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center">
          <div className="min-w-0">
            <h1 className="text-kumo-default truncate text-base leading-tight font-semibold">
              {siteTitle}
            </h1>
            {siteConfig ? (
              <div className="text-kumo-subtle flex items-center gap-1.5 text-xs leading-tight">
                {isLive ? (
                  <span className="bg-kumo-success inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
                ) : (
                  <span className="bg-kumo-danger inline-block h-1.5 w-1.5 rounded-full" />
                )}
                <span>{t("realtime")}</span>
                <span>·</span>
                <span>{t("version")}: {siteConfig.version}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative flex items-center gap-1.5" ref={searchRef}>
          <Button
            variant="ghost"
            size="sm"
            shape="square"
            icon={<AppearanceIcon size={HEADER_ICON_SIZE} strokeWidth={2} />}
            aria-label={t("appearance")}
            onClick={toggleMode}
          />
          <Button
            variant="ghost"
            size="sm"
            shape="square"
            icon={<Search size={HEADER_ICON_SIZE} strokeWidth={2} />}
            aria-label={t("search")}
            onClick={() => setSearchOpen((open) => !open)}
          />
          {siteConfig?.authorization ? (
            <Button
              variant="ghost"
              size="sm"
              shape="square"
              icon={<Settings size={HEADER_ICON_SIZE} strokeWidth={2} />}
              aria-label={t("settings")}
              onClick={() => setSettingsOpen(true)}
            />
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            shape="square"
            icon={<LogIn size={HEADER_ICON_SIZE} strokeWidth={2} />}
            aria-label={t("login")}
            onClick={() => {
              window.location.href = "/admin";
            }}
          />

          {searchOpen ? (
            <div className="kumo-glass-popover border-kumo-line bg-kumo-base absolute top-11 right-0 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-lg border p-2 shadow-lg">
              <div className="relative">
                <Search
                  size={SEARCH_INPUT_ICON_SIZE}
                  strokeWidth={2}
                  className="text-kumo-subtle pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => onSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSearchOpen(false);
                  }}
                  placeholder={t("searchPlaceholder")}
                  aria-label={t("search")}
                  className="kumo-input bg-kumo-canvas border-kumo-line text-kumo-default placeholder:text-kumo-placeholder focus:ring-kumo-focus focus:border-kumo-focus h-9 w-full rounded-md border pr-8 pl-9 text-sm outline-none focus:ring-2"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => onSearch("")}
                    aria-label={t("close")}
                    className="text-kumo-subtle hover:text-kumo-default absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors duration-100"
                  >
                    <XIcon size={15} />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {siteConfig?.authorization ? (
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      ) : null}
    </header>
  );
}
