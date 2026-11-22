import { transactionAnalytics, type MonitoringSnapshot } from "../../lib/coordination";

export function MonitoringSummary({ snapshot }: { snapshot: MonitoringSnapshot }) {
  const stats = transactionAnalytics(snapshot);
  const counts = [
    ["Total requests", stats.total], ["Active / pending", stats.active],
    ["Awaiting seller response", stats.sellerPending], ["Awaiting buyer / shared action", stats.buyerPending],
    ["Closed coordination", stats.closed], ["Cancelled", stats.cancelled], ["Pending follow-ups", stats.followups],
  ];
  return (
    <>
      <dl className="admin-counts">
        {counts.map(([label, count]) => <div key={label} className="seller-card"><dt>{label}</dt><dd>{count}</dd></div>)}
      </dl>
      <p className="seller-notice">Average closed coordination duration {stats.averageHours === null ? "requires at least two closed requests with recorded closure events." : stats.averageHours.toFixed(2) + " hours across " + stats.durationSamples + " closed requests."} Pending action groups include shared preparation steps.</p>
      <section className="seller-card">
        <h2>District distribution</h2>
        <dl className="seller-facts">{stats.districts.map(item => <div key={item.district}><dt>{item.district}</dt><dd>{item.total} requests · {item.active} active</dd></div>)}</dl>
      </section>
    </>
  );
}
