"use client";

import { Info, MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { demoDistricts, demonstrationArea, getActiveListing, getParcelStatus, type DemoParcel } from "../lib/demo-marketplace";
import { ParcelDetails } from "./parcel-details";
import { ParcelMap } from "./parcel-map-loader";

const parcelLabels = {
  listed: "Listed for sale",
  unlisted: "Not listed",
  restricted: "Demo restriction flag",
};

function parcelsInDistrict(parcels: DemoParcel[], district: string) {
  return district ? parcels.filter((parcel) => parcel.district === district) : parcels;
}

function circlesWithParcels(parcels: DemoParcel[]) {
  return [...new Set(parcels.map(({ circle }) => circle))].sort();
}

const allDistrictsLabel = "All three districts";
const allCirclesLabel = "All demo circles";

export function ExploreMarketplace({ initialParcel, marketplaceParcels }: { initialParcel?: DemoParcel; marketplaceParcels: DemoParcel[] }) {
  const [district, setDistrict] = useState<string>(initialParcel?.district ?? demonstrationArea.district);
  const [circle, setCircle] = useState<string>(initialParcel?.circle ?? demonstrationArea.circle);
  const [selectedId, setSelectedId] = useState(initialParcel?.id);
  const [focusRequest, setFocusRequest] = useState(initialParcel ? { parcelId: initialParcel.id } : null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const parcelList = useRef<HTMLUListElement>(null);
  const selectionFrame = useRef<number | null>(null);
  useEffect(() => () => {
    if (selectionFrame.current !== null) cancelAnimationFrame(selectionFrame.current);
  }, []);

  const districtParcels = useMemo(() => parcelsInDistrict(marketplaceParcels, district), [marketplaceParcels, district]);
  const circles = circlesWithParcels(districtParcels);
  const parcels = useMemo(() => districtParcels.filter((parcel) => !circle || parcel.circle === circle), [districtParcels, circle]);
  const selectedParcel = parcels.find(({ id }) => id === selectedId);

  function updateFilters(nextDistrict: string, nextCircle: string) {
    setDistrict(nextDistrict);
    setCircle(nextCircle);
    setSelectedId(undefined);
    setFocusRequest(null);
  }

  function changeDistrict(nextDistrict: string) {
    const nextCircles = circlesWithParcels(parcelsInDistrict(marketplaceParcels, nextDistrict));
    updateFilters(nextDistrict, nextCircles.length === 1 ? nextCircles[0] : "");
  }

  const selectParcel = useCallback((id: string, fromList = false) => {
    setSelectedId(id);
    if (fromList) setFocusRequest({ parcelId: id });

    if (selectionFrame.current !== null) cancelAnimationFrame(selectionFrame.current);
    selectionFrame.current = requestAnimationFrame(() => {
      const heading = detailHeading.current;
      if (!heading) return;
      if (fromList) heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: "nearest" });

      const list = parcelList.current;
      const selected = list?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
      if (list && selected) {
        const frame = list.getBoundingClientRect();
        const row = selected.getBoundingClientRect();
        if (row.top < frame.top) list.scrollTop += row.top - frame.top;
        if (row.bottom > frame.bottom) list.scrollTop += row.bottom - frame.bottom;
      }
    });
  }, []);

  return (
    <>
      <section className="explore-intro" aria-labelledby="explore-title">
        <div className="shell">
          <h1 id="explore-title">Explore Land Across Assam</h1>
          <p><MapPin size={17} aria-hidden="true" /> Select a district and Revenue Circle to explore available land parcels.</p>
          <p className="prototype-notice"><Info size={15} aria-hidden="true" /> NESFIC Demonstration Prototype — Uses Synthetic Data. Not an Official Government Portal.</p>
        </div>
      </section>

      <div className="shell explore-workspace">
        <div className="explore-map-column">
          <div className="parcel-filter-bar" role="group" aria-label="Filter demo parcels">
            <label>District
              <select aria-label="District" value={district} onChange={(event) => changeDistrict(event.target.value)}>
                <option value="">{allDistrictsLabel}</option>
                {demoDistricts.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label>Revenue Circle
              <select aria-label="Revenue Circle" value={circle} disabled={!district} onChange={(event) => updateFilters(district, event.target.value)}>
                {(!district || circles.length !== 1) && <option value="">{allCirclesLabel}</option>}
                {district && circles.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <a className="parcel-list-link" href="#parcel-list">Go to parcel list</a>
            <p className="parcel-viewing-location" role="status">
              Currently viewing: <strong>{district || allDistrictsLabel} → {circle || allCirclesLabel}</strong> · {parcels.length} {parcels.length === 1 ? "demo parcel" : "demo parcels"}
            </p>
          </div>

          <section id="demo-map" className="explore-map-panel" aria-labelledby="map-title" tabIndex={-1}>
            <div className="explore-map-header">
              <h2 id="map-title">Demo parcel map</h2>
              <p>Boundaries are illustrative. Official cadastral boundaries are unavailable.</p>
              <p className="map-selection-indicator" role="status">
                <span aria-hidden="true" /> {selectedParcel ? "Selected " + selectedParcel.id + " · " + selectedParcel.category + " · " + selectedParcel.area + " " + selectedParcel.areaUnit : "Select a parcel on the map or from the list"}
              </p>
              {!circle && <p>Select a circle marker or a parcel from the list to zoom in.</p>}
            </div>
            {parcels.length > 0 ? (
              <>
                <ParcelMap parcels={parcels} selectedId={selectedId} focusRequest={focusRequest} onSelect={selectParcel} />
                <ul className="parcel-legend" aria-label="Map legend">
                  {Object.entries(parcelLabels).map(([status, label]) => (
                    <li key={status}><span className="parcel-swatch" data-status={status} /> {label}</li>
                  ))}
                  <li><span className="parcel-swatch" data-status="selected" /> Selected parcel</li>
                </ul>
              </>
            ) : (
              <div className="parcel-location-empty">
                <MapPin size={22} aria-hidden="true" />
                <p>No demonstration parcels available for this location</p>
                <span>Choose another district or Revenue Circle to continue.</span>
              </div>
            )}
          </section>
        </div>

        <aside className="explore-sidebar" aria-label="Parcel details and accessible list">
          {parcels.length > 0 && <ParcelDetails parcel={selectedParcel} headingRef={detailHeading} />}

          <section id="parcel-list" className="parcel-list-panel" aria-labelledby="parcel-list-title" tabIndex={-1}>
            <div className="parcel-list-header">
              <h2 id="parcel-list-title">Parcel list</h2>
              <p>{parcels.length} {parcels.length === 1 ? "demo parcel" : "demo parcels"}</p>
            </div>
            <ul ref={parcelList}>
              {parcels.map((parcel) => {
                const status = getParcelStatus(parcel);
                return (
                  <li key={parcel.id}>
                    <button type="button" aria-pressed={parcel.id === selectedId} onClick={() => selectParcel(parcel.id, true)}>
                      <span className="parcel-swatch" data-status={status} aria-hidden="true" />
                      <span className="parcel-list-entry">
                        <strong>{parcel.id} · {parcel.category}</strong>
                        <small>{parcel.district} → {parcel.circle}</small>
                        <small>Dag {parcel.dagNumber} · Patta {parcel.pattaNumber}</small>
                        <small>{parcel.area} {parcel.areaUnit} · {status === "restricted" && getActiveListing(parcel) ? "Listed for sale · " : ""}{parcelLabels[status]}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
