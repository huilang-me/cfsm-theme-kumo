"use client";

import { cn } from "@cloudflare/kumo";
import {
  SquaresFourIcon,
  ListIcon,
} from "@phosphor-icons/react";
import { Segmented } from "@/components/ui/segmented";
import { useSettings, type ViewMode } from "@/components/providers";

export function Toolbar({
  groups,
  activeGroup,
  onGroup,
  showGroups,
}: {
  groups: string[];
  activeGroup: string;
  onGroup: (group: string) => void;
  showGroups: boolean;
}) {
  const { t, view, setView } = useSettings();

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {showGroups && groups.length > 0 ? (
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
            {["all", ...groups].map((group) => {
              const active = group === activeGroup;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => onGroup(group)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color] duration-100",
                    active
                      ? "bg-kumo-brand border-transparent text-white"
                      : "kumo-glass-control bg-kumo-base border-kumo-hairline text-kumo-subtle hover:text-kumo-default hover:border-kumo-line",
                  )}
                >
                  {group === "all" ? t("all") : group}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <Segmented<ViewMode>
        value={view}
        onChange={setView}
        size="sm"
        options={[
          { value: "grid", label: <SquaresFourIcon size={16} />, title: t("gridView") },
          { value: "list", label: <ListIcon size={16} />, title: t("listView") },
        ]}
      />
    </div>
  );
}
