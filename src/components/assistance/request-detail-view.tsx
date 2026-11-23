import Link from "next/link";
import {
assistanceActions,assistanceChecklist,assistanceHref,assistanceNextStep,assistanceStages,checklistNotice,
coordinationNotice,editableCheckGroup,isActiveAssistance,preparedChecks,type AssistanceEvent,type AssistanceRole,
} from "../../lib/assistance";
import { parcelRecordHref } from "../../lib/demo-marketplace";
import { assessDueDiligence,riskNotice } from "../../lib/due-diligence";
import { fullINR } from "../../lib/seller-demo";
import { verificationHref } from "../../lib/verification-model";
import { workflowNotice } from "../../lib/workflow-notice";
import { CoordinationHistory } from "./coordination-history";
import { ProgressTracker } from "./progress-tracker";

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
function DateTime({ value }: { value: string }) {
  return <time dateTime={value}>{dateFormat.format(new Date(value))} IST</time>;
}

function ActivityList({ items }: { items: AssistanceEvent[] }) {
  return (
    <ol className="assistance-activity">
      {items.map(event => (
        <li key={event.id}>
          <strong>{event.actorKind} · {event.activity}</strong>
          {event.checkId && <span>{assistanceChecklist.find(check => check.id === event.checkId)?.label}</span>}
          {event.toStage && <span>{event.fromStage && assistanceStages[event.fromStage] + " → "}{assistanceStages[event.toStage]}</span>}
          <DateTime value={event.recordedAt} />
        </li>
      ))}
    </ol>
  );
}

import type { AssistanceRequest } from "../../lib/assistance";
import type { CoordinationEvent } from "../../lib/coordination";
import type { DemoParcel } from "../../lib/demo-marketplace";
export function AssistanceDetailView({role,request,published,events,parcel,review,coordination,notice,update,reportAction}: {role:AssistanceRole;request:AssistanceRequest;published:boolean;events:AssistanceEvent[];parcel:DemoParcel;review:ReturnType<typeof assessDueDiligence>;coordination:CoordinationEvent[];notice?:unknown;update:(form:FormData)=>Promise<void>;reportAction?:()=>void}) {
const prepared=preparedChecks(events);const editable=editableCheckGroup(request.stage,published);const actions=assistanceActions(request.stage,role,published,prepared);const sellerResponses=events.filter(e=>e.actorKind==="Seller"&&e.toStage);const closed=!isActiveAssistance(request.stage);
  return (
    <>
      <div className="seller-heading">
        <div><Link href={assistanceHref(role)}>← Assistance requests</Link><h1>Transaction assistance</h1><p className="assistance-ref">{request.reference}</p></div>
        {reportAction ? <button className="seller-secondary" onClick={reportAction}>Download demo report</button> : <a className="seller-secondary" href={assistanceHref(role, request.reference) + "/report"} download>Download demo report</a>}
      </div>
      {workflowNotice(notice) && <p role="alert" className="seller-error">{workflowNotice(notice)}</p>}
      <p className="seller-warning">{coordinationNotice} Contact details are kept private.</p>
      <div className="assistance-grid">
        <section className="seller-card">
          <h2>Request details</h2>
          <dl className="seller-facts">
            <div><dt>Parcel and location</dt><dd><Link href={parcelRecordHref(parcel.id)}>{parcel.id}</Link> · {parcel.district} / {parcel.circle}</dd></div>
            <div><dt>Demo buyer</dt><dd>{request.buyerName} · {request.buyerType}</dd></div>
            <div><dt>Demo seller</dt><dd>{request.sellerName} · {request.sellerType}</dd></div>
            <div><dt>Seller-declared asking price at initiation</dt><dd>{fullINR.format(request.askingPrice)}</dd></div>
            <div><dt>Initiated</dt><dd><DateTime value={request.createdAt} /></dd></div>
            <div><dt>Current stage</dt><dd><span className="assistance-stage" data-stage={request.stage}>{assistanceStages[request.stage]}</span></dd></div>
          </dl>
          {!published && <p className="seller-warning">This listing is no longer available publicly. The request and timeline remain available to its participants.</p>}
          <h3 className="assistance-subhead">Pending actions</h3>
          <p>{published || closed ? assistanceNextStep(request.stage) : "Forward stages are paused. An active request can be closed by the seller or cancelled by the buyer."}</p>
          {actions.length > 0 && <form action={update} className="seller-actions assistance-actions">
            {actions.map(action => (
              <div key={action.id}>
                <button type="submit" name="action" value={action.id} disabled={!action.enabled} className={action.to === "closed" || action.to === "cancelled" ? "seller-secondary" : "seller-primary"}>{action.label}</button>
                {action.reason && <p>{action.reason}</p>}
              </div>
            ))}
          </form>}
        </section>
        <ProgressTracker request={request} events={events} />
        <section className="seller-card assistance-checklist">
          <h2>Transaction documentation checklist</h2>
          <p>{checklistNotice}</p>
          <ul>{assistanceChecklist.map(check => {
            const complete = prepared.has(check.id);
            return (
              <li key={check.id}>
                <div><strong>{check.label}</strong><p>{complete ? "Preparation marked complete" : "Pending preparation"}</p></div>
                {check.group === editable && <form action={update}>
                  <input type="hidden" name="check" value={check.id} />
                  <button className="seller-secondary" type="submit" name="completed" value={complete ? "no" : "yes"}
                    aria-label={(complete ? "Reopen " : "Mark prepared: ") + check.label}>{complete ? "Reopen" : "Mark prepared"}</button>
                </form>}
              </li>
            );
          })}</ul>
        </section>
        <section className="seller-card">
          <h2>Due diligence</h2>
          <p>{prepared.size} of {assistanceChecklist.length} shared preparation items marked complete.</p>
          {role === "Buyer" && <p>{review.completedCount} of {review.checks.length} private buyer checks marked complete. <Link href={verificationHref(parcel.id)}>Open buyer verification workspace</Link></p>}
          <p>{review.unavailable.length} official Government checks are unavailable. {riskNotice}</p>
          {parcel.restriction && <p className="seller-warning">Synthetic flag for follow-up · {parcel.restriction}</p>}
          <details><summary>Verification observations</summary>
            <ul className="assistance-observations">
              {review.observations.map(item => <li key={item.id}>{item.label} · {item.detail}</li>)}
            </ul>
          </details>
          <h3 className="assistance-subhead">Seller response history</h3>
          {sellerResponses.length ? <ActivityList items={sellerResponses} /> : <p>No seller activity yet.</p>}
        </section>
        <section className="seller-card assistance-timeline">
          <h2>Activity timeline</h2>
          <ActivityList items={events} />
        </section>
        <CoordinationHistory events={coordination} />
      </div>
    </>
  );
}
