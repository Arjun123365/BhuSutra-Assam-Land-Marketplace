"use client";

import { useActionState } from "react";
import { decideListingAction,unlockAdminAction } from "../../app/admin/actions";
import { ReviewDecisionForm as View } from "./review-decision-view";

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

export function ReviewDecisionForm(props:Omit<Parameters<typeof View>[0],"submit">) {return <View {...props} submit={decideListingAction} />;}
