import Link from "next/link";
import { AssistanceList } from "../../../components/assistance/request-list";
import { EnquiryList } from "../../../components/buyer/enquiry-list";
import { listAssistance } from "../../../lib/assistance-store";
import { getEnquiries } from "../../../lib/buyer-store";
import { ClarificationForm } from "../../../components/seller/clarification-form";
import { WithdrawalForm } from "../../../components/seller/withdrawal-form";
import { findDemoParcel } from "../../../lib/demo-marketplace";
import { canWithdraw, fullINR, listingStatuses } from "../../../lib/seller-demo";
import { requireSeller } from "../../../lib/seller-session";
import { getSellerDashboard } from "../../../lib/seller-store";
import { MetricCards, RecentActivity, DistributionChart } from "../../../components/dashboard-ui";
import { getNotifications } from "../../../lib/coordination-store";

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
function date(value: string) {
  return <time dateTime={value}>{dateFormat.format(new Date(value))} IST</time>;
}

export default async function SellerDashboardPage({ searchParams }: PageProps<"/seller/dashboard">) {
  const seller = await requireSeller();
  const { listings, events } = getSellerDashboard(seller.id);
  const actor = { kind: "Seller", id: seller.id } as const;
  const enquiries = getEnquiries(actor);
  const assistance = listAssistance(actor);
  const unread = getNotifications(actor).filter(item => !item.read).length;
  const { notice } = await searchParams;
  const feedback = notice === "submitted" ? "Listing submitted for demo review."
    : notice === "draft" ? "Draft saved."
    : notice === "resubmitted" ? "Clarification sent. Listing resubmitted for review."
    : notice === "withdrawn" ? "Listing withdrawn." : null;
  const parcelByListing = new Map(listings.map(item => [item.id, item.parcelId]));

  return (
    <>
      <div className="seller-heading dashboard-welcome">
        <div><p className="workspace-eyebrow">Your seller workspace</p><h1>Seller dashboard</h1><p>Welcome, {seller.displayName}. Manage your listings and buyer conversations.</p></div>
        <div className="seller-actions"><Link className="seller-secondary" href="#enquiries">Buyer enquiries</Link><Link className="seller-secondary" href="#transaction-assistance">Transaction assistance</Link><Link className="seller-primary" href="/seller/list-property">New listing request</Link></div>
      </div>
      {feedback && <p className="seller-feedback" role="status">{feedback}</p>}
      <MetricCards items={[
        { label: "Draft listings", value: listings.filter(item => item.status === "Draft").length, href: "#requests-title" },
        { label: "Submitted / in review", value: listings.filter(item => ["Submitted", "Under Review", "Clarification Required"].includes(item.status)).length },
        { label: "Approved listings", value: listings.filter(item => item.status === "Approved").length },
        { label: "Buyer enquiries", value: enquiries.length, href: "#enquiries" },
        { label: "Assistance requests", value: assistance.length, href: "/seller/transactions" },
        { label: "Unread updates", value: unread, href: "/seller/notifications" },
      ]} />
      <div className="workspace-insights seller-insights">
        <DistributionChart title="Your listing activity" description="Current statuses of your stored demo listing requests."
          values={listingStatuses.map(label => ({ label, value: listings.filter(item => item.status === label).length }))} />
        <RecentActivity items={[
          ...events.map(item => ({ label: (parcelByListing.get(item.listingId) ?? "Listing") + " · " + item.event, recordedAt: item.recordedAt, href: "#audit-title" })),
          ...enquiries.map(item => ({ label: item.parcelId + " buyer enquiry · " + item.status, recordedAt: item.updatedAt, href: "#enquiries" })),
        ].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))} />
      </div>
      <div className="seller-dashboard">
        <section className="seller-card" aria-labelledby="profile-title">
          <h2 id="profile-title">Seller profile</h2>
          <dl className="seller-facts">
            <div><dt>Display name</dt><dd>{seller.displayName}</dd></div>
            <div><dt>District</dt><dd>{seller.district}</dd></div>
            <div><dt>Seller type</dt><dd>{seller.sellerType}</dd></div>
            <div><dt>Test mobile</dt><dd>{seller.mobile}</dd></div>
            {seller.email && <div><dt>Test email</dt><dd>{seller.email}</dd></div>}
          </dl>
        </section>

        <section className="seller-card seller-requests" aria-labelledby="requests-title">
          <h2 id="requests-title">My listing requests</h2>
          {listings.length === 0 && <p className="seller-empty">You have no listing requests. <Link href="/seller/list-property">Choose a demo parcel to get started.</Link></p>}
          {listingStatuses.map(status => {
            const items = listings.filter(item => item.status === status);
            return (
              <details key={status} className="seller-status-group" open={items.length ? true : undefined}>
                <summary><span className="seller-status" data-status={status}>{status}</span> <span>{items.length} {items.length === 1 ? "request" : "requests"}</span></summary>
                {items.length ? (
                  <ul>
                    {items.map(item => {
                      const parcel = findDemoParcel(item.parcelId);
                      const clarification = events.find(event => event.listingId === item.id && event.newStatus === "Clarification Required");
                      const response = events.find(event => event.listingId === item.id && event.sellerResponse);
                      return (
                        <li key={item.id} className="seller-listing">
                          <div>
                            <h3>{item.parcelId} · {parcel?.district} / {parcel?.circle}</h3>
                            <p>{item.seeded ? "Seeded demonstration listing" : "Seller-declared demonstration request"}</p>
                            {item.details.askingPrice && <p>Asking price {fullINR.format(Number(item.details.askingPrice))}</p>}
                            <p>{item.submittedAt ? <>Submitted {date(item.submittedAt)}</> : item.seeded ? "No submission date recorded for seeded data." : <>Created {date(item.createdAt)}</>}</p>
                            {parcel?.restriction && <p className="seller-review-text">Demo restriction requires review</p>}
                          </div>
                          {(clarification || response) && (
                            <div className="seller-clarification">
                              {clarification && <p><strong>Clarification requested</strong><br />{clarification.remarks}</p>}
                              {response && <p><strong>Last seller response</strong><br />{response.sellerResponse}</p>}
                              {status === "Clarification Required" && <ClarificationForm listingId={item.id} />}
                            </div>
                          )}
                          <div className="seller-listing-actions">
                            {status === "Draft" && <Link className="seller-secondary" href={"/seller/list-property?draft=" + encodeURIComponent(item.id)}>Resume draft</Link>}
                            {canWithdraw(status) && <WithdrawalForm listingId={item.id} parcelId={item.parcelId} approved={status === "Approved"} />}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : <p className="seller-status-empty">No requests in this status.</p>}
              </details>
            );
          })}
        </section>

        <section className="seller-card seller-audit" aria-labelledby="audit-title">
          <h2 id="audit-title">Audit history</h2>
          {events.length ? <ol>{events.map(event => (
            <li key={event.id}><strong>{parcelByListing.get(event.listingId)}</strong> · {event.event}{event.newStatus && <> · {event.newStatus}</>}<br />{date(event.recordedAt)}</li>
          ))}</ol> : <p>No audit events yet.</p>}
        </section>
      </div>
      <EnquiryList enquiries={enquiries} seller />
      <AssistanceList role="Seller" requests={assistance} compact />
    </>
  );
}
