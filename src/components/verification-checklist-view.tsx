"use client";

import { useActionState } from "react";
import type { DemoFormAction } from "../lib/demo-form";
import { buyerCheckStatuses,type BuyerCheckStatus } from "../lib/due-diligence";
import type { GovernmentCheckId } from "../lib/parcel-records";

export function BuyerCheckForm({ checkId, label, status, submit }: {
  submit: DemoFormAction;
  parcelId: string;
  checkId: GovernmentCheckId;
  label: string;
  status: BuyerCheckStatus;
}) {
  const [state, action, pending] = useActionState(submit, {});
  return (
    <form action={action} className="buyer-check-form">
      <div className="verification-controls">
        <label className="sr-only" htmlFor={"buyer-check-" + checkId}>Buyer status for {label}</label>
        <select key={status} id={"buyer-check-" + checkId} name="status" defaultValue={status} disabled={pending}>
          {buyerCheckStatuses.map((value) => <option key={value}>{value}</option>)}
        </select>
        <button type="submit" aria-label={"Save buyer status for " + label} className="open-parcel-record" disabled={pending}>Save</button>
      </div>
      {state.error && <p className="buyer-check-error" role="alert">{state.error}</p>}
    </form>
  );
}
