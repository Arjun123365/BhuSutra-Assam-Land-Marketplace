import Link from "next/link";
import type { ChartValue,DashboardActivity } from "../../lib/dashboard-data";
import { DistributionChart,MetricCards,RecentActivity } from "../dashboard-ui";
import type { HomepageCounts } from "../homepage-content";
export function AdminDashboardView({statuses,stats,analytics,parcels,counts,notifications,snapshot,browserOnly=false}: {browserOnly?:boolean;statuses:ReadonlyMap<string,number>;stats:{active:number;followups:number};analytics:{listingStatus:ChartValue[];enquiryTrends:ChartValue[];transactionStages:ChartValue[];recentActivity:DashboardActivity[]};parcels:{districts:ChartValue[];categories:ChartValue[]};counts:HomepageCounts;notifications:{read:boolean}[];snapshot:{activities:{actorKind:string;activity:string;recordedAt:string;reference:string}[];coordination:{kind:string;recordedAt:string;reference:string}[]}}) {
  return (
    <>
      <div className="seller-heading dashboard-welcome">
        <div><p className="workspace-eyebrow">{browserOnly ? "Browser-only demonstration administration" : "Local demonstration administration"}</p><h1>Administrator command centre</h1><p>Review listings, monitor coordination and follow {browserOnly ? "this tab’s simulated" : "stored"} marketplace activity.</p></div>
        <Link className="seller-primary" href="/admin/listings">Open review queue</Link>
      </div>
      <MetricCards items={[
        { label: "Pending listing reviews", value: (statuses.get("Submitted") ?? 0) + (statuses.get("Under Review") ?? 0), href: "/admin/listings" },
        { label: "Active assistance", value: stats.active, href: "/admin/transactions" },
        { label: "Coordination follow-ups", value: stats.followups, href: "/admin/transactions?followup=pending" },
        { label: "Demo sellers / buyers", value: counts.sellers + counts.buyers, detail: counts.sellers + " sellers · " + counts.buyers + " buyers", href: "/admin/profiles" },
        { label: "Buyer enquiries", value: counts.enquiries, href: "/admin/enquiries" },
        { label: "Unread updates", value: notifications.filter(item => !item.read).length, href: "/admin/notifications" },
      ]} />
      <div className="dashboard-section-heading"><h2>Marketplace analytics</h2><Link href="/admin/transactions">Open transaction monitoring →</Link></div>
      <div className="analytics-grid">
        <DistributionChart title="Parcels by district" description="The complete synthetic demonstration parcel dataset." values={parcels.districts} />
        <DistributionChart title="Land classification" description="Classification from synthetic parcel records." values={parcels.categories} />
        <DistributionChart title="Listing status breakdown" description="Aggregate counts across stored requests, including drafts." values={analytics.listingStatus} />
        <DistributionChart title="Buyer enquiry trends" description="Enquiries submitted by date in IST. Up to 14 dates with recorded activity." values={analytics.enquiryTrends} empty="No buyer enquiry submissions recorded yet." />
        <DistributionChart title="Transaction workflow" description="Current stages from stored assistance requests." values={analytics.transactionStages} empty="No transaction assistance requests recorded yet." />
        <RecentActivity title="Recent audit events" items={[
          ...analytics.recentActivity,
          ...snapshot.activities.map(item => ({ label: item.actorKind + " · " + item.activity, recordedAt: item.recordedAt, href: "/admin/transactions/" + item.reference })),
          ...snapshot.coordination.map(item => ({ label: "Administrator coordination · " + item.kind, recordedAt: item.recordedAt, href: "/admin/transactions/" + item.reference })),
        ].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))} />
      </div>
    </>
  );
}
