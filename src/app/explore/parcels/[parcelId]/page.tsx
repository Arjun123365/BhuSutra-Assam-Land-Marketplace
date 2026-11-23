import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuyerVerificationWorkspace } from "../../../../components/buyer-verification-workspace";
import { ParcelPageContent } from "../../../../components/parcel-page-content";
import { SiteHeader } from "../../../../components/site-header";
import { findDemoParcel } from "../../../../lib/demo-marketplace";

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
      <main id="main-content" tabIndex={-1}><ParcelPageContent {...{parcel,records}} workspace={<BuyerVerificationWorkspace {...{parcel,records}} compact />} /></main>
    </>
  );
}
