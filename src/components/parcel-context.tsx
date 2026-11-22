import { demoParcels, type DemoParcel } from "../lib/demo-marketplace";
import { demoMapNotice } from "../lib/demo-map-background";

export function ParcelContext({ parcel }: { parcel: DemoParcel }) {
  const neighbours = demoParcels.filter(({ circle }) => circle === parcel.circle);
  const points = neighbours.flatMap(({ feature }) => feature.geometry.coordinates[0]);
  const longitudes = points.map(([lng]) => lng);
  const latitudes = points.map(([, lat]) => lat);
  const west = Math.min(...longitudes);
  const north = Math.max(...latitudes);
  const viewWidth = 320;
  const viewHeight = 148;
  const latitudeScale = Math.cos(north * Math.PI / 180);
  const width = (Math.max(...longitudes) - west) * latitudeScale;
  const height = north - Math.min(...latitudes);
  const scale = Math.min((viewWidth - 42) / width, (viewHeight - 32) / height);
  const left = (viewWidth - width * scale) / 2;
  const top = (viewHeight - height * scale) / 2;
  const orderedParcels = [...neighbours.filter(({ id }) => id !== parcel.id), parcel];

  return (
    <figure className="records-card parcel-context">
      <h2>Parcel context</h2>
      <svg viewBox="0 0 320 148" aria-hidden="true">
        <defs>
          <pattern id="parcel-context-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="#d3e2d5" />
          </pattern>
        </defs>
        <rect width="320" height="148" fill="url(#parcel-context-grid)" />
        {orderedParcels.map(({ id, feature }) => {
          const selected = id === parcel.id;
          const outline = feature.geometry.coordinates[0].map(([lng, lat]) =>
            [left + (lng - west) * latitudeScale * scale, top + (north - lat) * scale].join(","),
          ).join(" ");
          return <polygon key={id} points={outline} fill={selected ? "#c3ddc8" : "#e2eae2"} stroke={selected ? "#997717" : "#7b9781"} strokeWidth={selected ? 2.5 : 1.2} />;
        })}
      </svg>
      <figcaption><span /> {parcel.id} highlighted · {demoMapNotice}</figcaption>
    </figure>
  );
}
