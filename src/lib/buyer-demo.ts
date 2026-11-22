export const buyerTypes = ["Individual", "Business"] as const;
export const enquiryStatuses = ["Submitted", "Viewed", "Responded", "Closed"] as const;
export type EnquiryStatus = (typeof enquiryStatuses)[number];
export type EnquiryActor = { kind: "Buyer" | "Seller"; id: string };
export type EnquiryEvent = {
  id: number; previousStatus: EnquiryStatus | null; newStatus: EnquiryStatus;
  actorKind: EnquiryActor["kind"]; message: string | null; recordedAt: string;
};
export type Enquiry = {
  id: string; listingId: string; parcelId: string; buyerName: string; status: EnquiryStatus;
  message: string; createdAt: string; updatedAt: string; events: EnquiryEvent[];
};
export type BuyerProfile = {
  id: string; displayName: string; mobile: string; email: string; district: string;
  buyerType: (typeof buyerTypes)[number];
};
export function interestHref(listingId: string) {
  return "/buyer/interest/" + encodeURIComponent(listingId);
}
