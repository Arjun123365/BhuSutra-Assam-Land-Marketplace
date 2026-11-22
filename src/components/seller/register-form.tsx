"use client";

import { useActionState, useState } from "react";
import { registerSellerAction } from "../../app/seller/actions";
import { demoDistricts } from "../../lib/demo-marketplace";
import { sellerTypes } from "../../lib/seller-demo";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerSellerAction, {});
  const [profile, setProfile] = useState({ displayName: "", mobile: "", email: "", district: "", sellerType: "", processingConsent: false, terms: false });

  return (
    <form action={action} className="seller-form">
      <div className="seller-fields">
        <label>Seller display name
          <input name="displayName" required minLength={2} maxLength={60} value={profile.displayName} onChange={e => setProfile({ ...profile, displayName: e.target.value })} />
        </label>
        <label>Test mobile number
          <input name="mobile" type="tel" inputMode="numeric" autoComplete="off" required pattern="00000[0-9]{5}" maxLength={10} placeholder="0000012345" aria-describedby="demo-mobile-hint" value={profile.mobile} onChange={e => setProfile({ ...profile, mobile: e.target.value })} />
          <small id="demo-mobile-hint">Use 00000 followed by five digits.</small>
        </label>
        <label>Test email (optional)
          <input name="email" type="email" autoComplete="off" pattern=".+@.+[.][tT][eE][sS][tT]" maxLength={100} placeholder="grower@example.test" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
        </label>
        <label><span id="register-district">District</span>
          <select aria-labelledby="register-district" name="district" required value={profile.district} onChange={e => setProfile({ ...profile, district: e.target.value })}>
            <option value="">Choose district</option>
            {demoDistricts.map(district => <option key={district}>{district}</option>)}
          </select>
        </label>
        <label><span id="register-type">Seller type</span>
          <select aria-labelledby="register-type" name="sellerType" required value={profile.sellerType} onChange={e => setProfile({ ...profile, sellerType: e.target.value })}>
            <option value="">Choose seller type</option>
            {sellerTypes.map(type => <option key={type}>{type}</option>)}
          </select>
        </label>
      </div>
      <fieldset className="seller-consents">
        <legend>Demonstration consent</legend>
        <label><input type="checkbox" name="processingConsent" required checked={profile.processingConsent} onChange={e => setProfile({ ...profile, processingConsent: e.target.checked })} /> I consent to storing these fictional details for the demo.</label>
        <label><input type="checkbox" name="terms" required checked={profile.terms} onChange={e => setProfile({ ...profile, terms: e.target.checked })} /> I accept the prototype terms and will use only fictional information.</label>
        <small>Profiles and listing requests are stored on this local installation for testing the demonstration workflow.</small>
      </fieldset>
      {state.error && <p className="seller-error" role="alert">{state.error}</p>}
      <div className="seller-actions">
        <button type="submit" className="seller-primary" disabled={pending}>{pending ? "Registering…" : "Create demo profile"}</button>
      </div>
    </form>
  );
}
