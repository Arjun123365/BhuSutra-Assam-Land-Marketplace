import "server-only";

import {
  assistanceChecklist, assistanceNextStep, assistanceStages, assistanceWatermark, checklistNotice, coordinationNotice,
  isActiveAssistance, preparedChecks, type AssistanceRole,
} from "./assistance";
import { assistanceActor } from "./assistance-session";
import { getAssistance } from "./assistance-store";
import { assessDueDiligence, riskNotice } from "./due-diligence";
import { fullINR } from "./seller-demo";
import { getParcelVerification } from "./verification-model";
import { escapeHtml, renderFields } from "./verification-report";
import { getVerificationRecord } from "./verification-service";
import { coordinationWatermark } from "./coordination";
import { getMonitoringSnapshot } from "./coordination-store";

const unavailable = () => new Response("Transaction assistance report unavailable.", { status: 404, headers: { "Cache-Control": "private, no-store" } });

export async function downloadAssistanceReport(role: AssistanceRole, reference: string) {
  const actor = await assistanceActor(role);
  if (!actor) return unavailable();
  const data = getAssistance(actor, reference);
  if (!data) return unavailable();
  const { request, published, events } = data;
  const verification = await getVerificationRecord(request.parcelId);
  if (!verification) return unavailable();

  const { parcel, records } = verification;
  const review = assessDueDiligence(getParcelVerification(parcel, records), []);
  const complete = preparedChecks(events);
  const coordination = getMonitoringSnapshot(actor).coordination.filter(event => event.reference === reference);
  const checklistItems = assistanceChecklist.map(({ id, label }) => `<li>${escapeHtml(label)} · ${complete.has(id) ? "Preparation marked complete" : "Pending preparation"}</li>`);
  const history = events.map(event => {
    const check = event.checkId && assistanceChecklist.find(item => item.id === event.checkId);
    const movement = event.toStage && (event.fromStage ? assistanceStages[event.fromStage] + " → " : "") + assistanceStages[event.toStage];
    const detail = check ? " · " + check.label : movement ? " · " + movement : "";
    return `<li><strong>${escapeHtml(event.actorKind + " · " + event.activity + detail)}</strong><br><time>${escapeHtml(event.recordedAt)} (UTC)</time></li>`;
  });
  const next = published || !isActiveAssistance(request.stage)
    ? assistanceNextStep(request.stage)
    : "The listing is unavailable publicly. Forward stages are paused. The seller can close the request or the buyer can cancel it.";

  const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BhuSutra Transaction Assistance · ${escapeHtml(request.reference)}</title>
<style>
body { margin: 0 auto; padding: 1.5rem; max-width: 48rem; color: #253e2c; font: 15px/1.5 system-ui, sans-serif; }
h1, h2 { color: #14532d; line-height: 1.2; } h2 { font-size: 1.1rem; margin-top: 1.4rem; }
.stamp { padding: .65rem; border: 2px solid #91600e; text-align: center; color: #6b450b; font-weight: 800; }
.watermark { position: fixed; inset: 44% 0 auto; z-index: -1; text-align: center; transform: rotate(-22deg); color: #9463112b; font-size: clamp(1.25rem, 4vw, 3rem); font-weight: 900; pointer-events: none; }
dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); gap: .45rem .8rem; }
dt { font-size: .85em; } dd { margin: 0; font-weight: 650; overflow-wrap: anywhere; } li { margin-bottom: .3rem; }
@media print { body { padding: 0; } h2 { break-after: avoid; } li, dl > div { break-inside: avoid; } }
</style>
<body>
<div class="watermark" aria-hidden="true">${assistanceWatermark}</div>
<header><p class="stamp">${assistanceWatermark}</p><p class="stamp">${coordinationWatermark}</p><h1>Transaction assistance summary</h1>
<p>NESFIC Demonstration Prototype. ${coordinationNotice}</p></header>
<main>
  <section><h2>Assistance request</h2>${renderFields([
    ["Reference", request.reference], ["Current workflow stage", assistanceStages[request.stage]],
    ["Parcel ID", parcel.id], ["District and Revenue Circle", parcel.district + " / " + parcel.circle],
    ["Dag number", parcel.dagNumber], ["Patta number", parcel.pattaNumber],
    ["Land area", parcel.area + " " + parcel.areaUnit], ["Land classification", parcel.category],
    ["Demo buyer", request.buyerName + " · " + request.buyerType],
    ["Demo seller", request.sellerName + " · " + request.sellerType],
    ["Seller-declared asking price at initiation", fullINR.format(request.askingPrice)],
    ["Initiated", request.createdAt + " (UTC)"],
  ])}<p>${escapeHtml(next)}</p></section>
  <section><h2>Completed and pending activities</h2><p>${complete.size} of ${assistanceChecklist.length} preparation items marked complete. ${checklistNotice}</p><ul>${checklistItems.join("")}</ul></section>
  <section><h2>Due-diligence observations</h2><p>${riskNotice} The seller-declared asking price is indicative.</p>
  <ul>${review.observations.map(item => `<li><strong>${escapeHtml(item.label)}</strong> · ${escapeHtml(item.detail)}</li>`).join("")}</ul></section>
  <section><h2>Activity history</h2><ol>${history.join("")}</ol></section>
  <section><h2>Administrator coordination updates</h2><ol>${coordination.map(event => "<li>" + escapeHtml(event.kind + " · " + event.note + (event.targetId ? " · Follow-up #" + event.targetId : "") + " · " + event.recordedAt + " (UTC)") + "</li>").join("")}</ol></section>
</main>
</body>
</html>`;

  return new Response(html, { headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Disposition": `attachment; filename="bhusutra-${request.reference}-assistance.html"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  } });
}
