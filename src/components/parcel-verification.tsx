import { CheckCircle2, ChevronDown, ClipboardCheck, Info } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { assistanceStartHref } from "../lib/assistance";
import { interestHref } from "../lib/buyer-demo";
import type { DemoParcel } from "../lib/demo-marketplace";
import { recordStatusLabels, unavailableGovernmentStatus, type RecordStatus } from "../lib/parcel-records";
import { getParcelVerification, verificationHref, verificationSteps, verificationTitleNotice, type Fields, type ParcelGovernmentRecords } from "../lib/verification-model";

function Status({ status }: { status: RecordStatus }) {
  return <span className="records-status" data-status={status}>{recordStatusLabels[status]}</span>;
}

function RecordFields({ fields }: { fields: Fields }) {
  return (
    <dl className="record-field-grid">
      {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  );
}

export function VerificationStatusSummary({ parcel, records, dashboard = false }: {
  parcel: DemoParcel;
  records: ParcelGovernmentRecords;
  dashboard?: boolean;
}) {
  const { checks, missingChecks } = getParcelVerification(parcel, records);
  return (
    <section className="records-card verification-status-summary" aria-labelledby="verification-status-title">
      <div>
        <h2 id="verification-status-title">Government verification status</h2>
        <p>{missingChecks === checks.length
          ? <><strong>{unavailableGovernmentStatus}</strong> · All {checks.length} checks unavailable.</>
          : <>{missingChecks} of {checks.length} checks unavailable. See individual checks below.</>}</p>
      </div>
      {!dashboard && <Link className="open-parcel-record" href={verificationHref(parcel.id)}>Open buyer verification workspace</Link>}
    </section>
  );
}

export function ParcelVerification({ parcel, records, embedded = false, context, workspace }: {
  parcel: DemoParcel;
  records?: ParcelGovernmentRecords;
  embedded?: boolean;
  context?: ReactNode;
  workspace?: ReactNode;
}) {
  const { listing, checks, missingChecks, parcelFields, sellerFields } = getParcelVerification(parcel, records);
  const Heading = embedded ? "h3" : "h2";

  const summary = (
    <section className="records-card due-diligence" aria-labelledby="due-diligence-title">
      <div className="records-card-heading">
        <Heading id="due-diligence-title"><ClipboardCheck size={18} aria-hidden="true" /> Buyer due diligence</Heading>
      </div>
      <dl className="due-diligence-facts">
        <div><dt>Available parcel information</dt><dd><Status status="demo" /> Identifiers, location and land attributes</dd></div>
        <div><dt>Missing Government checks</dt><dd><Status status="not-connected" /> {missingChecks} of {checks.length} checks unavailable</dd></div>
        <div>
          <dt>Seller declarations</dt>
          <dd>{listing
            ? <><Status status="seller-declared" /> Unverified indicative price and demo listing consent</>
            : "No active seller listing in the demo"}</dd>
        </div>
        <div>
          <dt>Demonstration risk flags</dt>
          <dd>{parcel.restriction
            ? <><Status status="needs-review" /> {parcel.restriction} · synthetic flag</>
            : "No demo flag recorded. Official restrictions remain unverified."}</dd>
        </div>
      </dl>
      <details className="verification-steps" open={embedded ? undefined : true}>
        <summary>Suggested next verification steps <ChevronDown size={15} aria-hidden="true" /></summary>
        <ul>
          {verificationSteps.map(({ id, label }) => <li key={id}><CheckCircle2 size={15} aria-hidden="true" /> {label}</li>)}
        </ul>
      </details>
      <p className="records-title-notice"><Info size={16} aria-hidden="true" /> {verificationTitleNotice}</p>
    </section>
  );

  const governmentRecords = (
    <div className="government-record-list">
      {checks.map(({ id, label, unavailable, result }) => (
        <details key={id} className="government-record">
          <summary>
            <span>{label}</span><Status status={result.status} /><ChevronDown size={15} aria-hidden="true" />
          </summary>
          <div className="government-record-body">
            <dl>
              <div><dt>Source category</dt><dd>Authorised Government records</dd></div>
              <div><dt>Verification status</dt><dd>{result.status === "not-connected" ? unavailableGovernmentStatus : recordStatusLabels[result.status]}</dd></div>
              {result.status === "government-verified" && (
                <>
                  <div><dt>Recorded value</dt><dd>{result.value}</dd></div>
                  <div><dt>Last checked</dt><dd><time dateTime={result.checkedAt}>{result.checkedAt}</time></dd></div>
                </>
              )}
            </dl>
            {result.status === "not-connected" && <p>{unavailable}</p>}
          </div>
        </details>
      ))}
    </div>
  );

  const fields = (
    <>
      <section className="records-card" aria-labelledby="synthetic-record-title">
        <div className="records-card-heading"><Heading id="synthetic-record-title">Synthetic demonstration record</Heading><Status status="demo" /></div>
        <RecordFields fields={parcelFields} />
      </section>

      <section className="records-card" aria-labelledby="seller-record-title">
        <div className="records-card-heading">
          <Heading id="seller-record-title">Seller declarations</Heading>
          {listing && <Status status="seller-declared" />}
        </div>
        <RecordFields fields={sellerFields} />
        {listing?.listingId && <div className="parcel-record-actions">
          <Link href={interestHref(listing.listingId)} className="listing-enquiry-link parcel-enquiry-link">Express Interest</Link>
          <Link href={assistanceStartHref(listing.listingId)} className="listing-enquiry-link parcel-enquiry-link">Transaction assistance</Link>
        </div>}
      </section>

      {embedded ? (
        <details className="records-card government-records-fold">
          <summary>
            <span>Government record checks</span><Status status="not-connected" /><ChevronDown size={15} aria-hidden="true" />
          </summary>
          {governmentRecords}
        </details>
      ) : (
        <section className="records-card government-records" aria-labelledby="government-record-title">
          <div className="records-card-heading"><Heading id="government-record-title">Official Government record checks</Heading></div>
          {governmentRecords}
        </section>
      )}
    </>
  );

  return (
    <div className="parcel-verification" data-embedded={embedded}>
      {workspace ?? summary}
      <div className="record-sections">{fields}</div>
      {context}
    </div>
  );
}
