import Link from "next/link";
import { notFound } from "next/navigation";
import { coordinationAction } from "../../../coordination-actions";
import { CoordinationHistory } from "../../../../components/assistance/coordination-history";
import { ProgressTracker } from "../../../../components/assistance/progress-tracker";
import { requireAdmin } from "../../../../lib/admin-session";
import { assistanceChecklist, preparedChecks } from "../../../../lib/assistance";
import { openFollowups } from "../../../../lib/coordination";
import { getMonitoringSnapshot } from "../../../../lib/coordination-store";
import { workflowNotice } from "../../../../lib/workflow-notice";

export default async function TransactionMonitor({ params, searchParams }: PageProps<"/admin/transactions/[reference]">) {
  const id = await requireAdmin();
  const { reference } = await params;
  const { notice } = await searchParams;
  const snapshot = getMonitoringSnapshot({ kind: "Admin", id });
  const request = snapshot.requests.find(item => item.reference === reference);
  if (!request) notFound();
  const activities = snapshot.activities.filter(event => event.reference === reference);
  const coordination = snapshot.coordination.filter(event => event.reference === reference);
  const pending = openFollowups(coordination);
  const prepared = preparedChecks(activities);
  const update = coordinationAction.bind(null, reference);
  return (
    <>
      <div className="seller-heading">
        <div><Link href="/admin/transactions">← Transaction monitoring</Link><h1>{request.parcelId} coordination</h1><p className="assistance-ref">{reference}</p><p>{request.district} / {request.circle}</p></div>
        <a className="seller-secondary" href={"/admin/transactions/report?kind=history&reference=" + reference} download>Download individual history</a>
      </div>
      <p className="seller-warning">Coordination notes and documentation flags are shared with both participants. Government checks remain Not connected / Not verified. Use fictional notes and omit personal details.</p>
      {workflowNotice(notice) && <p className="seller-error" role="alert">{workflowNotice(notice)}</p>}
      <div className="assistance-grid">
        <ProgressTracker request={request} events={activities} />
        <section className="seller-card">
          <h2>Documentation follow-up</h2>
          <p>{prepared.size} of {assistanceChecklist.length} preparation items marked complete by participants.</p>
          <ul className="assistance-observations">{assistanceChecklist.map(check => <li key={check.id}>{check.label} · {prepared.has(check.id) ? "Preparation marked complete" : "Pending preparation"}</li>)}</ul>
          <form action={update} className="seller-form">
            <div className="seller-fields">
              <label>Coordination update<select name="kind"><option value="note">Add coordination note</option><option value="flag">Flag incomplete documentation</option></select></label>
              <label>Fictional note shared with participants<textarea name="note" required maxLength={500} rows={3} /></label>
            </div>
            <button className="seller-primary" type="submit">Record update</button>
          </form>
          <h3 className="assistance-subhead">Pending follow-ups ({pending.length})</h3>
          <ul className="assistance-activity">{pending.map(event => <li key={event.id}>
            <span>#{event.id} · {event.note}</span>
            <form action={update}><input type="hidden" name="targetId" value={event.id} /><button className="seller-secondary" name="kind" value="complete" type="submit">Complete follow-up</button></form>
          </li>)}</ul>
        </section>
        <CoordinationHistory events={coordination} />
        <section className="seller-card assistance-timeline">
          <h2>Transaction activity history</h2>
          <ol className="assistance-activity">{activities.map(event => <li key={event.id}><strong>{event.actorKind} · {event.activity}</strong>
            {event.checkId && <span>{assistanceChecklist.find(check => check.id === event.checkId)?.label}</span>}
            <time dateTime={event.recordedAt}>{new Date(event.recordedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</time>
          </li>)}</ol>
        </section>
      </div>
    </>
  );
}
