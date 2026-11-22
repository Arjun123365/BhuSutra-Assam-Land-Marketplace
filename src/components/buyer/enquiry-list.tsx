import Link from "next/link";
import { assistanceStartHref } from "../../lib/assistance";
import { findDemoParcel, parcelHref } from "../../lib/demo-marketplace";
import { enquiryStatuses, type Enquiry } from "../../lib/buyer-demo";
import { EnquiryActionForm } from "./buyer-forms";

const format = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
function timestamp(value: string) {
  return <time dateTime={value}>{format.format(new Date(value))} IST</time>;
}

export function EnquiryList({ enquiries, seller, assistanceListingIds, readOnly = false }: { enquiries: Enquiry[]; seller?: boolean; assistanceListingIds?: ReadonlySet<string>; readOnly?: boolean }) {
  return (
    <section id="enquiries" className="seller-card enquiry-section" aria-labelledby="enquiries-heading">
      <h2 id="enquiries-heading">{readOnly ? "Saved buyer enquiries" : seller ? "Buyer enquiries" : "My enquiries"}</h2>
      <p>Messages, responses and activity are synthetic demonstration information.</p>
      {(seller || readOnly) && <dl className="enquiry-summary">
        {enquiryStatuses.map(status => (
          <div key={status}><dt>{status}</dt><dd>{enquiries.filter(item => item.status === status).length}</dd></div>
        ))}
      </dl>}
      {enquiries.length ? (
        <ul className="enquiry-list">
          {enquiries.map(enquiry => {
            const parcel = findDemoParcel(enquiry.parcelId);
            const response = enquiry.events.find(event => event.newStatus === "Responded");
            return (
              <li className="enquiry-item" key={enquiry.id}>
                <div className="enquiry-heading">
                  <h3><Link href={parcelHref(enquiry.parcelId)}>Parcel {enquiry.parcelId}</Link></h3>
                  <span className="seller-status" data-status={enquiry.status}>{enquiry.status}</span>
                </div>
                {parcel && <p>{parcel.district} · {parcel.circle} · {parcel.area} {parcel.areaUnit} · {parcel.category}</p>}
                {(seller || readOnly) && <p>Demo buyer {enquiry.buyerName}</p>}
                {readOnly && <p className="admin-id">Enquiry ID: {enquiry.id} · Listing ID: {enquiry.listingId}</p>}
                <p>Submitted {timestamp(enquiry.createdAt)} · Updated {timestamp(enquiry.updatedAt)}</p>
                <p className="enquiry-message"><strong>Demo enquiry</strong> {enquiry.message}</p>
                {response?.message && <p className="enquiry-message"><strong>Demo seller response</strong> {response.message}</p>}
                <details className="seller-status-group">
                  <summary>Enquiry audit history ({enquiry.events.length})</summary>
                  <ol className="enquiry-history">{enquiry.events.map(event => (
                    <li key={event.id}>{event.actorKind} · {event.previousStatus ? event.previousStatus + " → " : ""}{event.newStatus} · {timestamp(event.recordedAt)}{readOnly && event.message && <p className="enquiry-message">{event.message}</p>}</li>
                  ))}</ol>
                </details>
                {!readOnly && <>
                  {seller && enquiry.status === "Submitted" && <EnquiryActionForm enquiryId={enquiry.id} mode="view" />}
                  {seller && enquiry.status === "Viewed" && <EnquiryActionForm enquiryId={enquiry.id} mode="respond" />}
                  {enquiry.status !== "Closed" && <EnquiryActionForm enquiryId={enquiry.id} mode={seller ? "seller-close" : "buyer-close"} />}
                  {assistanceListingIds?.has(enquiry.listingId) && <Link className="seller-secondary" href={assistanceStartHref(enquiry.listingId)}>Transaction assistance</Link>}
                </>}
              </li>
            );
          })}
        </ul>
      ) : <p className="seller-empty">{readOnly ? "No saved enquiries match this view." : seller ? "Your listings have no buyer enquiries yet." : "You have no enquiries yet. Browse the marketplace to express interest in an approved demo listing."}</p>}
    </section>
  );
}
