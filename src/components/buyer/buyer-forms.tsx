"use client";

import { useActionState, useState } from "react";
import { closeBuyerEnquiryAction, registerBuyerAction, sellerEnquiryAction, submitEnquiryAction } from "../../app/buyer/actions";
import { buyerTypes } from "../../lib/buyer-demo";
import { demoDistricts } from "../../lib/demo-marketplace";

export function BuyerRegistrationForm({ listingId, parcelId }: { listingId: string; parcelId: string }) {
  const [state, action, pending] = useActionState(registerBuyerAction, {});
  const [fields, setFields] = useState({ displayName: "", mobile: "", email: "", district: "", buyerType: "", consent: false });
  return (
    <form action={action} className="seller-form">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="parcelId" value={parcelId} />
      <div className="seller-fields">
        <label>Buyer display name <input name="displayName" required minLength={2} maxLength={60} value={fields.displayName} onChange={e => setFields({ ...fields, displayName: e.target.value })} /></label>
        <label>Test mobile number <input name="mobile" type="tel" inputMode="numeric" autoComplete="off" required pattern="00000[0-9]{5}" maxLength={10} placeholder="0000012345" value={fields.mobile} onChange={e => setFields({ ...fields, mobile: e.target.value })} /><small>Use 00000 followed by five digits.</small></label>
        <label>Test email (optional) <input name="email" type="email" maxLength={100} autoComplete="off" pattern=".+@.+[.][tT][eE][sS][tT]" value={fields.email} onChange={e => setFields({ ...fields, email: e.target.value })} /></label>
        <label><span id="buyer-district">District preference</span><select name="district" aria-labelledby="buyer-district" required value={fields.district} onChange={e => setFields({ ...fields, district: e.target.value })}>
          <option value="">Choose a district</option>{demoDistricts.map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label><span id="buyer-type">Buyer type</span><select name="buyerType" aria-labelledby="buyer-type" required value={fields.buyerType} onChange={e => setFields({ ...fields, buyerType: e.target.value })}>
          <option value="">Choose a type</option>{buyerTypes.map(value => <option key={value}>{value}</option>)}
        </select></label>
      </div>
      <fieldset className="seller-consents"><label><input name="consent" type="checkbox" required checked={fields.consent} onChange={e => setFields({ ...fields, consent: e.target.checked })} /> I consent to storing these fictional details for the demonstration.</label></fieldset>
      {state.error && <p className="seller-error" role="alert">{state.error}</p>}
      <div className="seller-actions"><button type="submit" className="seller-primary" disabled={pending}>Create demo buyer profile</button></div>
    </form>
  );
}

export function ExpressInterestForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(submitEnquiryAction, {});
  const [message, setMessage] = useState("");
  return (
    <form action={action} className="seller-form">
      <input type="hidden" name="listingId" value={listingId} />
      <div className="seller-fields"><label className="seller-field-wide">Demo enquiry message
        <textarea name="message" required maxLength={1000} rows={4} value={message} onChange={e => setMessage(e.target.value)} />
        <small>Use fictional information. Keep names, contact details and documents out of your message.</small>
      </label></div>
      {state.error && <p className="seller-error" role="alert">{state.error}</p>}
      <div className="seller-actions"><button type="submit" className="seller-primary" disabled={pending}>Send demo enquiry</button></div>
    </form>
  );
}

export function EnquiryActionForm({ enquiryId, mode }: { enquiryId: string; mode: "buyer-close" | "seller-close" | "view" | "respond" }) {
  const [state, action, pending] = useActionState(mode === "buyer-close" ? closeBuyerEnquiryAction : sellerEnquiryAction, {});
  const [response, setResponse] = useState("");
  const next = mode === "view" ? "Viewed" : mode === "respond" ? "Responded" : "Closed";
  return (
    <form action={action} className="seller-form enquiry-action">
      <input type="hidden" name="enquiryId" value={enquiryId} />
      <input type="hidden" name="next" value={next} />
      {mode === "respond" && <div className="seller-fields"><label className="seller-field-wide">Demo seller response
        <textarea name="response" rows={3} maxLength={1000} required value={response} onChange={e => setResponse(e.target.value)} />
        <small>Use fictional information and omit contact details.</small>
      </label></div>}
      {state.error && <p className="seller-error" role="alert">{state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
      <div className="seller-actions"><button type="submit" className={next === "Closed" ? "seller-secondary" : "seller-primary"} disabled={pending}>
        {mode === "view" ? "Mark Viewed" : mode === "respond" ? "Send demo response" : "Close enquiry"}
      </button></div>
    </form>
  );
}
