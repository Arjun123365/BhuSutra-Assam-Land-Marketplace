import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-bengali";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./parcel-map.css";
import "./parcel-verification.css";
import "./presentation.css";
import "./public-demo.css";
import { PublicDemoFrame } from "../components/public-demo-workspace";

export const metadata: Metadata = { title: "BhuSutra | ভূসূত্ৰ — NESFIC Public Demo", description: "Synthetic Assam land marketplace. Browser-only simulation; no official Government integration." };
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><PublicDemoFrame>{children}</PublicDemoFrame></body></html>;
}
