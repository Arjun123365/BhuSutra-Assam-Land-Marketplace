import Link from "next/link";
import { notificationReadAction } from "../../app/coordination-actions";
import type { WorkspaceActor, WorkspaceRole } from "../../lib/coordination";
import { requireCoordinationActor } from "../../lib/coordination-session";
import { getNotifications } from "../../lib/coordination-store";

export function NotificationIndicator({ actor }: { actor: WorkspaceActor }) {
  const count = getNotifications(actor).filter(item => !item.read).length;
  return <Link className="seller-secondary" href={"/" + actor.kind.toLowerCase() + "/notifications"}>Notifications <span className="notification-count" aria-label={count + " unread"}>{count}</span></Link>;
}

export async function NotificationPage({ role }: { role: WorkspaceRole }) {
  const actor = await requireCoordinationActor(role);
  const notifications = getNotifications(actor);
  return (
    <section className="seller-card">
      <h1>In-app notifications</h1>
      <p>{notifications.filter(item => !item.read).length} unread · Updates from stored demo transaction activity.</p>
      {!notifications.length && <p className="seller-empty">No transaction updates for this demo profile yet.</p>}
      <ul className="coordination-notifications">
        {notifications.map(item => (
          <li key={item.key} data-read={item.read}>
            <div><Link href={"/" + role.toLowerCase() + "/transactions/" + encodeURIComponent(item.reference)}>{item.reference}</Link>
              <p>{item.message}</p><time dateTime={item.recordedAt}>{new Date(item.recordedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</time></div>
            {!item.read && <form action={notificationReadAction.bind(null, role, item.key)}><button className="seller-secondary" type="submit">Mark read</button></form>}
            {item.read && <span className="records-status">Read</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
