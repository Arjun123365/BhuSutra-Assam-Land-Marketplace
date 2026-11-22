import type { DemoParcel } from "./demo-marketplace";
import type { DemoListing, ListingStatus } from "./seller-demo";

export const decisionStatuses = ["Under Review", "Clarification Required", "Approved", "Rejected"] as const;
export type ReviewDecision = (typeof decisionStatuses)[number];

export function allowedReviewDecisions(status: ListingStatus): readonly ReviewDecision[] {
  if (status === "Submitted") return ["Under Review"];
  if (status === "Under Review") return ["Clarification Required", "Approved", "Rejected"];
  return [];
}

export function validAskingPrice(value: string) {
  return /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 1000000000;
}

export function reviewChecks(listing: DemoListing, parcel: DemoParcel | undefined, conflict: boolean) {
  return [
    { label: "Seller declaration present", passed: listing.details.declaration === true },
    { label: "Voluntary listing consent recorded", passed: listing.details.consent === true },
    { label: "Parcel association valid", passed: Boolean(parcel) },
    { label: "No conflicting active listing", passed: !conflict },
    { label: "Asking price and description valid", passed: validAskingPrice(listing.details.askingPrice) && listing.details.description.trim().length >= 10 && listing.details.description.length <= 600 },
  ];
}
