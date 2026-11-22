import { assistanceNextStep, assistanceStages, isActiveAssistance, type AssistanceEvent, type AssistanceRequest, type AssistanceStage } from "../../lib/assistance";
import { responsibleParticipant } from "../../lib/coordination";

export function ProgressTracker({ request, events }: { request: AssistanceRequest; events: AssistanceEvent[] }) {
  const visited = new Set(events.map(event => event.toStage));
  const ended = !isActiveAssistance(request.stage);
  return (
    <section className="seller-card">
      <h2>Progress tracker</h2>
      <p>Responsible participant · {responsibleParticipant(request.stage)}</p>
      <p>{assistanceNextStep(request.stage)}</p>
      <p>Workflow updated <time dateTime={request.updatedAt}>{new Date(request.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</time></p>
      <ol className="assistance-tracker">
        {Object.entries(assistanceStages).filter(([stage]) => stage !== "cancelled" && stage !== "closed").map(([stage, label]) => (
          <li key={stage} aria-current={request.stage === stage ? "step" : undefined}>
            <span>{label}</span><small>{request.stage === stage ? "Current" : visited.has(stage as AssistanceStage) ? "Reached" : "Pending"}</small>
          </li>
        ))}
        <li aria-current={ended ? "step" : undefined}><span>{ended ? assistanceStages[request.stage] : "Closed or Cancelled"}</span><small>{ended ? "Current" : "Pending"}</small></li>
      </ol>
    </section>
  );
}
