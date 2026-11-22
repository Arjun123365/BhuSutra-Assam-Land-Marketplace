import Link from "next/link";
import type { ChartValue, DashboardActivity } from "../lib/dashboard-data";

export function MetricCards({ items, label = "Dashboard summary" }: {
  items: { label: string; value: number; href?: string; detail?: string }[];
  label?: string;
}) {
  return (
    <dl className="dashboard-metrics" aria-label={label}>
      {items.map(item => (
        <div className="dashboard-metric" key={item.label}>
          <dt>{item.href ? <Link href={item.href}>{item.label}</Link> : item.label}</dt>
          <dd>{item.value.toLocaleString("en-IN")}{item.detail && <small>{item.detail}</small>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DistributionChart({ title, values, description, empty = "No stored demonstration activity yet." }: {
  title: string; values: ChartValue[]; description: string; empty?: string;
}) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const maximum = Math.max(1, ...values.map(item => item.value));
  return (
    <figure className="dashboard-chart">
      <figcaption><h2>{title}</h2><p>{description}</p></figcaption>
      {total > 0 ? <ul>{values.map(item => (
        <li key={item.label}>
          <div className="chart-row-label"><span>{item.label}</span><strong>{item.value}</strong></div>
          <span className="chart-track" aria-hidden="true"><span style={{ width: (item.value / maximum * 100) + "%" }} /></span>
        </li>
      ))}</ul> : <p className="dashboard-empty">{empty}</p>}
    </figure>
  );
}

export function RecentActivity({ items, title = "Recent activity" }: { items: DashboardActivity[]; title?: string }) {
  return (
    <section className="dashboard-panel">
      <h2>{title}</h2>
      {items.length ? <ol className="dashboard-activity">{items.slice(0, 6).map((item, index) => <li key={item.recordedAt + "-" + index}>
        <Link href={item.href}>{item.label}</Link>
        <time dateTime={item.recordedAt}>{new Date(item.recordedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</time>
      </li>)}</ol> : <p className="dashboard-empty">Your stored demo activity will appear here.</p>}
    </section>
  );
}
