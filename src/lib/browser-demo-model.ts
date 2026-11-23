import type { AssistanceEvent,AssistanceRequest } from "./assistance";
import type { BuyerProfile,Enquiry } from "./buyer-demo";
import type { CoordinationEvent } from "./coordination";
import type { BuyerCheckEvent } from "./due-diligence";
import { publicListings } from "./public-demo";
import type { DemoListing,DemoSeller,ListingAuditEvent } from "./seller-demo";
import { emptyListingDetails } from "./seller-demo";

// New public fixtures only. Never export original local profiles or audit records.
export type BrowserDemoState = {
  buyer: BuyerProfile; seller: DemoSeller; listings: DemoListing[]; listingEvents: ListingAuditEvent[];
  enquiries: Enquiry[]; requests: AssistanceRequest[]; requestEvents: Record<string, AssistanceEvent[]>;
  checks: Record<string, BuyerCheckEvent[]>; read: string[]; coordination: CoordinationEvent[];
};
export function createBrowserDemo(): BrowserDemoState {
  const date = "2026-01-01T06:00:00.000Z";
  return {
    buyer: { id: "public-buyer", displayName: "Public Demo Buyer", mobile: "0000000001", email: "buyer@example.test", district: "Kamrup", buyerType: "Individual" },
    seller: { id: "public-seller", displayName: "Public Demo Seller", mobile: "0000000002", email: "seller@example.test", district: "Kamrup", sellerType: "Individual", registeredAt: date },
    listings: publicListings.map(p => ({ id:p.listingId, parcelId:p.id, status:"Approved", seeded:!!p.seeded, createdAt:date, updatedAt:date, submittedAt:date, details:{...emptyListingDetails,askingPrice:String(p.price),description:p.title,declaration:true,consent:true,acknowledgePending:true} })),
    listingEvents: publicListings.filter(p=>p.seeded).map((p,index)=>({id:index+1,listingId:p.listingId,event:"Public illustrative listing fixture",recordedAt:date,previousStatus:null,newStatus:"Approved",actorKind:"Seed",actorId:null,remarks:"Synthetic public starter record; not local audit history.",restrictionRemarks:null,sellerResponse:null})), enquiries: [], requests: [], requestEvents: {}, checks: {}, read: [], coordination: [],
  };
}
export type BrowserNotice = { key:string; reference:string; message:string; recordedAt:string; read:boolean };
export function browserNotifications(state: BrowserDemoState): BrowserNotice[] {
  return [
    ...state.enquiries.flatMap(e => e.events.map(event => ({key:`enquiry-${e.id}-${event.id}`,reference:e.id,message:`${e.parcelId} enquiry · ${event.newStatus}`,recordedAt:event.recordedAt}))),
    ...Object.entries(state.requestEvents).flatMap(([reference,events])=>events.map(event=>({key:`request-${reference}-${event.id}`,reference,message:event.activity,recordedAt:event.recordedAt}))),
    ...state.listingEvents.filter(event=>event.actorKind!=="Seed").map(event=>({key:`listing-${event.id}`,reference:event.listingId,message:`Listing · ${event.event}`,recordedAt:event.recordedAt})),
    ...state.coordination.map((event,index)=>({key:`coordination-${index}`,reference:event.reference,message:event.note,recordedAt:event.recordedAt})),
  ].map(item=>({...item,read:state.read.includes(item.key)})).sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt));
}
