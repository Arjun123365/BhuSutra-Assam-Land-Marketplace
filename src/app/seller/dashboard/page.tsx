import { EnquiryList } from "../../../components/buyer/enquiry-list";
import { ClarificationForm } from "../../../components/seller/clarification-form";
import { SellerDashboardView } from "../../../components/seller/dashboard-view";
import { WithdrawalForm } from "../../../components/seller/withdrawal-form";
import { listAssistance } from "../../../lib/assistance-store";
import { getEnquiries } from "../../../lib/buyer-store";
import { getNotifications } from "../../../lib/coordination-store";
import { requireSeller } from "../../../lib/seller-session";
import { getSellerDashboard } from "../../../lib/seller-store";

export default async function SellerDashboardPage({ searchParams }: PageProps<"/seller/dashboard">) {
  const seller = await requireSeller();
  const { listings, events } = getSellerDashboard(seller.id);
  const actor = { kind: "Seller", id: seller.id } as const;
  const enquiries = getEnquiries(actor);
  const assistance = listAssistance(actor);
  const unread = getNotifications(actor).filter(item => !item.read).length;
  const { notice } = await searchParams;
  const feedback = notice === "submitted" ? "Listing submitted for demo review."
    : notice === "draft" ? "Draft saved."
    : notice === "resubmitted" ? "Clarification sent. Listing resubmitted for review."
    : notice === "withdrawn" ? "Listing withdrawn." : null;

  return <SellerDashboardView {...{seller,listings,events,enquiries,assistance,unread,feedback}} enquiryPanel={<EnquiryList enquiries={enquiries} seller />} renderWithdrawal={(listingId,parcelId,approved)=><WithdrawalForm {...{listingId,parcelId,approved}} />} renderClarification={listingId=><ClarificationForm listingId={listingId} />} />;
}
