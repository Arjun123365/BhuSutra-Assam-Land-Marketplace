"use client";

import { useActionState, useState } from "react";
import { resubmitClarificationAction } from "../../app/seller/actions";

export function ClarificationForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(resubmitClarificationAction, {});
  const [response, setResponse] = useState("");

  return (
    <form action={action} className="seller-form">
      <input type="hidden" name="listingId" value={listingId} />
      <div className="seller-fields"><label className="seller-field-wide">Seller response
        <textarea name="response" rows={3} maxLength={1000} required value={response} onChange={event => setResponse(event.target.value)} />
      </label></div>
      {state.error && <p role="alert" className="seller-error">{state.error}</p>}
      <div className="seller-actions"><button type="submit" className="seller-primary" disabled={pending}>Resubmit for review</button></div>
    </form>
  );
}
