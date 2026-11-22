import { ArrowLeft, Info, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyerVerificationWorkspace } from "../../../../components/buyer-verification-workspace";
import { ParcelContext } from "../../../../components/parcel-context";
import { ParcelVerification, VerificationStatusSummary } from "../../../../components/parcel-verification";
import { SiteHeader } from "../../../../components/site-header";
import { findDemoParcel, parcelHref } from "../../../../lib/demo-marketplace";

import { getVerificationRecord } from "../../../../lib/verification-service";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/explore/parcels/[parcelId]">): Promise<Metadata> {
  const parcel = findDemoParcel((await params).parcelId);
  return { title: parcel ? "Parcel " + parcel.id + " Records | BhuSutra" : "Parcel Records | BhuSutra" };
}

export default async function ParcelRecordsPage({ params }: PageProps<"/explore/parcels/[parcelId]">) {
  const { parcelId } = await params;
  const verification = await getVerificationRecord(parcelId);
  if (!verification) notFound();
  const { parcel, records } = verification;

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader activePage="explore" />
      <main id="main-content" tabIndex={-1}>
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
            workspace={<BuyerVerificationWorkspace parcel={parcel} records={records} compact />}
          />
        </div>
      </main>
    </>
  );
}
