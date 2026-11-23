import { BuyerDashboardInsights } from "../../../components/buyer/dashboard-insights";
import { BuyerDashboardView } from "../../../components/buyer/dashboard-view";
import { EnquiryList } from "../../../components/buyer/enquiry-list";
import { listAssistance } from "../../../lib/assistance-store";
import { requireBuyer } from "../../../lib/buyer-session";
import { getEnquiries } from "../../../lib/buyer-store";
import { getApprovedListingsReadOnly } from "../../../lib/seller-store";

export default async function BuyerDashboard({ searchParams }: PageProps<"/buyer/dashboard">) {
  const buyer = await requireBuyer();
  const actor = { kind: "Buyer", id: buyer.id } as const;
  const enquiries = getEnquiries(actor);
  const requests = listAssistance(actor);
  const { notice } = await searchParams;
  return <BuyerDashboardView {...{buyer,requests,notice}} insights={<BuyerDashboardInsights buyerId={buyer.id} enquiries={enquiries} requests={requests} />} enquiryPanel={<EnquiryList enquiries={enquiries} assistanceListingIds={new Set(getApprovedListingsReadOnly().map(({listingId})=>listingId))} />} />;
}
