"use client";

import { useActionState, useState } from "react";
import { decideListingAction, unlockAdminAction } from "../../app/admin/actions";
import type { ReviewDecision } from "../../lib/listing-review";

export function AdminAccessForm() {
  const [state, action, pending] = useActionState(unlockAdminAction, {});
  return (
    <form action={action} className="seller-form">
      <div className="seller-fields"><label>Local administrator key <input type="password" name="key" required maxLength={512} autoComplete="current-password" /></label></div>
      {state.error && <p className="seller-error" role="alert">{state.error}</p>}
      <div className="seller-actions"><button className="seller-primary" disabled={pending}>Unlock workspace</button></div>
    </form>
  );
}

export function ReviewDecisionForm({ listingId, decisions, flagged }: {
  listingId: string; decisions: readonly ReviewDecision[]; flagged: boolean;
}) {
  const [state, action, pending] = useActionState(decideListingAction, {});
  const [decision, setDecision] = useState<ReviewDecision>(decisions[0]);
  const [remarks, setRemarks] = useState("");
  const [restrictionRemarks, setRestrictionRemarks] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const flaggedApproval = flagged && decision === "Approved";

  return (
    <form action={action} className="seller-form">
      <input type="hidden" name="listingId" value={listingId} />
      <div className="seller-fields">
        <label>Decision <select name="decision" value={decision} onChange={event => {
          const chosen = decisions.find(option => option === event.target.value);
          if (chosen) setDecision(chosen);
        }}>{decisions.map(option => <option key={option}>{option}</option>)}</select></label>
        <label className="seller-field-wide">Decision remarks <textarea rows={3} name="remarks" required={decision !== "Under Review"} maxLength={1000} value={remarks} onChange={event => setRemarks(event.target.value)} /></label>
        {flaggedApproval && <label className="seller-field-wide">Additional restriction review remarks <textarea rows={3} name="restrictionRemarks" required maxLength={1000} value={restrictionRemarks} onChange={event => setRestrictionRemarks(event.target.value)} /></label>}
      </div>
      {flaggedApproval && (
        <fieldset className="seller-consents"><label><input type="checkbox" name="acknowledgeRestriction" required checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> I reviewed the synthetic restriction flag for demo marketplace publication.</label></fieldset>
      )}
      {state.error && <p className="seller-error" role="alert">{state.error}</p>}
      <div className="seller-actions"><button className="seller-primary" disabled={pending}>Record decision</button></div>
    </form>
  );
}
