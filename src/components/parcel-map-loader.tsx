"use client";

import dynamic from "next/dynamic";

export const ParcelMap = dynamic(() => import("./parcel-map"), {
  ssr: false,
  loading: () => <p className="parcel-map-loading" role="status" aria-live="polite">Loading demo parcel map…</p>,
});
