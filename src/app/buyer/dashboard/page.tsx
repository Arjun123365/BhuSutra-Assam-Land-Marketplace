import Link from "next/link";
import { AssistanceList } from "../../../components/assistance/request-list";
import { EnquiryList } from "../../../components/buyer/enquiry-list";
import { listAssistance } from "../../../lib/assistance-store";
import { requireBuyer } from "../../../lib/buyer-session";
import { getEnquiries } from "../../../lib/buyer-store";
import { getApprovedListingsReadOnly } from "../../../lib/seller-store";
import { BuyerDashboardInsights } from "../../../components/buyer/dashboard-insights";

export default async function BuyerDashboard({ searchParams }: PageProps<"/buyer/dashboard">) {
  const buyer = await requireBuyer();
  const actor = { kind: "Buyer", id: buyer.id } as const;
  const enquiries = getEnquiries(actor);
  const requests = listAssistance(actor);
  const { notice } = await searchParams;
  return (
    <>
      <div className="seller-heading dashboard-welcome"><div><p className="workspace-eyebrow">Your buyer workspace</p><h1>Buyer dashboard</h1><p>Active demo buyer: <strong>{buyer.displayName}</strong>. Follow your enquiries, checks and next steps.</p></div><Link className="seller-primary" href="/#featured">Browse listings</Link></div>
      {notice === "submitted" && <p role="status" className="seller-feedback">Demo enquiry submitted.</p>}
      <BuyerDashboardInsights buyerId={buyer.id} enquiries={enquiries} requests={requests} />
      <div className="buyer-dashboard-grid">
        <section className="seller-card" aria-labelledby="buyer-profile">
          <h2 id="buyer-profile">Demo buyer profile</h2>
          <dl className="seller-facts">
            <div><dt>Display name</dt><dd>{buyer.displayName}</dd></div>
            <div><dt>District preference</dt><dd>{buyer.district}</dd></div>
            <div><dt>Buyer type</dt><dd>{buyer.buyerType}</dd></div>
            <div><dt>Test mobile</dt><dd>{buyer.mobile}</dd></div>
            {buyer.email && <div><dt>Test email</dt><dd>{buyer.email}</dd></div>}
          </dl>
        </section>
        <EnquiryList enquiries={enquiries} assistanceListingIds={new Set(getApprovedListingsReadOnly().map(({ listingId }) => listingId))} />
      </div>
      <AssistanceList role="Buyer" requests={requests} compact />
    </>
  );
}
