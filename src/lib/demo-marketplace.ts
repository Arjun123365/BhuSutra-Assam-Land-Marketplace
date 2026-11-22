import type { Feature, Polygon } from "geojson";

export const demonstrationArea = { district: "Jorhat", circle: "Teok" };

const circleAreas = {
  Teok: { district: "Jorhat", center: [94.412, 26.827] },
  Mariani: { district: "Jorhat", center: [94.311, 26.654] },
  Boko: { district: "Kamrup", center: [91.247, 25.979] },
  Chabua: { district: "Dibrugarh", center: [95.168, 27.478] },
} as const;

type RevenueCircle = keyof typeof circleAreas;
export type LandCategory = "Agricultural" | "Residential" | "Commercial";
type ConsentedListing = { voluntaryConsent: true; title: string; price: number; seeded?: boolean; restrictionReviewed?: boolean; listingId?: string };
type ParcelSeed = {
  id: string;
  circle: RevenueCircle;
  offset: readonly [east: number, north: number];
  category: LandCategory;
  village?: string;
  mouza?: string;
  area: number;
  pattaType?: "Annual Patta" | "Periodic Patta";
  restriction?: string;
  sellerListing?: ConsentedListing | { voluntaryConsent: false };
};

const parcelSeeds: ParcelSeed[] = [
  {
    id: "P-01", circle: "Teok", offset: [-145, 75], category: "Agricultural", area: 3.2,
  },
  {
    id: "P-02", circle: "Boko", offset: [0, 0], category: "Residential", area: 1.1,
  },
  {
    id: "P-03", circle: "Chabua", offset: [0, 0], category: "Commercial", area: 1.6,
  },
  { id: "P-04", circle: "Teok", offset: [-47, 83], category: "Agricultural", area: 1.8, sellerListing: { voluntaryConsent: false } },
  { id: "P-05", circle: "Chabua", offset: [120, -45], category: "Residential", area: 2 },
  { id: "P-06", circle: "Teok", offset: [50, 78], category: "Residential", area: 1.3 },
  { id: "P-07", circle: "Teok", offset: [140, 67], category: "Agricultural", area: 2.1, restriction: "Illustrative access review" },
  { id: "P-08", circle: "Teok", offset: [-117, -6], category: "Agricultural", area: 2.5 },
  { id: "P-09", circle: "Teok", offset: [-8, -2], category: "Residential", area: 1.4, pattaType: "Annual Patta" },
  { id: "P-10", circle: "Teok", offset: [96, -16], category: "Commercial", area: 0.9 },
  { id: "P-11", circle: "Teok", offset: [-147, -89], category: "Residential", area: 1.2 },
  { id: "P-12", circle: "Teok", offset: [-36, -96], category: "Agricultural", area: 2.3, restriction: "Illustrative transaction review" },
  { id: "P-13", circle: "Teok", offset: [74, -109], category: "Agricultural", area: 2.7 },
  { id: "P-14", circle: "Mariani", offset: [0, 0], category: "Residential", area: 1.3 },
  { id: "P-15", circle: "Boko", offset: [-105, 35], category: "Agricultural", area: 2.4 },
  { id: "P-16", circle: "Boko", offset: [100, -25], category: "Residential", area: 1.5, pattaType: "Annual Patta" },
  { id: "P-17", circle: "Chabua", offset: [-118, 35], category: "Agricultural", area: 2.2 },
];

// Size the synthetic plots in metres, then convert to GeoJSON longitude/latitude.
function parcelGeometry({ circle, offset: [east, north], area }: ParcelSeed): Polygon {
  const [longitude, latitude] = circleAreas[circle].center;
  const metresPerDegree = 111320;
  const metresPerLongitudeDegree = metresPerDegree * Math.cos(latitude * Math.PI / 180);
  const width = Math.sqrt(area * 1338 * 1.2);
  const height = width / 1.2;
  const corners = [[-.55, -.5], [.45, -.5], [.55, .5], [-.45, .5]];
  const ring = corners.map(([x, y]) => [
    longitude + (east + x * width) / metresPerLongitudeDegree,
    latitude + (north + y * height) / metresPerDegree,
  ]);
  return { type: "Polygon", coordinates: [[...ring, ring[0]]] };
}

type ParcelFeature = Feature<Polygon, { parcelId: string }>;

export type DemoParcel = Omit<ParcelSeed, "offset" | "pattaType"> & {
  district: (typeof circleAreas)[RevenueCircle]["district"];
  areaUnit: "bigha";
  dagNumber: string;
  pattaNumber: string;
  pattaType: NonNullable<ParcelSeed["pattaType"]>;
  feature: ParcelFeature;
};

export const demoParcels: DemoParcel[] = parcelSeeds.map((seed) => {
  const { id, circle, category, area, village, mouza, pattaType = "Periodic Patta", restriction, sellerListing } = seed;
  const number = id.slice(2);
  return {
    id, circle, category, area, village, mouza, pattaType, restriction, sellerListing,
    district: circleAreas[circle].district,
    areaUnit: "bigha",
    dagNumber: "DEMO-D" + number,
    pattaNumber: "DEMO-P" + number,
    feature: { type: "Feature", id, properties: { parcelId: id }, geometry: parcelGeometry(seed) },
  };
});

export const demoDistricts = [...new Set(demoParcels.map(({ district }) => district))].sort();

export function findDemoParcel(id: string) {
  return demoParcels.find((parcel) => parcel.id === id);
}

export function getActiveListing(parcel: DemoParcel) {
  return parcel.sellerListing?.voluntaryConsent && (!parcel.restriction || parcel.sellerListing.restrictionReviewed) ? parcel.sellerListing : null;
}

export function getParcelStatus(parcel: DemoParcel) {
  if (parcel.restriction) return "restricted";
  return getActiveListing(parcel) ? "listed" : "unlisted";
}

const demoInterestRequests = [
  { id: "I-01", parcelId: "P-01" },
  { id: "I-02", parcelId: "P-01" },
  { id: "I-03", parcelId: "P-02" },
  { id: "I-04", parcelId: "P-03" },
];

export const marketplaceCounts = {
  parcels: demoParcels.length,
  interestRequests: demoInterestRequests.length,
};

export function parcelHref(id: string) {
  return "/explore?parcel=" + encodeURIComponent(id);
}

export function parcelRecordHref(id: string) {
  return "/explore/parcels/" + encodeURIComponent(id);
}

const priceFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function formatIndicativePrice(price: number) {
  return "₹" + priceFormat.format(price / 100000) + " lakh";
}
