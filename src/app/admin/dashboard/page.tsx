import { AdminDashboardView } from "../../../components/admin/dashboard-view";
import { requireAdmin } from "../../../lib/admin-session";
import { transactionAnalytics } from "../../../lib/coordination";
import { getMonitoringSnapshot,getNotifications } from "../../../lib/coordination-store";
import { getAdministratorAnalytics,getHomepageStatistics,getParcelDistributions } from "../../../lib/dashboard-data";
import { getReviewCounts } from "../../../lib/seller-store";

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const { statuses } = getReviewCounts();
  const snapshot = getMonitoringSnapshot({ kind: "Admin", id: admin });
  const stats = transactionAnalytics(snapshot);
  const analytics = getAdministratorAnalytics();
  const parcels = getParcelDistributions();
  const counts = getHomepageStatistics();
  const notifications = getNotifications({ kind: "Admin", id: admin });

 return <AdminDashboardView {...{statuses,stats,analytics,parcels,counts,notifications,snapshot}} />;
}
