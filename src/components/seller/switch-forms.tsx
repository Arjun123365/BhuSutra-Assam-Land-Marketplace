"use client";

import { useActionState, useState } from "react";
import { switchDemoSellerAction, unlockSellerSwitchAction } from "../../app/seller/switch/actions";
import type { DemoSellerProfile } from "../../lib/seller-demo";

export function UnlockSellerSwitchForm() {
  const [state, action, pending] = useActionState(unlockSellerSwitchAction, {});
  return (
    <form action={action} className="seller-form">
      <div className="seller-fields"><label>Local seller-switch key <input type="password" name="key" required maxLength={512} autoComplete="current-password" /></label></div>
      {state.error && <p role="alert" className="seller-error">{state.error}</p>}
      <div className="seller-actions"><button type="submit" className="seller-primary" disabled={pending}>Unlock seller switching</button></div>
    </form>
  );
}

export function SwitchDemoSellerForm({ profiles, activeId }: { profiles: DemoSellerProfile[]; activeId?: string }) {
  const [state, action, pending] = useActionState(switchDemoSellerAction, {});
  const [selected, setSelected] = useState("");
  return (
    <form action={action} className="seller-form">
      <fieldset className="seller-profile-options">
        <legend>Existing fictional profiles</legend>
        {profiles.map(profile => (
          <label className="seller-profile-option" key={profile.id}>
            <input type="radio" name="sellerId" value={profile.id} checked={selected === profile.id} onChange={() => setSelected(profile.id)} required />
            <span>
              <strong>{profile.displayName}</strong>{profile.id === activeId && <span className="seller-status">Active</span>}
              <small>Demo seller ID {profile.id}</small>
              <small>{profile.listingCount} {profile.listingCount === 1 ? "listing request" : "listing requests"}</small>
            </span>
          </label>
        ))}
      </fieldset>
      {state.error && <p role="alert" className="seller-error">{state.error}</p>}
      <div className="seller-actions"><button type="submit" className="seller-primary" disabled={pending || !selected}>Switch Demo Seller</button></div>
    </form>
  );
}
