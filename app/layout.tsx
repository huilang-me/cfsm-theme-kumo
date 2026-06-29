import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "CF-Server-Monitor",
  description: "A simple server monitor tool.",
};

const PRE_PAINT_MODE = `(()=>{try{var a=localStorage.getItem("appearance")||"system";var d=a==="dark"||(a!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.setAttribute("data-mode",d?"dark":"light");r.style.colorScheme=d?"dark":"light";var s=localStorage.getItem("kumo-surface");r.setAttribute("data-surface",s==="glass"?"glass":"solid");var ac=localStorage.getItem("kumo-accent");}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-kumo-canvas text-kumo-default min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_MODE }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
