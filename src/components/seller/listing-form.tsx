"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { saveListingAction } from "../../app/seller/actions";
import { demoDistricts, type DemoParcel } from "../../lib/demo-marketplace";
import { contactPreferences, demoImage, emptyListingDetails, saleCategories, type DemoListing, type ParcelReservation } from "../../lib/seller-demo";

type ParcelOption = Pick<DemoParcel, "id" | "district" | "circle" | "dagNumber" | "pattaNumber" | "pattaType" | "area" | "areaUnit" | "category" | "restriction">;
type Step = 1 | 2 | 3;

export function ListingForm({ parcels, district, hasEmail, draft, blocked }: {
  parcels: ParcelOption[];
  district: string;
  hasEmail: boolean;
  draft?: DemoListing;
  blocked: ParcelReservation[];
}) {
  const initialParcel = parcels.find(parcel => parcel.id === draft?.parcelId);
  const [state, action, pending] = useActionState(saveListingAction, {});
  const [step, setStep] = useState<Step>(1);
  const [selectedDistrict, setDistrict] = useState<string>(initialParcel?.district ?? district);
  const [circle, setCircle] = useState<string>(initialParcel?.circle ?? "");
  const [query, setQuery] = useState("");
  const [parcelId, setParcelId] = useState(initialParcel?.id ?? "");
  const [details, setDetails] = useState(draft?.details ?? emptyListingDetails);
  const form = useRef<HTMLFormElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const districtParcels = parcels.filter(parcel => parcel.district === selectedDistrict);
  const circles = [...new Set(districtParcels.map(parcel => parcel.circle))].sort();
  const needle = query.trim().toLowerCase();
  const matches = districtParcels.filter(parcel =>
    (!circle || parcel.circle === circle) &&
    [parcel.id, parcel.dagNumber, parcel.pattaNumber].some(value => value.toLowerCase().includes(needle)),
  );
  const selected = parcels.find(parcel => parcel.id === parcelId);
  const blockingStatus = new Map(blocked.map(item => [item.parcelId, item.status]));
  const matchingReservations = blocked.filter(item => matches.some(parcel => parcel.id === item.parcelId));

  function move(next: Step) {
    setStep(next);
    requestAnimationFrame(() => stepHeading.current?.focus());
  }

  function clearSelection() {
    setParcelId("");
    setDetails(current => ({ ...current, acknowledgeRestriction: false }));
  }

  return (
    <form action={action} ref={form} className="seller-form">
      <input type="hidden" name="draftId" value={draft?.id ?? ""} />
      <ol className="seller-progress" aria-label="Listing progress">
        {["Choose parcel", "Listing details", "Review and consent"].map((label, index) => (
          <li key={label} aria-current={step === index + 1 ? "step" : undefined}><span>{index + 1}</span>{label}</li>
        ))}
      </ol>
      <h2 tabIndex={-1} ref={stepHeading}>{["Choose a parcel", "Describe your listing", "Review and consent"][step - 1]}</h2>

      <fieldset hidden={step !== 1} className="seller-step" aria-label="Parcel selection">
        <div className="seller-fields">
          <label><span id="listing-district">District</span>
            <select aria-labelledby="listing-district" value={selectedDistrict} onChange={e => { setDistrict(e.target.value); setCircle(""); setQuery(""); clearSelection(); }}>
              {demoDistricts.map(name => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label><span id="listing-circle">Revenue Circle</span>
            <select aria-labelledby="listing-circle" value={circle} onChange={e => { setCircle(e.target.value); clearSelection(); }}>
              <option value="">All demo circles</option>
              {circles.map(name => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label>Find by parcel ID, Dag or Patta
            <input value={query} maxLength={30} onChange={e => { setQuery(e.target.value); clearSelection(); }} />
          </label>
          <label><span id="listing-parcel">Demo parcel</span>
            <select aria-labelledby="listing-parcel" name="parcelId" required={step === 1} value={parcelId} onChange={e => {
              setParcelId(e.target.value);
              setDetails(current => ({ ...current, acknowledgeRestriction: false }));
            }}>
              <option value="">Choose parcel</option>
              {matches.map(parcel => {
                const status = blockingStatus.get(parcel.id);
                return <option key={parcel.id} value={parcel.id} disabled={Boolean(status)}>
                  {parcel.id}{status ? " · " + status + " (unavailable)" : ""} · Dag {parcel.dagNumber} · Patta {parcel.pattaNumber}
                </option>;
              })}
            </select>
          </label>
        </div>
        {!matches.length && <p role="status">No demo parcels match this search.</p>}
        <p className="seller-hint">Parcels with an active request or approved listing are unavailable.</p>
        {matchingReservations.length > 0 && (
          <ul className="seller-availability" aria-label="Parcel availability">
            {matchingReservations.map(reservation => (
              <li key={reservation.parcelId}>
                <strong>{reservation.parcelId}</strong> · {reservation.ownDraftId ? "Reserved by your draft" : "Unavailable · " + reservation.status}
                {reservation.ownDraftId && <> · <Link href={"/seller/list-property?draft=" + encodeURIComponent(reservation.ownDraftId)}>Resume your draft</Link></>}
              </li>
            ))}
          </ul>
        )}
        {selected && (
          <div className="seller-preview">
            <h3>Selected synthetic parcel · {selected.id}</h3>
            <dl className="seller-facts">
              <div><dt>District / Revenue Circle</dt><dd>{selected.district} / {selected.circle}</dd></div>
              <div><dt>Dag / Patta</dt><dd>{selected.dagNumber} / {selected.pattaNumber}</dd></div>
              <div><dt>Land area and classification</dt><dd>{selected.area} {selected.areaUnit} · {selected.category}</dd></div>
              <div><dt>Patta type</dt><dd>{selected.pattaType}</dd></div>
              <div><dt>Government verification</dt><dd>Not connected / Not verified</dd></div>
            </dl>
            {selected.restriction && <p className="seller-warning"><strong>Review required.</strong> {selected.restriction} is a synthetic restriction flag. Transaction eligibility is unverified.</p>}
          </div>
        )}
      </fieldset>

      <fieldset hidden={step !== 2} className="seller-step" aria-label="Seller-declared details">
        <div className="seller-fields">
          <label>Asking price (INR)
            <input name="askingPrice" type="number" min="0.01" max="1000000000" step="0.01" required={step === 2} value={details.askingPrice} onChange={e => setDetails({ ...details, askingPrice: e.target.value })} />
          </label>
          <label><span id="listing-category">Intended sale category (optional)</span>
            <select aria-labelledby="listing-category" name="saleCategory" value={details.saleCategory} onChange={e => setDetails({ ...details, saleCategory: e.target.value })}>
              <option value="">Unspecified</option>
              {saleCategories.map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label><span id="listing-image">Demo image (optional)</span>
            <select aria-labelledby="listing-image" name="image" value={details.image} onChange={e => setDetails({ ...details, image: e.target.value })}>
              <option value="">No image</option>
              <option value={demoImage}>Local parcel illustration</option>
            </select>
          </label>
          <label><span id="listing-contact">Contact preference</span>
            <select aria-labelledby="listing-contact" name="contactPreference" value={details.contactPreference} onChange={e => setDetails({ ...details, contactPreference: e.target.value })}>
              {contactPreferences.map(value => <option key={value} disabled={value === "Demo email" && !hasEmail}>{value}</option>)}
            </select>
          </label>
          <label className="seller-field-wide">Property description
            <textarea name="description" required={step === 2} minLength={10} maxLength={600} rows={4} value={details.description} onChange={e => setDetails({ ...details, description: e.target.value })} />
            <small>10–600 characters. Keep ownership names, documents and contact details out of the description.</small>
          </label>
        </div>
      </fieldset>

      <fieldset hidden={step !== 3} className="seller-step seller-consents" aria-label="Declarations and consent">
        <p><strong>{selected?.id} · {selected?.district} / {selected?.circle}</strong> · Asking price ₹{details.askingPrice}</p>
        <label><input type="checkbox" name="declaration" required={step === 3} checked={details.declaration} onChange={e => setDetails({ ...details, declaration: e.target.checked })} /> I declare ownership or lawful authority for this synthetic parcel in the demonstration.</label>
        <label><input type="checkbox" name="consent" required={step === 3} checked={details.consent} onChange={e => setDetails({ ...details, consent: e.target.checked })} /> I voluntarily consent to submitting this demo listing request.</label>
        <label><input type="checkbox" name="acknowledgePending" required={step === 3} checked={details.acknowledgePending} onChange={e => setDetails({ ...details, acknowledgePending: e.target.checked })} /> I understand verification and approval are pending and this request does not certify legal title.</label>
        {selected?.restriction && <label className="seller-warning"><input type="checkbox" name="acknowledgeRestriction" required={step === 3} checked={details.acknowledgeRestriction} onChange={e => setDetails({ ...details, acknowledgeRestriction: e.target.checked })} /> I understand the demo restriction requires review.</label>}
      </fieldset>
      {state.error && <p className="seller-error" role="alert">{state.error}</p>}
      <div className="seller-actions">
        {step > 1 && <button type="button" className="seller-secondary" onClick={() => move(step === 3 ? 2 : 1)}>Back</button>}
        <button type="submit" name="intent" value="draft" formNoValidate className="seller-secondary" disabled={pending || !selected}>Save draft</button>
        {step < 3
          ? <button type="button" className="seller-primary" onClick={() => {
            const fields = form.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("fieldset:not([hidden]) :is(input, select, textarea)");
            if (fields && [...fields].every(field => field.reportValidity())) move(step === 1 ? 2 : 3);
          }}>Continue</button>
          : <button type="submit" name="intent" value="submit" className="seller-primary" disabled={pending}>{pending ? "Saving…" : "Submit for demo review"}</button>}
      </div>
    </form>
  );
}
