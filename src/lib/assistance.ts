export const assistanceStages = {
  interest: "Interest Expressed",
  contact: "Seller Contact Requested",
  response: "Seller Response Pending",
  discussion: "Preliminary Discussion",
  documents: "Document Verification Pending",
  legal: "Legal Due Diligence Pending",
  review: "Ready for Independent Professional Review",
  closed: "Closed",
  cancelled: "Cancelled",
} as const;

export type AssistanceStage = keyof typeof assistanceStages;
export type AssistanceRole = "Buyer" | "Seller";
export type AssistanceActor = { kind: AssistanceRole; id: string };

export const assistanceChecklist = [
  { id: "identity", label: "Identity verification", group: "documents" },
  { id: "ownership", label: "Ownership document review", group: "documents" },
  { id: "dag-patta", label: "Dag and Patta verification", group: "documents" },
  { id: "encumbrances", label: "Encumbrance verification", group: "documents" },
  { id: "revenue", label: "Land revenue dues", group: "documents" },
  { id: "court", label: "Court-related restrictions", group: "documents" },
  { id: "permissions", label: "Applicable permissions and restrictions", group: "documents" },
  { id: "legal", label: "Independent legal review", group: "legal" },
  { id: "registration", label: "Registration requirements", group: "legal" },
] as const;

export type AssistanceCheckId = (typeof assistanceChecklist)[number]["id"];
export type AssistanceEvent = {
  id: number; actorKind: AssistanceRole; activity: string; fromStage: AssistanceStage | null;
  toStage: AssistanceStage | null; checkId: AssistanceCheckId | null; completed: number | null; recordedAt: string;
};

export type AssistanceRequest = {
  reference: string; listingId: string; parcelId: string; buyerName: string; buyerType: string;
  sellerName: string; sellerType: string; askingPrice: number; stage: AssistanceStage;
  createdAt: string; updatedAt: string;
};

export const assistanceWatermark = "DEMONSTRATION ONLY — NOT A SALE AGREEMENT, GOVERNMENT APPROVAL OR LEGAL DOCUMENT.";
export const coordinationNotice = "Stages and checklist marks record demo coordination only. Government checks remain Not connected / Not verified.";
export const checklistNotice = "Mark preparation for a check complete once you have noted what an independent professional would need to review. Use fictional information and keep documents, identity numbers and contact details out of this workspace.";

export function assistanceHref(role: AssistanceRole, reference?: string) {
  const dashboard = role === "Buyer" ? "/buyer/transactions" : "/seller/transactions";
  return reference ? dashboard + "/" + encodeURIComponent(reference) : dashboard;
}

export function assistanceStartHref(listingId: string) {
  return "/buyer/transactions/start/" + encodeURIComponent(listingId);
}

export function isActiveAssistance(stage: AssistanceStage) {
  return stage !== "closed" && stage !== "cancelled";
}

export function preparedChecks(events: readonly AssistanceEvent[]) {
  const prepared = new Set<AssistanceCheckId>();
  for (const event of events) {
    if (event.checkId && event.completed) prepared.add(event.checkId);
    else if (event.checkId) prepared.delete(event.checkId);
  }
  return prepared;
}

const transitions = [
  { id: "request-contact", label: "Request seller contact", role: "Buyer", from: ["interest"], to: "contact" },
  { id: "acknowledge", label: "Acknowledge request", role: "Seller", from: ["contact"], to: "response" },
  { id: "accept", label: "Accept discussion", role: "Seller", from: ["response"], to: "discussion" },
  { id: "decline", label: "Decline request", role: "Seller", from: ["contact", "response"], to: "cancelled" },
  { id: "start-documents", label: "Start document preparation", role: "Buyer", from: ["discussion"], to: "documents" },
  { id: "start-legal", label: "Start legal due-diligence preparation", role: "Buyer", from: ["documents"], to: "legal" },
  { id: "refer", label: "Mark ready for independent review", role: "Buyer", from: ["legal"], to: "review" },
  { id: "close-buyer", label: "Close coordination", role: "Buyer", from: ["review"], to: "closed" },
  { id: "close-seller", label: "Close coordination", role: "Seller", from: ["review"], to: "closed" },
] as const satisfies readonly { id: string; label: string; role: AssistanceRole; from: readonly AssistanceStage[]; to: AssistanceStage }[];

type AssistanceAction = { id: string; label: string; to: AssistanceStage; enabled: boolean; reason?: string };

export function assistanceActions(stage: AssistanceStage, role: AssistanceRole, published: boolean, prepared: ReadonlySet<AssistanceCheckId>): AssistanceAction[] {
  if (!isActiveAssistance(stage)) return [];
  const actions: AssistanceAction[] = [];
  if (published) {
    for (const action of transitions) {
      if (action.role !== role || !(action.from as readonly AssistanceStage[]).includes(stage)) continue;
      const group = action.id === "start-legal" ? "documents" : action.id === "refer" ? "legal" : undefined;
      const enabled = !group || assistanceChecklist.every(check => check.group !== group || prepared.has(check.id));
      actions.push({ id: action.id, label: action.label, to: action.to, enabled, reason: enabled ? undefined : "Mark each preparation item in this stage complete first." });
    }
  } else if (role === "Seller") {
    actions.push({ id: "close-unpublished", label: "Close unavailable listing request", to: "closed", enabled: true });
  }
  if (!published && role === "Buyer" && stage === "review") {
    actions.push({ id: "close-buyer", label: "Close coordination", to: "closed", enabled: true });
  }
  if (role === "Buyer") actions.push({ id: "cancel", label: "Cancel request", to: "cancelled", enabled: true });
  return actions;
}

export function editableCheckGroup(stage: AssistanceStage, published: boolean) {
  return published && (stage === "documents" || stage === "legal") ? stage : undefined;
}

export function assistanceNextStep(stage: AssistanceStage) {
  switch (stage) {
    case "interest": return "Buyer can request a discussion with the demo seller.";
    case "contact": return "Seller can acknowledge or decline the contact request.";
    case "response": return "Seller can accept or decline the preliminary discussion.";
    case "discussion": return "Buyer can start preparing the demonstration document checklist.";
    case "documents": return "Participants prepare the document checklist. The buyer then opens legal due diligence.";
    case "legal": return "Participants prepare the legal review and registration questions. The buyer then marks the request ready for independent review.";
    case "review": return "Participants can seek independent professional advice outside the demo or close coordination.";
    default: return "This request is no longer active.";
  }
}
