import "server-only";

import type { DemoParcel } from "./demo-marketplace";
import { assessDueDiligence, buyerReviewNotice, riskNotice, type BuyerCheckEvent } from "./due-diligence";
import { recordStatusLabels, unavailableGovernmentStatus } from "./parcel-records";
import { demonstrationReportWatermark, getParcelVerification, verificationTitleNotice, type Fields, type ParcelGovernmentRecords } from "./verification-model";

const htmlEntities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => htmlEntities[character]);
}

export function renderFields(fields: Fields) {
  return `<dl>${fields.map(([name, value]) => `<div><dt>${escapeHtml(name)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
}

export function renderVerificationReport(parcel: DemoParcel, records: ParcelGovernmentRecords, history?: BuyerCheckEvent[]) {
  const record = getParcelVerification(parcel, records);
  const { parcelFields, sellerFields, listing, checks, missingChecks } = record;
  const review = assessDueDiligence(record, history ?? []);
  const checkItems = checks.map(({ label, unavailable, result }) => {
    const detail = result.status === "not-connected" ? unavailable : result.value;
    const status = result.status === "not-connected" ? unavailableGovernmentStatus : recordStatusLabels[result.status];
    const lastChecked = result.status === "government-verified" ? ` <span>Last checked ${escapeHtml(result.checkedAt)}.</span>` : "";
    return `<li><strong>${escapeHtml(label)}</strong> · ${escapeHtml(status)}<br>${escapeHtml(detail)}${lastChecked}</li>`;
  }).join("");
  const historyItems = review.history.map(event => {
    const label = checks.find(check => check.id === event.checkId)?.label ?? event.checkId;
    return `<li>${escapeHtml(label)} · ${escapeHtml(event.previousStatus)} → ${escapeHtml(event.status)} · ${escapeHtml(event.recordedAt)} (UTC)</li>`;
  });

  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BhuSutra demo report · ${escapeHtml(parcel.id)}</title>
<style>
body { margin: 0 auto; max-width: 48rem; padding: 1.5rem; color: #223a2a; font: 15px/1.5 system-ui, sans-serif; }
h1, h2 { color: #14532d; line-height: 1.25; }
h1 { margin: .5rem 0; } h2 { font-size: 1.12rem; margin: 1.2rem 0 .35rem; }
p { margin: .35rem 0; } ul, ol { padding-left: 1.35rem; } li { margin-bottom: .38rem; }
.stamp { border-block: 2px solid #946311; padding: .4rem; color: #714407; text-align: center; font-weight: 800; }
.watermark { position: fixed; z-index: -1; inset: 49% 0 auto; text-align: center; transform: rotate(-22deg); color: #94631129; font-size: clamp(1.2rem, 5vw, 4rem); font-weight: 900; pointer-events: none; }
dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: .35rem .7rem; margin: .5rem 0; }
dt { font-size: .85em; color: #52665a; } dd { margin: 0; font-weight: 620; overflow-wrap: anywhere; }
@media print { body { padding: 0; } h2 { break-after: avoid; } li, dl > div { break-inside: avoid; } }
</style>
<body>
<div class="watermark" aria-hidden="true">${demonstrationReportWatermark}</div>
<header>
  <p class="stamp">${demonstrationReportWatermark}</p>
  <h1>BhuSutra demonstration verification report</h1>
  <p>NESFIC demonstration prototype. Parcel ${escapeHtml(parcel.id)}.</p>
  <p>${verificationTitleNotice}</p>
</header>
<main>
  <section><h2>Synthetic demonstration data</h2>${renderFields(parcelFields)}</section>
  <section><h2>Seller-declared information</h2><p>${listing ? "Public demo listing information · unverified seller declarations." : "No active seller listing in the demo."}</p>${renderFields(sellerFields)}</section>
  <section><h2>Official Government records</h2><p>${missingChecks === checks.length ? unavailableGovernmentStatus + " · " : ""}${missingChecks} of ${checks.length} checks unavailable.</p><ul>${checkItems}</ul></section>
  <section><h2>Buyer due diligence</h2><p>${buyerReviewNotice}</p>
    ${history ? `<p>Buyer workspace status · ${review.buyerStatus}</p>` : "<p>Public report. Private buyer progress and history are unavailable without an active demo buyer session.</p>"}
    ${renderFields([["Total checks", String(checks.length)], ["Buyer-completed", history ? String(review.completedCount) : "Unavailable"],
      ["Buyer pending", history ? String(review.pending.length) : "Unavailable"], ["Official unavailable", String(review.unavailable.length)]])}
    ${history ? `<ul>${review.checks.map(check => `<li>${escapeHtml(check.label)} · ${escapeHtml(check.buyerStatus)}</li>`).join("")}</ul>` : ""}
  </section>
  <section><h2>Outstanding verification items</h2>
    <h3>Official records to obtain</h3>
    ${review.unavailable.length ? `<ul>${review.unavailable.map(check => `<li>${escapeHtml(check.label)}</li>`).join("")}</ul>` : "<p>No unavailable records shown.</p>"}
    ${history ? `<h3>Pending buyer checklist items</h3>${review.pending.length ? `<ul>${review.pending.map(check => `<li>${escapeHtml(check.label)}</li>`).join("")}</ul>` : "<p>No pending buyer checklist items.</p>"}` : ""}
  </section>
  <section><h2>Rule-based risk observations</h2>
    <p><strong>${escapeHtml(review.riskIndicator)}</strong></p><p>${riskNotice}</p>
    <ul>${review.observations.map(({ label, detail }) => `<li><strong>${escapeHtml(label)}</strong> · ${escapeHtml(detail)}</li>`).join("")}</ul>
  </section>
  <section><h2>Verification history</h2>
    ${historyItems.length ? `<ol>${historyItems.join("")}</ol>` : `<p>${history ? "No buyer checklist changes yet." : "Private buyer history is unavailable in the public report."}</p>`}
  </section>
  <section><h2>Recommended next steps</h2>
    <ol>${review.recommendations.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
  </section>
</main>
</body>
</html>`;
}
