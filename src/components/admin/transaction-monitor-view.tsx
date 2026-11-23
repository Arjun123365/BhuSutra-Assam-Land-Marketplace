import Link from "next/link";
import { assistanceChecklist,preparedChecks,type AssistanceEvent } from "../../lib/assistance";
import { openFollowups,type CoordinationEvent,type MonitoringRequest } from "../../lib/coordination";
import { workflowNotice } from "../../lib/workflow-notice";
import { CoordinationHistory } from "../assistance/coordination-history";
import { ProgressTracker } from "../assistance/progress-tracker";
export function TransactionMonitorView({reference,request,activities,coordination,notice,update,reportAction}:{reference:string;request:MonitoringRequest;activities:AssistanceEvent[];coordination:CoordinationEvent[];notice?:unknown;update:(form:FormData)=>Promise<void>;reportAction?:()=>void}){const pending=openFollowups(coordination),prepared=preparedChecks(activities);
  return (
    <>
      <div className="seller-heading">
        <div><Link href="/admin/transactions">← Transaction monitoring</Link><h1>{request.parcelId} coordination</h1><p className="assistance-ref">{reference}</p><p>{request.district} / {request.circle}</p></div>
        {reportAction ? <button className="seller-secondary" onClick={reportAction}>Download individual history</button> : <a className="seller-secondary" href={"/admin/transactions/report?kind=history&reference=" + reference} download>Download individual history</a>}
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
