import Link from "next/link";
import { ListingForm } from "../../../components/seller/listing-form";
import { demoParcels } from "../../../lib/demo-marketplace";
import { requireSeller } from "../../../lib/seller-session";
import { getListingEditor } from "../../../lib/seller-store";

export default async function ListPropertyPage({ searchParams }: PageProps<"/seller/list-property">) {
  const seller = await requireSeller();
  const { draft: requestedDraft } = await searchParams;
  const draftId = typeof requestedDraft === "string" ? requestedDraft : undefined;
  const { draft, blocked } = getListingEditor(seller.id, draftId);
  const parcels = demoParcels.map(({ id, district, circle, dagNumber, pattaNumber, pattaType, area, areaUnit, category, restriction }) =>
    ({ id, district, circle, dagNumber, pattaNumber, pattaType, area, areaUnit, category, restriction }),
  );

  return (
    <section className="seller-card" aria-labelledby="listing-heading">
      <h1 id="listing-heading">{draft ? "Resume listing draft" : "List a demo parcel"}</h1>
      {draftId && !draft ? (
        <p role="status">This draft is unavailable. <Link href="/seller/dashboard">Return to your dashboard</Link>.</p>
      ) : (
        <>
          <p>Choose a synthetic parcel and prepare a seller-declared request. Submitted requests are private until approved in a future review phase.</p>
          <ListingForm key={draft?.id ?? "new"} district={seller.district} hasEmail={Boolean(seller.email)} parcels={parcels} draft={draft} blocked={blocked} />
        </>
      )}
    </section>
  );
}
