import Link from "next/link";
import { assistanceHref, assistanceNextStep, assistanceStages, isActiveAssistance, type AssistanceRequest, type AssistanceRole } from "../../lib/assistance";
import { findDemoParcel } from "../../lib/demo-marketplace";

export function AssistanceList({ requests, role, compact = false }: { requests: AssistanceRequest[]; role: AssistanceRole; compact?: boolean }) {
  const active = requests.filter(request => isActiveAssistance(request.stage));
  const finished = requests.filter(request => !isActiveAssistance(request.stage));
  return (
    <section id="transaction-assistance" className="seller-card assistance-list" aria-labelledby="assistance-list-title">
      <div className="seller-heading">
        <div><h2 id="assistance-list-title">{role === "Seller" ? "Buyer assistance requests" : "My assistance requests"}</h2>
          <p>{active.length} active · {finished.length} closed or cancelled</p></div>
        {compact && <Link className="seller-secondary" href={assistanceHref(role)}>View all requests</Link>}
      </div>
      {!requests.length && <p className="seller-empty">{role === "Buyer" ? "Open an approved listing to start a demonstration assistance request." : "Assistance requests for your listings will appear here."}</p>}
      {compact && requests.length > 0 && !active.length && <p className="seller-empty">No active requests. Open the full dashboard to view past activity.</p>}
      {(compact ? active.slice(0, 3) : [...active, ...finished]).map((request) => {
        const parcel = findDemoParcel(request.parcelId);
        return (
          <article key={request.reference} className="assistance-list-row">
            <div>
              <h3><Link href={assistanceHref(role, request.reference)}>{request.parcelId} · {parcel?.district} / {parcel?.circle}</Link></h3>
              <p>{role === "Buyer" ? "Demo seller " + request.sellerName : "Demo buyer " + request.buyerName}</p>
              <p>{assistanceNextStep(request.stage)}</p>
            </div>
            <span className="assistance-stage" data-stage={request.stage}>{assistanceStages[request.stage]}</span>
          </article>
        );
      })}
    </section>
  );
}
