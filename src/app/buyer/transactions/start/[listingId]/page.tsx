import Link from "next/link";
import { startAssistanceAction } from "../../../../assistance-actions";
import { assistanceHref, coordinationNotice } from "../../../../../lib/assistance";
import { getAssistanceStart } from "../../../../../lib/assistance-store";
import { currentBuyer } from "../../../../../lib/buyer-session";
import { findDemoParcel, parcelRecordHref } from "../../../../../lib/demo-marketplace";
import { fullINR } from "../../../../../lib/seller-demo";
import { workflowNotice } from "../../../../../lib/workflow-notice";

export default async function StartAssistancePage({ params, searchParams }: PageProps<"/buyer/transactions/start/[listingId]">) {
  const { listingId } = await params;
  const { notice } = await searchParams;
  const buyer = await currentBuyer();
  const listing = getAssistanceStart(listingId, buyer?.id);
  const parcel = listing && findDemoParcel(listing.parcelId);
  if (!listing || !parcel) return (
    <section className="seller-card"><h1>Transaction assistance unavailable</h1>
      <p>This listing is no longer published for demonstration assistance.</p>
      <p><Link href={assistanceHref("Buyer")}>View existing assistance requests</Link></p>
    </section>
  );
  return (
    <section className="seller-card">
      <h1>Start transaction assistance</h1>
      <dl className="seller-facts">
        <div><dt>Parcel</dt><dd><Link href={parcelRecordHref(parcel.id)}>{parcel.id}</Link> · {parcel.district} / {parcel.circle}</dd></div>
        <div><dt>Seller-declared asking price</dt><dd>{fullINR.format(listing.price)}</dd></div>
      </dl>
      <p className="seller-warning">{coordinationNotice} Creating a request starts a demo timeline. It creates no purchase commitment.</p>
      {buyer && !listing.activeReference && <p>{listing.hasEnquiry ? "This request will be linked to your existing demo enquiry." : "This will record your initial interest in the assistance timeline."}</p>}
      {workflowNotice(notice) && <p role="alert" className="seller-error">{workflowNotice(notice)}</p>}
      <div className="seller-actions assistance-actions">
        {!buyer ? <Link className="seller-primary" href={"/buyer/register?listing=" + encodeURIComponent(listingId)}>Register a demo buyer</Link>
          : listing.activeReference ? <Link className="seller-primary" href={assistanceHref("Buyer", listing.activeReference)}>Open active assistance request</Link>
            : <form action={startAssistanceAction.bind(null, listingId)}><button type="submit" className="seller-primary">Create assistance request</button></form>}
      </div>
    </section>
  );
}
