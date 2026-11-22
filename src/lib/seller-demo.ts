import type { DemoParcel } from "./demo-marketplace";

export const sellerTypes = ["Individual", "Joint owner", "Authorised representative"] as const;
export const saleCategories = ["Whole parcel", "Other demo sale"] as const;
export const contactPreferences = ["In-app demo only", "Demo mobile", "Demo email"] as const;
export const demoImage = "/parcel-concept.svg";

export const listingStatuses = ["Draft", "Submitted", "Under Review", "Clarification Required", "Approved", "Rejected", "Withdrawn"] as const;
export type ListingStatus = (typeof listingStatuses)[number];

export type DemoSeller = {
  id: string;
  displayName: string;
  mobile: string;
  email: string;
  district: DemoParcel["district"];
  sellerType: (typeof sellerTypes)[number];
  registeredAt: string;
};

export type DemoSellerProfile = { id: string; displayName: string; listingCount: number };
export type ParcelReservation = { parcelId: string; status: ListingStatus; ownDraftId?: string };

export type ListingDetails = {
  askingPrice: string;
  description: string;
  saleCategory: string;
  image: string;
  contactPreference: string;
  declaration: boolean;
  consent: boolean;
  acknowledgePending: boolean;
  acknowledgeRestriction: boolean;
};

export const emptyListingDetails: ListingDetails = {
  askingPrice: "",
  description: "",
  saleCategory: "",
  image: "",
  contactPreference: contactPreferences[0],
  declaration: false,
  consent: false,
  acknowledgePending: false,
  acknowledgeRestriction: false,
};

export type DemoListing = {
  id: string;
  parcelId: string;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  seeded: boolean;
  details: ListingDetails;
};

export type ListingAuditEvent = {
  id: number;
  listingId: string;
  event: string;
  recordedAt: string;
  previousStatus: ListingStatus | null;
  newStatus: ListingStatus | null;
  actorKind: "Administrator" | "Seller" | "Seed" | null;
  actorId: string | null;
  remarks: string | null;
  restrictionRemarks: string | null;
  sellerResponse: string | null;
};

export type SellerActionState = { error?: string };

export function canWithdraw(status: ListingStatus) {
  return status === "Draft" || status === "Submitted" || status === "Under Review" || status === "Clarification Required" || status === "Approved";
}

export const fullINR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
