import "server-only";

import { currentAdmin } from "./admin-session";
import { assistanceStages } from "./assistance";
import { coordinationWatermark, filterTransactions, openFollowups, responsibleParticipant, transactionAnalytics, type MonitoringFilters } from "./coordination";
import { getMonitoringSnapshot } from "./coordination-store";
import { escapeHtml, renderFields } from "./verification-report";

export async function downloadMonitoringReport(url: URL) {
  const admin = await currentAdmin();
  if (!admin) return new Response("Report unavailable.", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const kind = url.searchParams.get("kind") ?? "status";
  if (!["status", "districts", "followups", "history"].includes(kind)) return new Response("Unknown report type.", { status: 400 });
  const snapshot = getMonitoringSnapshot({ kind: "Admin", id: admin });
  const filters: MonitoringFilters = Object.fromEntries(["query", "district", "stage", "from", "to", "sort", "followup"].map(key => [key, url.searchParams.get(key) ?? ""]));
  const requests = filterTransactions(snapshot, filters).filter(item => kind !== "history" || item.reference === url.searchParams.get("reference"));
  if (kind === "history" && !requests.length) return new Response("Request unavailable.", { status: 404 });
  const references = new Set(requests.map(item => item.reference));
  const selected = {
    requests,
    activities: snapshot.activities.filter(event => references.has(event.reference)),
    coordination: snapshot.coordination.filter(event => references.has(event.reference)),
  };
  const stats = transactionAnalytics(selected);
  const pending = openFollowups(selected.coordination);
  const title = kind === "districts" ? "District transaction activity" : kind === "followups" ? "Pending coordination follow-ups" : kind === "history" ? "Individual transaction history" : "Transaction status summary";
  let content = "";
  if (kind === "districts") {
    content = renderFields(stats.districts.map(item => [item.district, item.total + " requests · " + item.active + " active"] as const));
  } else if (kind === "followups") {
    content = pending.length ? "<ul>" + pending.map(event => "<li>" + escapeHtml(event.reference + " · Follow-up #" + event.id + " · " + event.note + " · " + event.recordedAt) + "</li>").join("") + "</ul>" : "<p>No pending follow-ups in this selection.</p>";
  } else {
    content = requests.map(item => "<section><h2>" + escapeHtml(item.reference) + "</h2>" + renderFields([
      ["Parcel", item.parcelId], ["Location", item.district + " / " + item.circle],
      ["Current stage", assistanceStages[item.stage]], ["Responsible participant", responsibleParticipant(item.stage)],
      ["Initiated", item.createdAt], ["Workflow updated", item.updatedAt],
    ]) + "</section>").join("");
  }
  if (kind === "districts") {
    content += "<h2>Recorded district activity</h2><ul>" + selected.activities.map(event => {
      const request = requests.find(item => item.reference === event.reference)!;
      return "<li>" + escapeHtml(request.district + " · " + request.parcelId + " · " + event.activity + " · " + event.recordedAt) + "</li>";
    }).join("") + "</ul>";
  }
  if (kind === "history") {
    content += "<h2>Transaction activity</h2><ol>" + selected.activities.map(event => "<li>" + escapeHtml(event.actorKind + " · " + event.activity + (event.toStage ? " · " + assistanceStages[event.toStage] : "") + (event.checkId ? " · " + event.checkId : "") + " · " + event.recordedAt) + "</li>").join("") + "</ol>";
    content += "<h2>Administrator coordination history</h2><ol>" + selected.coordination.map(event => "<li>" + escapeHtml(event.kind + " · " + event.note + (event.targetId ? " · Follow-up #" + event.targetId : "") + " · " + event.recordedAt) + "</li>").join("") + "</ol>";
  }
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | BhuSutra</title>
<style>
body { max-width: 52rem; margin: auto; padding: 1.5rem; font: 15px/1.5 system-ui, sans-serif; color: #25452e; overflow-wrap: anywhere; }
h1,h2 { color: #14532d; } h2 { font-size: 1.1rem; } .stamp { border: 2px solid #946311; padding: .6rem; text-align: center; font-weight: 800; color: #6b4a10; }
.watermark { position: fixed; z-index: -1; inset: 45% 0 auto; transform: rotate(-22deg); color: #94631130; font-size: 2rem; font-weight: 900; text-align: center; }
dl { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,12rem),1fr)); gap: .5rem; } dt { font-size: .85em; } dd { margin: 0; font-weight: 650; }
@media print { li, dl>div { break-inside: avoid; } h2 { break-after: avoid; } }
</style><body><div class="watermark" aria-hidden="true">${coordinationWatermark}</div><p class="stamp">${coordinationWatermark}</p>
<h1>${title}</h1><p>Stored synthetic demonstration workflow records. Government checks remain Not connected / Not verified. All timestamps below use UTC.</p>
<p>Selection filters · ${escapeHtml(Object.entries(filters).filter(([,value]) => value).map(([key,value]) => key + " = " + value).join(" · ") || "All stored requests")}</p>
${renderFields([["Total requests", String(stats.total)], ["Active requests", String(stats.active)], ["Closed coordination", String(stats.closed)], ["Cancelled requests", String(stats.cancelled)], ["Pending follow-ups", String(stats.followups)], ["Average closed duration", stats.averageHours === null ? "Insufficient data (two closed requests required)" : stats.averageHours.toFixed(2) + " hours across " + stats.durationSamples + " recorded closures"]])}
${content}</body></html>`;
  return new Response(html, { headers: {
    "Content-Type": "text/html; charset=utf-8", "Content-Disposition": 'attachment; filename="bhusutra-' + kind + '-demo-report.html"',
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  } });
}
