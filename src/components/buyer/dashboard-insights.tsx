import { getNotifications } from "../../lib/coordination-store";
import { getBuyerVerificationOverview } from "../../lib/dashboard-data";
import { BuyerDashboardInsights as View } from "./dashboard-insights-view";
export function BuyerDashboardInsights({ buyerId, ...props }: Omit<Parameters<typeof View>[0], "progress" | "unread"> & {buyerId: string}) { return <View {...props} progress={getBuyerVerificationOverview(buyerId)} unread={getNotifications({kind:"Buyer",id:buyerId}).filter(n=>!n.read).length} />; }
