import { Download, Info, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ParcelVerification, VerificationStatusSummary } from "../../components/parcel-verification";
import { SiteHeader } from "../../components/site-header";
import { BuyerVerificationWorkspace } from "../../components/buyer-verification-workspace";
import { demoDistricts, demoParcels, parcelHref } from "../../lib/demo-marketplace";
import { verificationReportHref } from "../../lib/verification-model";
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
      <main id="main-content" tabIndex={-1}>
        <section className="explore-intro records-page-intro" aria-labelledby="verify-title">
          <div className="shell">
            <h1 id="verify-title">Land Verification Dashboard</h1>
            <p>Review synthetic parcel records, public seller declarations and the checks a buyer would request from authorised sources.</p>
            <p className="prototype-notice"><Info size={15} aria-hidden="true" /> NESFIC demonstration prototype. No Government record systems are connected.</p>
          </div>
        </section>
        <div className="shell records-page-content">
          <div className="records-card verification-toolbar">
            <form action="/verify-records">
              <label htmlFor="verification-parcel">Demonstration parcel</label>
              <div className="verification-controls">
                <select key={selection} id="verification-parcel" name="parcel" defaultValue={verification?.parcel.id ?? ""} required>
                  {!verification && <option value="" disabled>Select a parcel</option>}
                  {demoDistricts.map((district) => (
                    <optgroup key={district} label={district}>
                      {demoParcels.filter((parcel) => parcel.district === district).map(({ id, circle }) => (
                        <option key={id} value={id}>{id} · {circle}, {district}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button className="verification-primary" type="submit">View records</button>
              </div>
            </form>
            {verification && <div className="verification-controls">
              <Link className="open-parcel-record" href={parcelHref(verification.parcel.id)}><MapPin size={16} aria-hidden="true" /> View on map</Link>
              <a className="open-parcel-record" href={verificationReportHref(verification.parcel.id)} download><Download size={16} aria-hidden="true" /> Download demo report</a>
            </div>}
          </div>
          {verification ? (
            <>
              <VerificationStatusSummary {...verification} dashboard />
              <ParcelVerification
                {...verification}
                workspace={<BuyerVerificationWorkspace key={verification.parcel.id} {...verification} />}
              />
            </>
          ) : <p className="prototype-notice">Parcel unavailable. Select a parcel from the demonstration dataset.</p>}
        </div>
      </main>
    </>
  );
}
