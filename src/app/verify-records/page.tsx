import type { Metadata } from "next";
import { BuyerVerificationWorkspace } from "../../components/buyer-verification-workspace";
import { SiteHeader } from "../../components/site-header";
import { VerificationPageContent } from "../../components/verification-page-content";
import { demoParcels } from "../../lib/demo-marketplace";
import { getVerificationRecord } from "../../lib/verification-service";

export const metadata: Metadata = {
  title: "Land Verification Dashboard | BhuSutra",
  description: "Review demonstration parcel records, seller declarations and buyer due-diligence steps.",
};

export default async function VerifyRecordsPage({ searchParams }: PageProps<"/verify-records">) {
  const { parcel: requested } = await searchParams;
  const selection = requested === undefined ? demoParcels[0].id : typeof requested === "string" ? requested : "";
  const verification = await getVerificationRecord(selection);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader activePage="verify" />
      <main id="main-content" tabIndex={-1}><VerificationPageContent {...{selection,verification}} workspace={verification ? <BuyerVerificationWorkspace {...verification} /> : null} /></main>
    </>
  );
}
