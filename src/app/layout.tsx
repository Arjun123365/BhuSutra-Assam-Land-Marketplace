import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-bengali";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./enquiries.css";
import "./parcel-map.css";
import "./parcel-verification.css";
import "./assistance.css";
import "./presentation.css";

export const metadata: Metadata = {
  title: "BhuSutra | ভূসূত্ৰ",
  description: "Connecting Land. Building Trust. An Assam land marketplace demonstration for NESFIC 2026.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
