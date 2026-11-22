import Link from "next/link";
import { currentBuyer } from "../lib/buyer-session";
import type { DemoParcel } from "../lib/demo-marketplace";
import { assessDueDiligence, buyerReviewNotice, riskNotice } from "../lib/due-diligence";
import { getBuyerCheckHistory } from "../lib/due-diligence-store";
import { recordStatusLabels, unavailableGovernmentStatus, type ParcelGovernmentRecords } from "../lib/parcel-records";
import { getParcelVerification, verificationTitleNotice } from "../lib/verification-model";
import { BuyerCheckForm } from "./verification-checklist";

const historyDate = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Kolkata" });

export async function BuyerVerificationWorkspace({ parcel, records, compact = false }: {
  parcel: DemoParcel;
  records: ParcelGovernmentRecords;
  compact?: boolean;
}) {
  const buyer = await currentBuyer();
  const review = assessDueDiligence(getParcelVerification(parcel, records), buyer ? getBuyerCheckHistory(buyer.id, parcel.id) : []);
  const { buyerStatus, completedCount, pending, unavailable, checks, history, recommendations, observations, riskIndicator } = review;
  return (
    <section className="records-card due-diligence buyer-verification" data-compact={compact} aria-labelledby="buyer-verification-title">
      <div className="records-card-heading">
        <h2 id="buyer-verification-title">Buyer due diligence</h2>
        <span className="records-status" data-buyer-status={buyerStatus}>{buyerStatus}</span>
      </div>
      <dl className="buyer-verification-counts">
        <div><dt>Total checks</dt><dd>{checks.length}</dd></div>
        <div><dt>Buyer-completed</dt><dd>{completedCount}</dd></div>
        <div><dt>Buyer pending</dt><dd>{pending.length}</dd></div>
        <div><dt>Official unavailable</dt><dd>{unavailable.length}</dd></div>
      </dl>
      <p className="buyer-verification-note">{buyerReviewNotice}</p>
      <div className="buyer-verification-section">
        <h3>Land risk assessment</h3>
        <p><span className="records-status" data-status="needs-review">{riskIndicator}</span></p>
        <p>{riskNotice}</p>
        <p>{verificationTitleNotice}</p>
        <details className="verification-steps">
          <summary>Risk observations ({observations.length})</summary>
          {observations.length ? <ul>{observations.map(({ id, label, detail }) => <li key={id}>{label} · {detail}</li>)}</ul>
            : <p>No observations were raised by the demo rules.</p>}
        </details>
      </div>
      {!compact && (
        <>
          <div className="buyer-verification-section">
            <h3>Verification checklist</h3>
            {!buyer && <p><Link className="open-parcel-record" href={"/buyer/register?parcel=" + encodeURIComponent(parcel.id)}>Register or continue as a demo buyer</Link> to save private progress.</p>}
            <ol className="buyer-check-list">
              {checks.map(({ id, label, result, buyerStatus: status }) => (
                <li key={id}>
                  <h4>{label}</h4>
                  <div className="buyer-check-statuses">
                    <span className="records-status" data-buyer-status={status}>Buyer · {status}</span>
                    <span className="records-status" data-status={result.status}>Official · {result.status === "not-connected" ? unavailableGovernmentStatus : recordStatusLabels[result.status]}</span>
                  </div>
                  {buyer && <BuyerCheckForm parcelId={parcel.id} checkId={id} label={label} status={status} />}
                </li>
              ))}
            </ol>
          </div>
          <details className="verification-steps buyer-verification-details">
            <summary>Outstanding due-diligence items</summary>
            <p>{pending.length ? "Pending buyer checklist items" : "All buyer checklist items are marked completed."}</p>
            {pending.length > 0 && <ul>{pending.map(({ id, label }) => <li key={id}>{label}</li>)}</ul>}
            <p>{unavailable.length} official checks remain unavailable. Buyer completion leaves these statuses unchanged.</p>
          </details>
          <details className="verification-steps buyer-verification-details">
            <summary>Recommended next steps</summary>
            {recommendations.length ? <ul>{recommendations.map(step => <li key={step}>{step}</li>)}</ul> : <p>No outstanding steps from the demo rules.</p>}
          </details>
          <details className="verification-steps buyer-verification-details">
            <summary>Buyer verification history ({history.length})</summary>
            {history.length ? <ol className="buyer-check-history">{history.map(event => (
              <li key={event.id}>
                <strong>{checks.find(({ id }) => id === event.checkId)?.label}</strong>
                <span>{event.previousStatus} → {event.status}</span>
                <time dateTime={event.recordedAt}>{historyDate.format(new Date(event.recordedAt))} IST</time>
              </li>
            ))}</ol> : <p>{buyer ? "No buyer checklist changes yet." : "Continue with a demo buyer profile to view its history."}</p>}
          </details>
        </>
      )}
    </section>
  );
}
