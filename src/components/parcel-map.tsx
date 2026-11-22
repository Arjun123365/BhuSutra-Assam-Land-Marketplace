"use client";

import { latLngBounds, type PathOptions } from "leaflet";
import { memo, useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { getActiveListing, getParcelStatus, type DemoParcel } from "../lib/demo-marketplace";
import { demoMapNotice } from "../lib/demo-map-background";
import { OfflineDemoBasemap } from "./offline-demo-basemap";

const defaultCenter: [number, number] = [26.827, 94.412];
const parcelColors: Record<ReturnType<typeof getParcelStatus>, PathOptions> = {
  listed: { color: "#14532d", fillColor: "#37a66a", fillOpacity: .66 },
  unlisted: { color: "#52615a", fillColor: "#a6afa9", fillOpacity: .67 },
  restricted: { color: "#8e4d08", fillColor: "#f1a842", fillOpacity: .78 },
};

type FocusRequest = { parcelId: string };

type ParcelMapProps = {
  parcels: DemoParcel[];
  selectedId?: string;
  focusRequest?: FocusRequest | null;
  onSelect: (id: string) => void;
  preview?: boolean;
};

function parcelBounds(parcels: DemoParcel[]) {
  return latLngBounds(parcels.flatMap(({ feature }) =>
    feature.geometry.coordinates[0].map(([longitude, latitude]): [number, number] => [latitude, longitude]),
  ));
}

function fitParcels(map: ReturnType<typeof useMap>, bounds: ReturnType<typeof parcelBounds>, maxZoom: number, padding: number) {
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [padding, padding], maxZoom, animate: false });
  }
}

function CircleOverview({ parcels }: { parcels: DemoParcel[] }) {
  const [showMarkers, setShowMarkers] = useState(false);
  const map = useMapEvents({
    zoomend() { setShowMarkers(map.getZoom() < 15); },
  });
  const circles = useMemo(() => {
    const groups = new Map<DemoParcel["circle"], DemoParcel[]>();
    for (const parcel of parcels) {
      const group = groups.get(parcel.circle);
      if (group) group.push(parcel);
      else groups.set(parcel.circle, [parcel]);
    }
    return [...groups].map(([circle, group]) => ({
      circle,
      district: group[0].district,
      bounds: parcelBounds(group),
      count: group.length,
    }));
  }, [parcels]);

  if (!showMarkers) return null;

  // Individual parcels can project to less than a pixel at the district overview scale.
  return circles.map(({ circle, district, bounds, count }) => (
    <CircleMarker
      key={circle}
      center={bounds.getCenter()}
      radius={7}
      className="demo-circle-overview"
      pathOptions={{ color: "#14532d", fillColor: "#eff8f1", fillOpacity: 1, weight: 2 }}
      bubblingMouseEvents={false}
      eventHandlers={{ click: () => fitParcels(map, bounds, 17, 26) }}
    >
      <Tooltip direction="top">{district} · {circle} · {count} {count === 1 ? "demo parcel" : "demo parcels"}</Tooltip>
    </CircleMarker>
  ));
}

function MapViewport({ parcels, focusRequest, preview }: Pick<ParcelMapProps, "parcels" | "focusRequest" | "preview">) {
  const map = useMap();
  const bounds = useMemo(() => parcelBounds(parcels), [parcels]);

  useEffect(() => {
    const focusedParcel = parcels.find(({ id }) => id === focusRequest?.parcelId);
    fitParcels(map, focusedParcel ? parcelBounds([focusedParcel]) : bounds, focusedParcel ? 18 : 17, preview ? 10 : 26);
  }, [bounds, focusRequest, map, parcels, preview]);

  return preview ? null : (
    <button type="button" className="fit-parcels" onClick={() => fitParcels(map, bounds, 17, 26)}>
      Fit parcels
    </button>
  );
}

const ParcelPolygon = memo(function ParcelPolygon({ parcel, selected, onSelect }: {
  parcel: DemoParcel; selected: boolean; onSelect: ParcelMapProps["onSelect"];
}) {
  const style = useMemo(() => ({
    ...parcelColors[getParcelStatus(parcel)],
    className: "demo-parcel parcel-" + parcel.id,
    ...(selected ? { color: "#d4af37", weight: 4 } : { weight: 2 }),
  }), [parcel, selected]);
  const events = useMemo(() => ({ click: () => onSelect(parcel.id) }), [onSelect, parcel.id]);
  return (
    <GeoJSON data={parcel.feature} style={style} eventHandlers={events}>
      <Tooltip direction="top">{parcel.id} · {parcel.circle}{getActiveListing(parcel) ? " · Listed for sale" : ""}</Tooltip>
    </GeoJSON>
  );
});

export default function ParcelMap({ parcels, selectedId, focusRequest, onSelect, preview = false }: ParcelMapProps) {
  return (
    <div className="parcel-map" data-basemap="offline-demo">
      <MapContainer
        className="parcel-map-canvas"
        center={defaultCenter}
        zoom={16}
        minZoom={5}
        maxZoom={19}
        zoomControl={!preview}
        zoomAnimation={false}
        scrollWheelZoom={false}
        dragging={!preview}
        touchZoom={!preview}
        doubleClickZoom={!preview}
        boxZoom={!preview}
        keyboard={!preview}
      >
        <OfflineDemoBasemap />
        {parcels.map(parcel => <ParcelPolygon key={parcel.id} parcel={parcel} selected={parcel.id === selectedId} onSelect={onSelect} />)}
        {!preview && <CircleOverview parcels={parcels} />}
        <MapViewport parcels={parcels} focusRequest={focusRequest} preview={preview} />
      </MapContainer>
      <p className="basemap-notice" role="note">{demoMapNotice}. <span>Offline basemap · decorative field pattern only.</span></p>
    </div>
  );
}
