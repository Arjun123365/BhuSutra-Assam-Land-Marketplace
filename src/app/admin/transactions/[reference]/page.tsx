import { notFound } from "next/navigation";
import { TransactionMonitorView } from "../../../../components/admin/transaction-monitor-view";
import { requireAdmin } from "../../../../lib/admin-session";
import { getMonitoringSnapshot } from "../../../../lib/coordination-store";
import { coordinationAction } from "../../../coordination-actions";

export default async function TransactionMonitor({ params, searchParams }: PageProps<"/admin/transactions/[reference]">) {
  const id = await requireAdmin();
  const { reference } = await params;
  const { notice } = await searchParams;
  const snapshot = getMonitoringSnapshot({ kind: "Admin", id });
  const request = snapshot.requests.find(item => item.reference === reference);
  if (!request) notFound();
  const activities = snapshot.activities.filter(event => event.reference === reference);
  const coordination = snapshot.coordination.filter(event => event.reference === reference);
const update=coordinationAction.bind(null,reference);
return <TransactionMonitorView {...{reference,request,activities,coordination,notice,update}} />;
}
