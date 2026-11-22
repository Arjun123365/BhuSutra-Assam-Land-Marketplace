import type { GovernmentCheckId } from "./parcel-records";
import type { getParcelVerification } from "./verification-model";

export const buyerCheckStatuses = ["Not Started", "In Progress", "Completed"] as const;
export type BuyerCheckStatus = typeof buyerCheckStatuses[number];
export type BuyerCheckEvent = {
  id: number;
  checkId: GovernmentCheckId;
  previousStatus: BuyerCheckStatus;
  status: BuyerCheckStatus;
  recordedAt: string;
};

export const buyerReviewNotice = "Buyer checklist progress is self-reported. It leaves official Government verification status unchanged.";
export const riskNotice = "Unavailable official records leave information gaps. They do not establish that a dispute, debt or encumbrance exists.";

export function assessDueDiligence(record: ReturnType<typeof getParcelVerification>, history: readonly BuyerCheckEvent[]) {
  // Events arrive newest first. The latest event for each category wins.
  const latest = new Map<GovernmentCheckId, BuyerCheckStatus>();
  for (const event of history) {
    if (!latest.has(event.checkId)) latest.set(event.checkId, event.status);
  }
  const checks = record.checks.map(check => ({ ...check, buyerStatus: latest.get(check.id) ?? "Not Started" as const }));
  const pending = checks.filter(check => check.buyerStatus !== "Completed");
  const completedCount = checks.length - pending.length;
  const unavailable = checks.filter(check => check.result.status === "not-connected");
  const observations = unavailable.map(({ id, label, unavailable }) => ({ id: String(id), label, detail: unavailable }));
  const recommendations = checks
    .filter(check => check.result.status === "not-connected" || check.buyerStatus !== "Completed")
    .map(({ nextStep }) => nextStep);

  if (record.listing) {
    observations.push({ id: "seller", label: "Seller declarations", detail: "The indicative asking price and listing consent are seller-declared and have not been independently verified." });
    recommendations.push("Review the seller’s declarations and ask for independent supporting information.");
  }
  if (record.restriction) {
    observations.push({ id: "demo-flag", label: "Synthetic restriction flag", detail: record.restriction + " is an illustrative demo flag for follow-up." });
    recommendations.push("Raise the synthetic restriction flag in the demo review and ask which official records would address it.");
  }

  return {
    checks, pending, unavailable, completedCount, observations, recommendations, history,
    buyerStatus: completedCount === checks.length ? "Completed" : checks.every(check => check.buyerStatus === "Not Started") ? "Not Started" : "In Progress",
    riskIndicator: record.restriction ? "Demo restriction flag for follow-up" : observations.length ? "Information gaps need review" : "No observations from these rules",
  };
}
