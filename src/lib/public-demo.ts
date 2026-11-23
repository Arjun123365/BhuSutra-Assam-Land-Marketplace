import { demoParcels, type DemoParcel } from "./demo-marketplace";

// Explicit public presentation fixtures, not an export of accounts or private history.
const published = new Map([
  ["P-01", { price: 1850000, title: "Farmland near Jorhat" }],
  ["P-02", { price: 2800000, title: "Residential plot in Kamrup" }],
  ["P-03", { price: 4200000, title: "Roadside parcel in Dibrugarh" }],
  ["P-15", { price: 250000, title: "Agricultural parcel in Kamrup" }],
]);
export const publicParcels: DemoParcel[] = demoParcels.map(parcel => {
  const listing = published.get(parcel.id);
  return { ...parcel, sellerListing: listing ? { ...listing, voluntaryConsent: true, seeded: parcel.id !== "P-15", listingId: "public-" + parcel.id } : undefined };
});
export const publicListings = publicParcels.flatMap(parcel => parcel.sellerListing?.voluntaryConsent ? [{
  id: parcel.id, district: parcel.district, circle: parcel.circle, category: parcel.category,
  area: parcel.area, areaUnit: parcel.areaUnit, ...parcel.sellerListing,
  listingId: "public-" + parcel.id, seeded: parcel.sellerListing.seeded,
}] : []);
// Curated aggregate presentation fixtures; never read from or synchronized to SQLite.
export const publicHomepageSnapshot = { parcels: publicParcels.length, approved: publicListings.length, sellers: 3, buyers: 2, enquiries: 2, transactions: 1 };
export const publicNotice = "BhuSutra is an NESFIC demonstration prototype using synthetic data. It is not an official Government land-record portal and does not certify legal title or transaction eligibility.";
export const demoStages = ["Interest Expressed", "Seller Contact Requested", "Seller Response Pending", "Preliminary Discussion", "Document Verification Pending", "Legal Due Diligence Pending", "Ready for Independent Professional Review", "Closed"];
export type PublicDemoState = { enquiries: string[]; responses: string[]; transactions: Record<string, number>; checks: Record<string, string[]>; events: string[]; draft: boolean; submitted: boolean; approved: boolean };
export const emptyPublicState: PublicDemoState = { enquiries: [], responses: [], transactions: {}, checks: {}, events: [], draft: false, submitted: false, approved: false };
export type PublicAction = { type: "interest" | "respond" | "start" | "advance" | "cancel" | "check" | "draft" | "submit" | "approve"; parcelId?: string; checkId?: string };
export function updatePublicDemo(state: PublicDemoState, action: PublicAction, timestamp: string): PublicDemoState {
  const id = action.parcelId ?? "P-15";
  if (!publicParcels.some(parcel => parcel.id === id)) return state;
  const next = { ...state };
  if (action.type === "interest") {
    if (!published.has(id) || state.enquiries.includes(id)) return state;
    next.enquiries = [...state.enquiries, id];
  } else if (action.type === "respond") {
    if (!state.enquiries.includes(id) || state.responses.includes(id)) return state;
    next.responses = [...state.responses, id];
  } else if (action.type === "start") {
    if (!published.has(id) || state.transactions[id] !== undefined) return state;
    next.transactions = { ...state.transactions, [id]: 0 };
  } else if (action.type === "advance" || action.type === "cancel") {
    const stage = state.transactions[id];
    if (stage === undefined || stage < 0 || stage >= 7) return state;
    next.transactions = { ...state.transactions, [id]: action.type === "cancel" ? -1 : stage + 1 };
  } else if (action.type === "check") {
    if (!action.checkId) return state;
    const checks = state.checks[id] ?? [];
    next.checks = { ...state.checks, [id]: checks.includes(action.checkId) ? checks.filter(check => check !== action.checkId) : [...checks, action.checkId] };
  } else if (action.type === "draft") next.draft = true;
  else if (action.type === "submit") { if (!state.draft) return state; next.submitted = true; }
  else if (action.type === "approve") { if (!state.submitted) return state; next.approved = true; }
  return { ...next, events: [...state.events, `${timestamp} · ${action.type} · ${id} · browser simulation`].slice(-100) };
}
