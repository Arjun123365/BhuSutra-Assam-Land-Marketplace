import { assistanceActions,assistanceChecklist,editableCheckGroup,preparedChecks,type AssistanceRequest,type AssistanceRole } from "./assistance";
import type { BrowserDemoState } from "./browser-demo-model";
import { buyerTypes,type EnquiryStatus } from "./buyer-demo";
import { demoDistricts,findDemoParcel } from "./demo-marketplace";
import { buyerCheckStatuses } from "./due-diligence";
import { allowedReviewDecisions,reviewChecks,validAskingPrice } from "./listing-review";
import { governmentCheckIds } from "./parcel-records";
import { emptyListingDetails,sellerTypes,type DemoListing,type ListingAuditEvent,type ListingStatus } from "./seller-demo";
export const formText = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
export function browserProfileError(form: FormData, role: "Buyer" | "Seller") {
  if (formText(form,"displayName").length < 2 || formText(form,"displayName").length > 60) return "Enter a fictional display name of 2–60 characters.";
  if (!/^00000\d{5}$/.test(formText(form,"mobile"))) return "Use a test number beginning with 00000 followed by five digits.";
  if (formText(form,"email") && !/^[^\s@]+@[^\s@]+\.test$/i.test(formText(form,"email"))) return "Use a fictional .test email or leave it empty.";
  if (!demoDistricts.some(d=>d===formText(form,"district"))) return "Select a supported district.";
  const types: readonly string[] = role === "Buyer" ? buyerTypes : sellerTypes;
  if (!types.includes(formText(form,role === "Buyer" ? "buyerType" : "sellerType"))) return "Select a profile type.";
  if (role === "Buyer" ? form.get("consent") !== "on" : form.get("processingConsent") !== "on" || form.get("terms") !== "on") return "Demonstration consent is required.";
}
export function appendListingEvent(state: BrowserDemoState, listing: DemoListing, status: ListingStatus, actor: "Seller" | "Administrator", remarks: string, now: string): BrowserDemoState {
  const event: ListingAuditEvent = { id:state.listingEvents.length+1,listingId:listing.id,event:status === "Draft" ? "Draft saved" : status,recordedAt:now,previousStatus:listing.status,newStatus:status,actorKind:actor,actorId:actor === "Seller" ? state.seller.id : "public-admin",remarks,restrictionRemarks:null,sellerResponse:null };
  return {...state,listings:state.listings.some(p=>p.id===listing.id)?state.listings.map(p=>p.id===listing.id?{...listing,status,updatedAt:now}:p):[...state.listings,{...listing,status}],listingEvents:[event,...state.listingEvents]};
}
export function browserSaveListing(state: BrowserDemoState, form: FormData, now: string) {
  const parcelId=formText(form,"parcelId"), existing=state.listings.find(l=>l.id===formText(form,"draftId")), parcel=findDemoParcel(parcelId);
  if (!parcel || (existing && existing.status!=="Draft")) return {error:"Choose an available synthetic parcel."};
  if (state.listings.some(l=>l.parcelId===parcelId && l.id!==existing?.id && !["Rejected","Withdrawn"].includes(l.status))) return {error:"This parcel already has an active listing request."};
  const details={...emptyListingDetails,askingPrice:formText(form,"askingPrice"),description:formText(form,"description"),saleCategory:formText(form,"saleCategory"),image:formText(form,"image"),contactPreference:formText(form,"contactPreference"),declaration:form.get("declaration")==="on",consent:form.get("consent")==="on",acknowledgePending:form.get("acknowledgePending")==="on",acknowledgeRestriction:form.get("acknowledgeRestriction")==="on"};
  const submitted=formText(form,"intent")==="submit";
  if(submitted && (!validAskingPrice(details.askingPrice)||details.description.length<10||details.description.length>600||!details.consent||!details.declaration||!details.acknowledgePending||(parcel.restriction&&!details.acknowledgeRestriction))) return {error:"Complete the price, description, declarations and required restriction acknowledgement."};
  const listing: DemoListing={id:existing?.id??`public-request-${state.listings.length+1}`,parcelId,status:"Draft",seeded:false,createdAt:existing?.createdAt??now,updatedAt:now,submittedAt:submitted?now:null,details};
  return {state:appendListingEvent(state,listing,submitted?"Submitted":"Draft","Seller","Browser-only listing request",now),id:listing.id};
}
export function browserReview(state: BrowserDemoState, form: FormData, now: string) {
  const listing=state.listings.find(l=>l.id===formText(form,"listingId"));
  if(!listing || listing.id.startsWith("public-P-") || !allowedReviewDecisions(listing.status).some(s=>s===formText(form,"decision"))) return {error:"This demonstration decision is unavailable."};
  const status=formText(form,"decision") as ListingStatus, remarks=formText(form,"remarks"), parcel=findDemoParcel(listing.parcelId);
  if(status!=="Under Review" && (remarks.length<3||remarks.length>1000)) return {error:"Enter decision remarks of 3–1000 characters."};
  if(status==="Approved" && (!reviewChecks(listing,parcel,false).every(c=>c.passed)||(parcel?.restriction && (form.get("acknowledgeRestriction")!=="on"||formText(form,"restrictionRemarks").length<3)))) return {error:"Review all declarations and any synthetic restriction first."};
  return {state:appendListingEvent(state,listing,status,"Administrator",remarks,now)};
}
export function browserEnquiry(state: BrowserDemoState, listingId: string, message: string, now: string) {
  const listing=state.listings.find(l=>l.id===listingId&&l.status==="Approved"&&l.details.consent);
  if(!listing) return {error:"This listing is not currently approved for enquiries."};
  if(state.enquiries.some(e=>e.listingId===listingId&&e.status!=="Closed")) return {error:"An active enquiry already exists for this listing."};
  if(!message.trim()||message.length>1000) return {error:"Enter a fictional enquiry of 1–1000 characters."};
  const enquiry={id:`public-enquiry-${state.enquiries.length+1}`,listingId,parcelId:listing.parcelId,buyerName:state.buyer.displayName,status:"Submitted" as const,message,createdAt:now,updatedAt:now,events:[{id:1,previousStatus:null,newStatus:"Submitted" as const,actorKind:"Buyer" as const,message:null,recordedAt:now}]};
  return {state:{...state,enquiries:[...state.enquiries,enquiry]}};
}
export function browserEnquiryTransition(state: BrowserDemoState,id: string,role: AssistanceRole,next: EnquiryStatus,message: string,now: string) {
  const e=state.enquiries.find(e=>e.id===id);
  if(!e||e.status==="Closed"||!(next==="Closed" || role==="Seller"&&((e.status==="Submitted"&&next==="Viewed")||(e.status==="Viewed"&&next==="Responded")))) return {error:"This enquiry transition is unavailable."};
  if(next==="Responded"&&(!message.trim()||message.length>1000))return {error:"Enter a fictional response of 1–1000 characters."};
  return {state:{...state,enquiries:state.enquiries.map(item=>item.id!==id?item:{...item,status:next,updatedAt:now,events:[{id:item.events.length+1,previousStatus:item.status,newStatus:next,actorKind:role,message:message||null,recordedAt:now},...item.events]})}};
}
export function browserStartAssistance(state: BrowserDemoState,listingId: string,now: string) {
  const l=state.listings.find(l=>l.id===listingId&&l.status==="Approved"&&l.details.consent);
  if(!l)return {error:"Assistance requires an approved published listing."};
  const existing=state.requests.find(r=>r.listingId===listingId&&!["closed","cancelled"].includes(r.stage));
  if(existing)return {state,reference:existing.reference};
  const reference=`TX-PUBLIC-${state.requests.length+1}`;
  const request: AssistanceRequest={reference,listingId,parcelId:l.parcelId,buyerName:state.buyer.displayName,buyerType:state.buyer.buyerType,sellerName:state.seller.displayName,sellerType:state.seller.sellerType,askingPrice:Number(l.details.askingPrice),stage:"interest",createdAt:now,updatedAt:now};
  return {state:{...state,requests:[...state.requests,request],requestEvents:{...state.requestEvents,[reference]:[{id:1,actorKind:"Buyer" as const,activity:"Assistance request created in browser memory",fromStage:null,toStage:"interest" as const,checkId:null,completed:null,recordedAt:now}]}},reference};
}
export function browserAssistanceAction(state: BrowserDemoState,reference: string,role: AssistanceRole,form: FormData,now: string) {
  const request=state.requests.find(r=>r.reference===reference);if(!request)return {error:"Demonstration request unavailable."};
  const events=state.requestEvents[reference]??[],published=state.listings.some(l=>l.id===request.listingId&&l.status==="Approved"),prepared=preparedChecks(events),check=formText(form,"check");
  if(check){const group=editableCheckGroup(request.stage,published);if(!group || !assistanceChecklist.some(c=>c.id===check&&c.group===group))return {error:"Checklist is not editable in this stage."};}
  const action=check?undefined:assistanceActions(request.stage,role,published,prepared).find(a=>a.id===formText(form,"action")&&a.enabled);
  if(!check&&!action)return {error:"Complete required preparation items or choose a valid participant action."};
  const event={id:events.length+1,actorKind:role,activity:check?"Preparation checklist updated":action!.label,fromStage:request.stage,toStage:action?.to??null,checkId:check?check as import("./assistance").AssistanceCheckId:null,completed:check?(formText(form,"completed")==="yes"?1:0):null,recordedAt:now};
  return {state:{...state,requests:state.requests.map(r=>r.reference===reference?{...r,stage:action?.to??r.stage,updatedAt:now}:r),requestEvents:{...state.requestEvents,[reference]:[...events,event]}}};
}
export function browserSaveCheck(state: BrowserDemoState,parcelId: string,checkId: string,status: string,now: string) {
  if(!findDemoParcel(parcelId)||!governmentCheckIds.some(id=>id===checkId)||!buyerCheckStatuses.some(s=>s===status))return {error:"Choose a supported parcel, check and buyer status."};
  const history=state.checks[parcelId]??[];
  const event={id:history.length+1,checkId:checkId as typeof governmentCheckIds[number],status:status as typeof buyerCheckStatuses[number],previousStatus:history.find(e=>e.checkId===checkId)?.status??"Not Started" as const,recordedAt:now};
  return {state:{...state,checks:{...state.checks,[parcelId]:[event,...history]}}};
}
