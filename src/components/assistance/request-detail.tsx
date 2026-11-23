import { notFound } from "next/navigation";
import { updateAssistanceAction } from "../../app/assistance-actions";
import type { AssistanceRole } from "../../lib/assistance";
import { requireAssistanceActor } from "../../lib/assistance-session";
import { getAssistance } from "../../lib/assistance-store";
import { getMonitoringSnapshot } from "../../lib/coordination-store";
import { assessDueDiligence } from "../../lib/due-diligence";
import { getBuyerCheckHistory } from "../../lib/due-diligence-store";
import { getParcelVerification } from "../../lib/verification-model";
import { getVerificationRecord } from "../../lib/verification-service";
import { AssistanceDetailView } from "./request-detail-view";
export async function AssistanceDetail({ role, reference, notice }: { role: AssistanceRole; reference: string; notice: unknown }) {
  const actor = await requireAssistanceActor(role);
  const data = getAssistance(actor, reference);
  if (!data) notFound();
  const { request, published, events } = data;
  const verification = await getVerificationRecord(request.parcelId);
  if (!verification) notFound();
  const { parcel, records } = verification;
  const history = role === "Buyer" ? getBuyerCheckHistory(actor.id, parcel.id) : [];
  const review = assessDueDiligence(getParcelVerification(parcel, records), history);
  const update = updateAssistanceAction.bind(null, role, request.reference);
  const coordination = getMonitoringSnapshot(actor).coordination.filter(event => event.reference === reference);
 return <AssistanceDetailView {...{role,request,published,events,parcel,review,coordination,notice,update}} />;
}
