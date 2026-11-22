import Link from "next/link";
import { ExpressInterestForm } from "../../../../components/buyer/buyer-forms";
import { assistanceStartHref } from "../../../../lib/assistance";
import { currentBuyer } from "../../../../lib/buyer-session";
import { findDemoParcel, parcelHref } from "../../../../lib/demo-marketplace";
import { fullINR } from "../../../../lib/seller-demo";
import { getApprovedListings } from "../../../../lib/seller-store";

export default async function ExpressInterestPage({ params }: PageProps<"/buyer/interest/[listingId]">) {
  const { listingId } = await params;
  const [listing] = getApprovedListings(listingId);
  const parcel = listing && findDemoParcel(listing.parcelId);
  if (!parcel) return (
    <section className="seller-card">
      <h1>Enquiries unavailable</h1>
      <p>This listing is not currently published for enquiries.</p>
      <p><Link href="/#featured">Browse approved listings</Link></p>
    </section>
  );

  const buyer = await currentBuyer();
  return (
    <section className="seller-card">
      <h1>Express Interest</h1>
      <p><Link href={parcelHref(parcel.id)}>View parcel {parcel.id}</Link></p>
      <dl className="seller-facts">
        <div><dt>Parcel ID</dt><dd>{parcel.id}</dd></div>
        <div><dt>District</dt><dd>{parcel.district}</dd></div>
        <div><dt>Revenue Circle</dt><dd>{parcel.circle}</dd></div>
        <div><dt>Land area</dt><dd>{parcel.area} {parcel.areaUnit}</dd></div>
        <div><dt>Seller-declared price</dt><dd>{fullINR.format(listing.price)}</dd></div>
      </dl>
      <p className="seller-warning">Government-record checks remain Not connected / Not verified. Marketplace approval does not certify title. Contact details stay private.</p>
      {buyer ? <><p>Active demo buyer <strong>{buyer.displayName}</strong></p><ExpressInterestForm listingId={listingId} /></>
        : <p><Link href={"/buyer/register?listing=" + encodeURIComponent(listingId)}>Register a demo buyer to continue</Link></p>}
      <p><Link href={assistanceStartHref(listingId)}>Open transaction assistance</Link> to track discussion and preparation for independent review.</p>
    </section>
  );
}
