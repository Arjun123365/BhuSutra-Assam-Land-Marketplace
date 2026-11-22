"use client";

import { useActionState, useState } from "react";
import { switchDemoBuyerAction, unlockBuyerSwitchAction } from "../../app/buyer/switch/actions";
import type { DemoBuyerSwitchProfile } from "../../lib/buyer-switch-policy";

export function UnlockBuyerSwitchForm() {
  const [state, action, pending] = useActionState(unlockBuyerSwitchAction, {});
  return (
    <form action={action} className="seller-form">
      <div className="seller-fields"><label>Local buyer-switch key <input type="password" name="key" required minLength={20} maxLength={512} autoComplete="current-password" /></label></div>
      {state.error && <p role="alert" className="seller-error">{state.error}</p>}
      <div className="seller-actions"><button type="submit" className="seller-primary" disabled={pending}>Unlock buyer switching</button></div>
    </form>
  );
}

export function SwitchDemoBuyerForm({ profiles, activeId }: { profiles: DemoBuyerSwitchProfile[]; activeId?: string }) {
  const [state, action, pending] = useActionState(switchDemoBuyerAction, {});
  const [selected, setSelected] = useState("");
  return (
    <form action={action} className="seller-form">
      <fieldset className="seller-profile-options">
        <legend>Existing fictional buyer profiles</legend>
        {profiles.map(profile => (
          <label className="seller-profile-option" key={profile.id}>
            <input type="radio" name="buyerId" value={profile.id} checked={selected === profile.id} onChange={() => setSelected(profile.id)} required />
            <span>
              <strong>{profile.displayName}</strong>{profile.id === activeId && <span className="seller-status">Active</span>}
              <small>Demo buyer ID {profile.id}</small>
              <small>{profile.enquiryCount} {profile.enquiryCount === 1 ? "enquiry" : "enquiries"} · {profile.assistanceCount} assistance requests</small>
            </span>
          </label>
        ))}
      </fieldset>
      {state.error && <p role="alert" className="seller-error">{state.error}</p>}
      <div className="seller-actions"><button type="submit" className="seller-primary" disabled={pending || !selected}>Switch Demo Buyer</button></div>
    </form>
  );
}
