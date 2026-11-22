import { formatIndicativePrice, getActiveListing, type DemoParcel } from "./demo-marketplace";
import { disconnectedGovernmentRecords, getGovernmentRecordSections, type ParcelGovernmentRecords } from "./parcel-records";

export const verificationSteps = [
  { id: "identifiers", label: "Review the demo parcel, Dag and Patta identifiers." },
  { id: "seller", label: "Review any seller-declared asking price and listing consent." },
  { id: "ownership", label: "Note ownership and encumbrance records to request from authorised sources." },
  { id: "dues", label: "Note revenue dues, zonal valuation and any applicable court or land restrictions to check." },
  { id: "eligibility", label: "List the eligibility, registration and mutation questions to raise with the relevant authority." },
] as const;

export const demonstrationReportWatermark = "DEMONSTRATION ONLY — NOT AN OFFICIAL GOVERNMENT LAND RECORD OR LEGAL CLEARANCE.";
export const verificationTitleNotice = "A marketplace listing or demo report does not certify legal title or establish transaction eligibility.";

export function verificationHref(parcelId: string) {
  return "/verify-records?parcel=" + encodeURIComponent(parcelId);
}

export function verificationReportHref(parcelId: string) {
  return "/verify-records/report/" + encodeURIComponent(parcelId);
}

type Fields = readonly (readonly [label: string, value: string])[];

export function getParcelVerification(parcel: DemoParcel, records = disconnectedGovernmentRecords(parcel.id)) {
  const listing = getActiveListing(parcel);
  const consent = parcel.sellerListing?.voluntaryConsent;
  const checks = getGovernmentRecordSections(records.parcelId === parcel.id ? records : disconnectedGovernmentRecords(parcel.id));
  const parcelFields: Fields = [
    ["Demo parcel ID", parcel.id],
    ["District", parcel.district],
    ["Revenue Circle", parcel.circle],
    ...(parcel.village ? [["Village", parcel.village] as const] : []),
    ...(parcel.mouza ? [["Mouza", parcel.mouza] as const] : []),
    ["Dag number", parcel.dagNumber],
    ["Patta number", parcel.pattaNumber],
    ["Patta type", parcel.pattaType],
    ["Land area", parcel.area + " " + parcel.areaUnit],
    ["Land classification", parcel.category],
  ];
  const sellerFields: Fields = [
    ["Listing consent status", consent === true ? "Recorded in demo" : consent === false ? "Declined in demo" : "No consent recorded"],
    ...(listing
      ? [["Indicative asking price", formatIndicativePrice(listing.price)] as const, ...(listing.seeded ? [["Listing source", "Seeded demonstration listing"] as const] : [])]
      : [["Listing status", "Not listed for sale"] as const]),
  ];

  return {
    parcelFields,
    sellerFields,
    listing,
    checks,
    missingChecks: checks.filter(({ result }) => result.status === "not-connected").length,
    restriction: parcel.restriction,
  };
}

export type { Fields, ParcelGovernmentRecords };
