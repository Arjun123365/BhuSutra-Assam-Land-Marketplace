import type { CoordinationEvent } from "../../lib/coordination";
import { openFollowups } from "../../lib/coordination";

export function CoordinationHistory({ events }: { events: CoordinationEvent[] }) {
  const pending = openFollowups(events);
  return (
    <section className="seller-card assistance-timeline">
      <h2>Administrator coordination updates</h2>
      <p>{pending.length} pending documentation follow-ups.</p>
      {events.length ? <ol className="assistance-activity">{events.map(event => (
        <li key={event.id}>
          <strong>{event.kind === "flag" ? "Incomplete documentation flagged" : event.kind === "complete" ? "Follow-up completed" : "Coordination note"}</strong>
          {event.targetId && <span>Follow-up #{event.targetId}</span>}
          <span>{event.note}</span>
          <time dateTime={event.recordedAt}>{new Date(event.recordedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</time>
        </li>
      ))}</ol> : <p>No administrator updates recorded.</p>}
    </section>
  );
}
