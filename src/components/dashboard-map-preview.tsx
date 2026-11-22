"use client";

import { ArrowRight, Map } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { parcelHref, type DemoParcel } from "../lib/demo-marketplace";
import { ParcelMap } from "./parcel-map-loader";

export function DashboardMapPreview({ parcels }: { parcels: DemoParcel[] }) {
  const [visible, setVisible] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const element = preview.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <figure className="map-preview">
      <div className="map-header">
        <h2><Map size={17} aria-hidden="true" /> Cadastral Map Preview</h2>
        <span>Demo</span>
      </div>
      <div ref={preview} className="dashboard-parcel-map" role="region" aria-label="Illustrative Teok parcel map preview">
        {visible ? <ParcelMap parcels={parcels} onSelect={(id) => router.push(parcelHref(id))} preview /> : null}
      </div>
      <figcaption className="dashboard-map-caption">
        <span>Illustrative boundaries</span>
        <Link href="/explore">Open map <ArrowRight size={14} aria-hidden="true" /></Link>
      </figcaption>
    </figure>
  );
}
