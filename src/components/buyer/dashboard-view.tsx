import Link from "next/link";
import type { ReactNode } from "react";
import type { AssistanceRequest } from "../../lib/assistance";
import type { BuyerProfile } from "../../lib/buyer-demo";
import { AssistanceList } from "../assistance/request-list";
export function BuyerDashboardView({buyer,requests,notice,insights,enquiryPanel}: {buyer:BuyerProfile;requests:AssistanceRequest[];notice?:unknown;insights:ReactNode;enquiryPanel:ReactNode}) {
  return (
    <>
      <div className="seller-heading dashboard-welcome"><div><p className="workspace-eyebrow">Your buyer workspace</p><h1>Buyer dashboard</h1><p>Active demo buyer: <strong>{buyer.displayName}</strong>. Follow your enquiries, checks and next steps.</p></div><Link className="seller-primary" href="/#featured">Browse listings</Link></div>
      {notice === "submitted" && <p role="status" className="seller-feedback">Demo enquiry submitted.</p>}
      {insights}
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
        {enquiryPanel}
      </div>
      <AssistanceList role="Buyer" requests={requests} compact />
    </>
  );
}
