import Link from "next/link";
import { MonitoringSummary } from "../../../components/assistance/monitoring-summary";
import { requireAdmin } from "../../../lib/admin-session";
import { assistanceStages } from "../../../lib/assistance";
import { filterTransactions, openFollowups, responsibleParticipant, type MonitoringFilters } from "../../../lib/coordination";
import { getMonitoringSnapshot } from "../../../lib/coordination-store";
import { demoDistricts } from "../../../lib/demo-marketplace";

export default async function TransactionsPage({ searchParams }: PageProps<"/admin/transactions">) {
  const id = await requireAdmin();
  const params = await searchParams;
  const filters: MonitoringFilters = Object.fromEntries(["query", "district", "stage", "from", "to", "sort", "followup"].map(key => [key, typeof params[key] === "string" ? params[key] : ""]));
  const snapshot = getMonitoringSnapshot({ kind: "Admin", id });
  const requests = filterTransactions(snapshot, filters);
  const pending = openFollowups(snapshot.coordination);
  const reportParams = new URLSearchParams(Object.entries(filters).filter(([, value]) => typeof value === "string") as [string, string][]);
  const recent = [
    ...snapshot.activities.map(event => ({ key: "a-" + event.id, reference: event.reference, text: event.actorKind + " · " + event.activity, time: event.recordedAt })),
    ...snapshot.coordination.map(event => ({ key: "c-" + event.id, reference: event.reference, text: "Administrator · " + event.kind, time: event.recordedAt })),
  ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 15);
  return (
    <>
      <div className="seller-heading"><div><h1>Transaction monitoring</h1><p>Stored demonstration coordination activity across the three supported districts.</p></div></div>
      <MonitoringSummary snapshot={snapshot} />
      <section className="seller-card coordination-section">
        <h2>Assistance requests</h2>
        <form action="/admin/transactions" className="seller-form">
          <div className="seller-fields">
            <label>Search parcel, reference or demo name<input name="query" defaultValue={filters.query} maxLength={100} /></label>
            <label>District<select name="district" defaultValue={filters.district}><option value="">All districts</option>{demoDistricts.map(district => <option key={district}>{district}</option>)}</select></label>
            <label>Workflow stage<select name="stage" defaultValue={filters.stage}><option value="">All stages</option>{Object.entries(assistanceStages).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>Initiated from (IST)<input name="from" type="date" defaultValue={filters.from} /></label>
            <label>Initiated to (IST)<input name="to" type="date" defaultValue={filters.to} /></label>
            <label>Follow-ups<select name="followup" defaultValue={filters.followup}><option value="">All requests</option><option value="pending">Pending documentation follow-ups</option></select></label>
            <label>Sort<select name="sort" defaultValue={filters.sort}><option value="">Recently updated</option><option value="oldest">Oldest initiation first</option><option value="parcel">Parcel</option><option value="district">District</option><option value="stage">Stage</option></select></label>
          </div>
          <div className="seller-actions"><button className="seller-primary" type="submit">Apply filters</button><Link className="seller-secondary" href="/admin/transactions">Reset filters</Link></div>
        </form>
        <p>{requests.length} matching requests · Summary metrics above cover all requests.</p>
        <div className="seller-actions coordination-section">
          {["status", "districts", "followups"].map(kind => <a className="seller-secondary" key={kind} href={"/admin/transactions/report?" + reportParams + "&kind=" + kind} download>Download {kind === "status" ? "status summary" : kind === "districts" ? "district activity" : "pending follow-ups"}</a>)}
        </div>
        <ul className="coordination-request-list">{requests.map(request => (
          <li key={request.reference}>
            <h3><Link href={"/admin/transactions/" + request.reference}>{request.parcelId} · {request.district} / {request.circle}</Link></h3>
            <p className="assistance-ref">{request.reference}</p>
            <span className="assistance-stage" data-stage={request.stage}>{assistanceStages[request.stage]}</span>
            <p>Responsible participant · {responsibleParticipant(request.stage)}</p>
            <p>{pending.filter(event => event.reference === request.reference).length} pending follow-ups</p>
            <p>Initiated <time dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</time></p>
          </li>
        ))}</ul>
        {!requests.length && <p className="seller-empty">No demo transaction requests match these filters.</p>}
      </section>
      <section className="seller-card coordination-section"><h2>Recent transaction activity</h2>
        <ol className="assistance-activity">{recent.map(event => <li key={event.key}><Link href={"/admin/transactions/" + event.reference}>{event.reference}</Link><span>{event.text}</span><time dateTime={event.time}>{new Date(event.time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</time></li>)}</ol>
        {!recent.length && <p>No stored transaction activity yet.</p>}
      </section>
    </>
  );
}
