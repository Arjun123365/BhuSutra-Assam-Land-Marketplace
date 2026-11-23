import { ArrowLeft,Info,MapPin } from "lucide-react";
import Link from "next/link";
import { ParcelContext } from "./parcel-context";
import { ParcelVerification,VerificationStatusSummary } from "./parcel-verification";



import type { ReactNode } from "react";
import { parcelHref,type DemoParcel } from "../lib/demo-marketplace";
import type { ParcelGovernmentRecords } from "../lib/parcel-records";
export function ParcelPageContent({parcel,records,workspace}:{parcel:DemoParcel;records:ParcelGovernmentRecords;workspace:ReactNode}) {return <>
        <section className="explore-intro records-page-intro" aria-labelledby="record-title">
          <div className="shell">
            <Link href={parcelHref(parcel.id) + "#demo-map"} className="records-back-link">
              <ArrowLeft size={16} aria-hidden="true" /> Back to Map
            </Link>
            <h1 id="record-title">Parcel {parcel.id} Records</h1>
            <p><MapPin size={17} aria-hidden="true" /> {parcel.circle} Revenue Circle, {parcel.district}, Assam</p>
            <p className="prototype-notice"><Info size={15} aria-hidden="true" /> NESFIC Demonstration Prototype — Uses Synthetic Data. Not an Official Government Portal.</p>
          </div>
        </section>

        <div className="shell records-page-content">
          <VerificationStatusSummary parcel={parcel} records={records} />
          <ParcelVerification
            parcel={parcel}
            records={records}
            context={<ParcelContext parcel={parcel} />}
            workspace={workspace}
          />
        </div>
      </>; }
