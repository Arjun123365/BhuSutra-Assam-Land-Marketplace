"use client";

import { useActionState, useState } from "react";
import { withdrawListingAction } from "../../app/seller/actions";

export function WithdrawalForm({ listingId, parcelId, approved }: { listingId: string; parcelId: string; approved: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(withdrawListingAction, {});
  if (!confirming) return <button type="button" className="seller-secondary seller-withdraw" onClick={() => setConfirming(true)}>Withdraw</button>;

  return (
    <form action={action} className="seller-withdraw-confirm" aria-label={"Withdraw " + parcelId}>
      <input type="hidden" name="listingId" value={listingId} />
      <p>{approved ? "Remove this approved listing from the public demo marketplace?" : "Withdraw this demo request?"}</p>
      {state.error && <p className="seller-error" role="alert">{state.error}</p>}
      <div className="seller-actions">
        <button type="button" className="seller-secondary" onClick={() => setConfirming(false)}>Cancel</button>
        <button type="submit" className="seller-primary" disabled={pending}>Confirm withdrawal</button>
      </div>
    </form>
  );
}
