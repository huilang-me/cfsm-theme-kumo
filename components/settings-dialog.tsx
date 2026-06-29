"use client";

import { useRef, useState } from "react";
import { Dialog, Button, cn } from "@cloudflare/kumo";
import {
  SunIcon,
  MoonIcon,
  DesktopIcon,
  XIcon,
  SquaresFourIcon,
  ListIcon,
  CheckIcon,
  ImageIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Segmented } from "@/components/ui/segmented";
import { BackgroundBrightnessSlider } from "@/components/background-brightness-slider";
import {
  useSettings,
  ACCENT_KEYS,
  type Accent,
  type Appearance,
  type Columns,
  type OverviewVisibility,
  type Surface,
  type ViewMode,
} from "@/components/providers";
import { readFileAsDataUrl } from "@/lib/file";
import { isVideoResourceUrl } from "@/lib/background-media";
import type { Lang } from "@/lib/i18n";
import type { ReactNode } from "react";

const ACCENT_SWATCH: Record<Accent, string> = {
  default: "#f6821f",
  blue: "#3b82f6",
  violet: "#7c5cff",
  emerald: "#10b981",
  rose: "#f43f5e",
  cyan: "#06b6d4",
};
const BACKGROUND_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const BACKGROUND_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg"]);

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-kumo-subtle text-xs font-medium tracking-wide uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    t,
    appearance,
    setAppearance,
    view,
    setView,
    lang,
    setLang,
    accent,
    setAccent,
    columns,
    setColumns,
    surface,
    setSurface,
    overview,
    setOverview,
    background,
    backgroundVideo,
    backgroundBrightness,
    setBackgroundBrightness,
    setBackgroundImageUrl,
    clearBackground,
  } = useSettings();

  const fileRef = useRef<HTMLInputElement>(null);
  const [backgroundSettingImageUrl, setBackgroundSettingImageUrl] = useState("");
  const [backgroundSettingStatus, setBackgroundSettingStatus] = useState<
    "saved" | "error" | ""
  >("");

  const handleAppearanceChange = (value: Appearance) => {
    setAppearance(value);
  };

  const handleViewChange = (value: ViewMode) => {
    setView(value);
  };

  const handleColumnsChange = (value: Columns) => {
    setColumns(value);
  };

  const handleSurfaceChange = (value: Surface) => {
    setSurface(value);
  };

  const handleOverviewChange = (value: OverviewVisibility) => {
    setOverview(value);
  };

  const handleLangChange = (value: Lang) => {
    setLang(value);
  };

  const handleAccentChange = (value: Accent) => {
    setAccent(value);
  };

  const handleBackgroundFile = async (file: File) => {
    if (!BACKGROUND_IMAGE_TYPES.has(file.type) && !BACKGROUND_VIDEO_TYPES.has(file.type)) {
      setBackgroundSettingStatus("error");
      return;
    }
    setBackgroundSettingStatus("");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setBackgroundSettingImageUrl(dataUrl);
      setBackgroundImageUrl(dataUrl);
      setBackgroundSettingStatus("saved");
    } catch {
      setBackgroundSettingStatus("error");
    }
  };

  const handleClearBackground = () => {
    clearBackground();
    setBackgroundSettingImageUrl("");
    setBackgroundSettingStatus("");
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="base" className="kumo-dialog-surface w-full max-w-md p-6">
        <div className="mb-5 flex items-center justify-between">
          <Dialog.Title className="text-kumo-default text-base font-semibold">
            {t("settings")}
          </Dialog.Title>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t("close")}
            className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-tint rounded-md p-1 transition-[color,background-color] duration-100"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <Section label={t("appearance")}>
            <Segmented<Appearance>
              value={appearance}
              onChange={handleAppearanceChange}
              size="sm"
              options={[
                { value: "light", label: <><SunIcon size={15} />{t("light")}</> },
                { value: "dark", label: <><MoonIcon size={15} />{t("dark")}</> },
                {
                  value: "system",
                  label: <><DesktopIcon size={15} />{t("systemMode")}</>,
                },
              ]}
            />
          </Section>

          <Section label={t("view")}>
            <Segmented<ViewMode>
              value={view}
              onChange={handleViewChange}
              size="sm"
              options={[
                {
                  value: "grid",
                  label: <><SquaresFourIcon size={15} />{t("gridView")}</>,
                },
                { value: "list", label: <><ListIcon size={15} />{t("listView")}</> },
              ]}
            />
          </Section>

          <Section label={t("columns")}>
            <Segmented<Columns>
              value={columns}
              onChange={handleColumnsChange}
              size="sm"
              options={[
                { value: 4, label: "4" },
                { value: 5, label: "5" },
              ]}
            />
          </Section>

          <Section label={t("cardStyle")}>
            <Segmented<Surface>
              value={surface}
              onChange={handleSurfaceChange}
              size="sm"
              options={[
                { value: "solid", label: t("solid") },
                { value: "glass", label: t("frosted") },
              ]}
            />
          </Section>

          <Section label={t("overviewInfo")}>
            <Segmented<OverviewVisibility>
              value={overview}
              onChange={handleOverviewChange}
              size="sm"
              options={[
                { value: "show", label: t("show") },
                { value: "hide", label: t("hide") },
              ]}
            />
          </Section>

          <Section label={t("background")}>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                await handleBackgroundFile(file);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <ImageIcon size={15} />
                {t("uploadImage")}
              </Button>
              {background || backgroundVideo ? (
                <>
                  {backgroundVideo ? (
                    <video
                      aria-hidden
                      className="border-kumo-hairline h-9 w-14 shrink-0 rounded-md border object-cover"
                      src={backgroundVideo}
                      muted
                      playsInline
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="border-kumo-hairline h-9 w-14 shrink-0 rounded-md border bg-cover bg-center"
                      style={{ backgroundImage: `url("${background}")` }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleClearBackground}
                    className="text-kumo-subtle hover:text-kumo-danger inline-flex items-center gap-1 text-xs transition-colors duration-100"
                  >
                    <TrashIcon size={14} />
                    {t("removeBackground")}
                  </button>
                </>
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              <input
                value={backgroundSettingImageUrl}
                onChange={(e) => {
                  setBackgroundSettingImageUrl(e.target.value);
                  setBackgroundImageUrl(e.target.value);
                  setBackgroundSettingStatus("");
                }}
                placeholder={t("backgroundImageUrl")}
                aria-label={t("backgroundImageUrl")}
                className="kumo-input bg-kumo-base border-kumo-line text-kumo-default placeholder:text-kumo-placeholder focus:ring-kumo-focus focus:border-kumo-focus h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-2"
              />
            </div>
            <div className="mt-3 space-y-2">
              <BackgroundBrightnessSlider
                value={backgroundBrightness}
                onChange={(value) => {
                  setBackgroundBrightness(value);
                  setBackgroundSettingStatus("");
                }}
                label={t("backgroundBrightness")}
                enabled={open}
              />
              {backgroundSettingStatus ? (
                <div
                  className={cn(
                    "text-xs",
                    backgroundSettingStatus === "saved"
                      ? "text-kumo-success"
                      : "text-kumo-danger",
                  )}
                >
                  {backgroundSettingStatus === "saved" ? t("saved") : t("saveFailed")}
                </div>
              ) : null}
            </div>
          </Section>

          <Section label={t("language")}>
            <Segmented<Lang>
              value={lang}
              onChange={handleLangChange}
              size="sm"
              options={[
                { value: "zh-CN", label: "中文" },
                { value: "en", label: "English" },
              ]}
            />
          </Section>

          <Section label={t("accent")}>
            <div className="flex flex-wrap gap-2.5">
              {ACCENT_KEYS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => handleAccentChange(a)}
                  aria-label={a}
                  title={a}
                  className={cn(
                    "ring-offset-kumo-base relative h-7 w-7 rounded-full ring-2 ring-offset-2 transition-[box-shadow,transform] duration-100",
                    accent === a
                      ? "ring-kumo-focus"
                      : "ring-transparent hover:ring-kumo-hairline",
                  )}
                  style={{ background: ACCENT_SWATCH[a] }}
                >
                  {accent === a ? (
                    <CheckIcon
                      size={14}
                      weight="bold"
                      className="absolute inset-0 m-auto text-white"
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </Section>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
