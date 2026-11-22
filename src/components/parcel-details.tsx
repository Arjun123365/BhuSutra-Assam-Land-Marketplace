import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Ref } from "react";
import { parcelRecordHref, type DemoParcel } from "../lib/demo-marketplace";
import { ParcelVerification } from "./parcel-verification";

export function ParcelDetails({ parcel, headingRef }: { parcel?: DemoParcel; headingRef: Ref<HTMLHeadingElement> }) {
  return (
    <section className="parcel-details" aria-labelledby="parcel-details-title">
      <div className="parcel-details-heading">
        <h2 id="parcel-details-title" tabIndex={-1} ref={headingRef}>
          {parcel ? "Parcel " + parcel.id : "Parcel details"}
        </h2>
        <p className="sr-only" role="status">{parcel ? "Selected demo parcel " + parcel.id : "No parcel selected"}</p>
        {parcel && (
          <div className="parcel-record-actions">
            <Link href={parcelRecordHref(parcel.id)} className="open-parcel-record" prefetch={false}>
              Open full record <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <a href="#demo-map" className="records-back-link"><ArrowLeft size={14} aria-hidden="true" /> Back to Map</a>
          </div>
        )}
      </div>
      {parcel
        ? <ParcelVerification key={parcel.id} parcel={parcel} embedded />
        : <p className="parcel-details-empty">Select a polygon on the map or a parcel from the list.</p>}
    </section>
  );
}
