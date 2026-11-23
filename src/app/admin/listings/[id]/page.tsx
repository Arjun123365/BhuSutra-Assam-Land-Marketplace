import { notFound } from "next/navigation";
import { ListingReviewView } from "../../../../components/admin/listing-review-view";
import { ReviewDecisionForm } from "../../../../components/admin/review-forms";
import { requireAdmin } from "../../../../lib/admin-session";
import { getAdminReview } from "../../../../lib/seller-store";


export default async function ListingReview({ params, searchParams }: PageProps<"/admin/listings/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const review = getAdminReview(id);
  if (!review) notFound();
  const { listing, parcel, sellerName, conflict, events } = review;
  const { saved } = await searchParams;
return <ListingReviewView {...{listing,parcel,sellerName,conflict,events,saved}} DecisionForm={ReviewDecisionForm} />;
}
