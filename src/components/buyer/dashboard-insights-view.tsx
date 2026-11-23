import Link from "next/link";
import { assistanceHref,assistanceNextStep,isActiveAssistance,type AssistanceRequest } from "../../lib/assistance";
import type { Enquiry } from "../../lib/buyer-demo";
import type { BuyerParcelProgress } from "../../lib/dashboard-data";
import { governmentCheckIds } from "../../lib/parcel-records";
import { verificationHref } from "../../lib/verification-model";
import { MetricCards,RecentActivity } from "../dashboard-ui";

export function BuyerDashboardInsights({ enquiries, requests, progress, unread }: { enquiries: Enquiry[]; requests: AssistanceRequest[]; progress: BuyerParcelProgress[]; unread: number }) {
  const tracked = [...new Set([...enquiries.map(item => item.parcelId), ...requests.map(item => item.parcelId), ...progress.map(item => item.parcelId)])];
  const complete = progress.reduce((sum, item) => sum + item.completed, 0);
  const checksPerParcel = governmentCheckIds.length;
  const total = tracked.length * checksPerParcel;
  const active = requests.filter(item => isActiveAssistance(item.stage));
  const recent = [
    ...enquiries.flatMap(item => item.events.map(event => ({ label: item.parcelId + " enquiry · " + event.newStatus, recordedAt: event.recordedAt, href: "/buyer/dashboard#enquiries" }))),
    ...requests.map(item => ({ label: item.parcelId + " transaction updated", recordedAt: item.updatedAt, href: assistanceHref("Buyer", item.reference) })),
    ...progress.map(item => ({ label: item.parcelId + " buyer checklist updated", recordedAt: item.updatedAt, href: verificationHref(item.parcelId) })),
  ].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  return (
    <>
      <MetricCards items={[
        { label: "Active enquiries", value: enquiries.filter(item => item.status !== "Closed").length, href: "#enquiries" },
        { label: "Active assistance", value: active.length, href: "/buyer/transactions" },
        { label: "Buyer checks complete", value: complete, detail: total ? "Across " + tracked.length + (tracked.length === 1 ? " followed parcel" : " followed parcels") : "No parcels followed yet" },
        { label: "Pending buyer checks", value: total - complete, href: "/verify-records" },
        { label: "Unread updates", value: unread, href: "/buyer/notifications" },
      ]} />
      <div className="workspace-insights">
        <section className="dashboard-panel">
          <h2>Due-diligence progress</h2>
          <p>{checksPerParcel} buyer checks per followed parcel. Official verification remains unavailable.</p>
          {tracked.length ? <ul className="review-progress">{tracked.map(parcelId => {
            const completed = progress.find(item => item.parcelId === parcelId)?.completed ?? 0;
            return <li key={parcelId}><div><Link href={verificationHref(parcelId)}>{parcelId}</Link><span>{completed} / {checksPerParcel} buyer checks</span></div>
              <progress max={checksPerParcel} value={completed} aria-label={parcelId + " buyer checklist progress"} />
            </li>;
          })}</ul> : <p className="dashboard-empty">Explore a parcel or submit an enquiry to begin your due-diligence overview.</p>}
        </section>
        <section className="dashboard-panel">
          <h2>Recommended next actions</h2>
          <ul className="next-actions">
            {active.slice(0, 3).map(item => <li key={item.reference}><Link href={assistanceHref("Buyer", item.reference)}>{item.parcelId} · {assistanceNextStep(item.stage)}</Link></li>)}
            {tracked.length > 0 && <li><Link href={verificationHref(tracked[0])}>Review pending checks and unavailable official records.</Link></li>}
            {!active.length && <li><Link href="/explore">Explore approved demo listings and review parcel information.</Link></li>}
            {unread > 0 && <li><Link href="/buyer/notifications">Read {unread === 1 ? "your transaction update" : "your " + unread + " transaction updates"}.</Link></li>}
          </ul>
        </section>
        <RecentActivity items={recent} />
      </div>
    </>
  );
}
