import { assistanceNextStep, assistanceStages, isActiveAssistance, type AssistanceEvent, type AssistanceRequest, type AssistanceStage } from "./assistance";
import { demoDistricts, findDemoParcel } from "./demo-marketplace";

export const coordinationWatermark = "NESFIC DEMONSTRATION — NOT AN OFFICIAL GOVERNMENT TRANSACTION OR LEGAL RECORD.";
export type WorkspaceRole = "Buyer" | "Seller" | "Admin";
export type WorkspaceActor = { kind: WorkspaceRole; id: string };
export type CoordinationEvent = {
  id: number; reference: string; kind: "note" | "flag" | "complete"; note: string;
  targetId: number | null; recordedAt: string;
};
export type MonitoringRequest = AssistanceRequest & { district: string; circle: string };
export type MonitoringSnapshot = { requests: MonitoringRequest[]; activities: (AssistanceEvent & { reference: string })[]; coordination: CoordinationEvent[] };

export function responsibleParticipant(stage: AssistanceStage) {
  if (!isActiveAssistance(stage)) return "None";
  if (stage === "contact" || stage === "response") return "Seller";
  if (stage === "documents" || stage === "legal" || stage === "review") return "Buyer and seller";
  return "Buyer";
}

export function openFollowups(events: readonly CoordinationEvent[]) {
  const completed = new Set(events.filter(event => event.kind === "complete").map(event => event.targetId));
  return events.filter(event => event.kind === "flag" && !completed.has(event.id));
}

export type MonitoringFilters = { query?: string; district?: string; stage?: string; from?: string; to?: string; sort?: string; followup?: string };

export function filterTransactions(snapshot: MonitoringSnapshot, filters: MonitoringFilters) {
  const pending = new Set(openFollowups(snapshot.coordination).map(item => item.reference));
  const query = (filters.query ?? "").trim().toLocaleLowerCase();
  // ISO date inputs describe initiation dates in Assam's time zone.
  const from = filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from) ? Date.parse(filters.from + "T00:00:00+05:30") : NaN;
  const to = filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? Date.parse(filters.to + "T23:59:59.999+05:30") : NaN;
  const filtered = snapshot.requests.filter(item => {
    const created = Date.parse(item.createdAt);
    return (!query || [item.reference, item.parcelId, item.buyerName, item.sellerName].some(value => value.toLocaleLowerCase().includes(query)))
      && (!filters.district || item.district === filters.district)
      && (!filters.stage || item.stage === filters.stage)
      && (!Number.isFinite(from) || created >= from)
      && (!Number.isFinite(to) || created <= to)
      && (filters.followup !== "pending" || pending.has(item.reference));
  });
  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case "oldest": return a.createdAt.localeCompare(b.createdAt) || a.reference.localeCompare(b.reference);
      case "parcel": return a.parcelId.localeCompare(b.parcelId, undefined, { numeric: true }) || a.reference.localeCompare(b.reference);
      case "district": return a.district.localeCompare(b.district) || a.reference.localeCompare(b.reference);
      case "stage": return assistanceStages[a.stage].localeCompare(assistanceStages[b.stage]) || a.reference.localeCompare(b.reference);
      default: return b.updatedAt.localeCompare(a.updatedAt) || a.reference.localeCompare(b.reference);
    }
  });
}

export function transactionAnalytics(snapshot: MonitoringSnapshot) {
  const active = snapshot.requests.filter(item => isActiveAssistance(item.stage));
  const closed = snapshot.requests.filter(item => item.stage === "closed");
  const durations = closed.flatMap(item => {
    const closure = snapshot.activities.find(event => event.reference === item.reference && event.toStage === "closed");
    const elapsed = closure ? Date.parse(closure.recordedAt) - Date.parse(item.createdAt) : NaN;
    return Number.isFinite(elapsed) && elapsed >= 0 ? [elapsed] : [];
  });
  return {
    total: snapshot.requests.length, active: active.length, closed: closed.length,
    cancelled: snapshot.requests.filter(item => item.stage === "cancelled").length,
    sellerPending: active.filter(item => responsibleParticipant(item.stage) === "Seller").length,
    buyerPending: active.filter(item => responsibleParticipant(item.stage).includes("Buyer")).length,
    followups: openFollowups(snapshot.coordination).length,
    durationSamples: durations.length,
    averageHours: durations.length >= 2 ? durations.reduce((sum, value) => sum + value, 0) / durations.length / 3_600_000 : null,
    districts: demoDistricts.map(district => {
      const requests = snapshot.requests.filter(item => item.district === district);
      return { district, total: requests.length, active: requests.filter(item => isActiveAssistance(item.stage)).length };
    }),
  };
}

export function withDemoLocation(request: AssistanceRequest): MonitoringRequest {
  const parcel = findDemoParcel(request.parcelId);
  return { ...request, district: parcel?.district ?? "Unknown demo location", circle: parcel?.circle ?? "Unknown" };
}

export function notificationMessage(event: AssistanceEvent) {
  const stage = event.toStage;
  if (!stage) return event.actorKind + " updated the preparation checklist.";
  const prefix = event.fromStage === null ? "New buyer assistance request." : event.actorKind === "Seller" ? "Seller response." : "Transaction stage changed.";
  return prefix + " " + assistanceStages[stage] + ". " + assistanceNextStep(stage);
}
