import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flexon Sports Hub",
  description: "Live pickleball scores, tournaments and entries from Flexon Sports Hub, Kolkata.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#111111", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
