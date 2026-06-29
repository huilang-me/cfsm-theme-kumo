"use client";

import {
  siUbuntu,
  siDebian,
  siAlpinelinux,
  siFedora,
  siCentos,
  siRockylinux,
  siAlmalinux,
  siArchlinux,
  siRedhat,
  siOpensuse,
  siGentoo,
  siFreebsd,
  siRaspberrypi,
  siNixos,
  siKalilinux,
  siLinuxmint,
  siManjaro,
  siProxmox,
  siLinux,
} from "simple-icons";
import { WindowsLogoIcon, AppleLogoIcon } from "@phosphor-icons/react";

interface SimpleGlyph {
  title: string;
  path: string;
}

/** First matching rule wins; order matters (specific before generic). */
const RULES: Array<[RegExp, SimpleGlyph]> = [
  [/ubuntu/i, siUbuntu],
  [/debian/i, siDebian],
  [/alpine/i, siAlpinelinux],
  [/raspbian|raspberry/i, siRaspberrypi],
  [/fedora/i, siFedora],
  [/rocky/i, siRockylinux],
  [/alma/i, siAlmalinux],
  [/cent\s?os/i, siCentos],
  [/red\s?hat|rhel/i, siRedhat],
  [/suse/i, siOpensuse],
  [/arch/i, siArchlinux],
  [/gentoo/i, siGentoo],
  [/kali/i, siKalilinux],
  [/mint/i, siLinuxmint],
  [/manjaro/i, siManjaro],
  [/nixos/i, siNixos],
  [/proxmox/i, siProxmox],
  [/freebsd|openbsd|netbsd|\bbsd\b/i, siFreebsd],
];

/** Distro / OS logo, monochrome via `currentColor`. */
export function OsIcon({
  os,
  size = 14,
  className,
}: {
  os: string;
  size?: number;
  className?: string;
}) {
  const text = os || "";
  if (/windows/i.test(text)) {
    return <WindowsLogoIcon size={size} weight="fill" className={className} />;
  }
  if (/darwin|mac\s?os|\bmac\b|apple/i.test(text)) {
    return <AppleLogoIcon size={size} weight="fill" className={className} />;
  }
  const glyph = RULES.find(([re]) => re.test(text))?.[1] ?? siLinux;
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-label={glyph.title}
      className={className}
    >
      <path d={glyph.path} />
    </svg>
  );
}
