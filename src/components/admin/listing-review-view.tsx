import Link from "next/link";
import type { ComponentType } from "react";
import type { DemoParcel } from "../../lib/demo-marketplace";
import { allowedReviewDecisions,reviewChecks,validAskingPrice } from "../../lib/listing-review";
import { fullINR,type DemoListing,type ListingAuditEvent } from "../../lib/seller-demo";
import { ParcelContext } from "../parcel-context";
import type { ReviewDecisionForm } from "./review-decision-view";
const dateFormat=new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"});
export function ListingReviewView({listing,parcel,sellerName,conflict,events,saved,DecisionForm}: {listing:DemoListing;parcel?:DemoParcel;sellerName:string;conflict:boolean;events:ListingAuditEvent[];saved?:unknown;DecisionForm:ComponentType<Omit<Parameters<typeof ReviewDecisionForm>[0],"submit">>}) {
const decisions=allowedReviewDecisions(listing.status);const restrictionReviewed=events.some(e=>e.newStatus==="Approved"&&!!e.restrictionRemarks);
  return (
    <>
      <div className="seller-heading">
        <div><Link href="/admin/listings" className="records-back-link">← Back to review queue</Link><h1>Review listing</h1><p className="admin-id">{listing.id}</p></div>
        <span className="seller-status" data-status={listing.status}>{listing.status}</span>
      </div>
      {saved === "1" && <p className="seller-feedback" role="status">Decision recorded.</p>}

      <div className="admin-review">
        <div className="admin-review-stack">
          <section className="seller-card">
            <h2>Synthetic parcel record</h2>
            {parcel ? (
              <dl className="seller-facts">
                <div><dt>Parcel ID</dt><dd>{parcel.id}</dd></div>
                <div><dt>Dag number</dt><dd>{parcel.dagNumber}</dd></div>
                <div><dt>Patta number</dt><dd>{parcel.pattaNumber}</dd></div>
                <div><dt>District</dt><dd>{parcel.district}</dd></div>
                <div><dt>Revenue Circle</dt><dd>{parcel.circle}</dd></div>
                <div><dt>Land area</dt><dd>{parcel.area} {parcel.areaUnit}</dd></div>
                <div><dt>Land classification</dt><dd>{parcel.category}</dd></div>
              </dl>
            ) : <p>Parcel association unavailable for {listing.parcelId}.</p>}
            {parcel?.restriction && <p className="seller-warning">Synthetic restriction flag · {parcel.restriction}</p>}
            {conflict && <p className="seller-warning">Another active request or approved listing conflicts with this parcel.</p>}
          </section>

          <section className="seller-card">
            <h2>Seller declarations</h2>
            <dl className="seller-facts">
              <div><dt>Demo display name</dt><dd>{sellerName}</dd></div>
              <div><dt>Seller declaration</dt><dd>{listing.details.declaration ? "Recorded" : "Unavailable"}</dd></div>
              <div><dt>Voluntary listing consent</dt><dd>{listing.details.consent ? "Recorded" : "Unavailable"}</dd></div>
              <div><dt>Asking price</dt><dd>{validAskingPrice(listing.details.askingPrice) ? fullINR.format(Number(listing.details.askingPrice)) : "Unavailable"}</dd></div>
            </dl>
            <h3 className="admin-description-title">Seller description</h3>
            <p className="admin-note-content">{listing.details.description || "No description recorded for this request."}</p>
          </section>

        </div>

        <div className="admin-review-stack">
          <section className="seller-card">
            <h2>Review checklist</h2>
            <ul className="admin-checklist">
              {reviewChecks(listing, parcel, conflict).map(check => <li key={check.label}><span>{check.label}</span><strong>{check.passed ? "Met" : "Needs attention"}</strong></li>)}
              <li><span>Demonstration restriction flags reviewed</span><strong>{parcel?.restriction ? restrictionReviewed ? "Recorded" : "Review required" : "No demo flag"}</strong></li>
              <li><span>Government-record checks</span><strong>Not connected / Not verified</strong></li>
            </ul>
            <p>Demo marketplace approval does not establish ownership, encumbrance clearance, legal title or transaction eligibility.</p>
          </section>
          <section className="seller-card">
            <h2>Review decision</h2>
            {decisions.length
              ? <DecisionForm key={listing.status} listingId={listing.id} decisions={decisions} flagged={Boolean(parcel?.restriction)} />
              : <p>{listing.status === "Clarification Required" ? "Waiting for the seller to respond and resubmit." : "No administrator decisions are available for this status."}</p>}
          </section>
          {parcel && <ParcelContext parcel={parcel} />}
        </div>
        <section className="seller-card admin-audit-card">
          <h2>Audit history</h2>
          {events.length ? <ol className="admin-audit">
            {events.map(event => (
              <li key={event.id}>
                <strong>{event.event}</strong>
                {event.newStatus && <p>{event.previousStatus ? event.previousStatus + " → " : ""}{event.newStatus}</p>}
                <p>{event.actorKind && <>{event.actorKind}{event.actorKind !== "Seller" && event.actorId ? " · " + event.actorId : ""} · </>}
                  <time dateTime={event.recordedAt}>{dateFormat.format(new Date(event.recordedAt))} IST</time></p>
                {event.remarks && <p className="admin-note-content"><strong>Decision remarks</strong> {event.remarks}</p>}
                {event.restrictionRemarks && <p className="admin-note-content"><strong>Restriction review remarks</strong> {event.restrictionRemarks}</p>}
                {event.sellerResponse && <p className="admin-note-content"><strong>Seller response</strong> {event.sellerResponse}</p>}
              </li>
            ))}
          </ol> : <p>No audit events recorded.</p>}
        </section>
      </div>
    </>
  );
}
