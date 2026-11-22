import { BuyerRegistrationForm } from "../../../components/buyer/buyer-forms";
import Link from "next/link";
import { interestHref } from "../../../lib/buyer-demo";
import { currentBuyer } from "../../../lib/buyer-session";
import { findDemoParcel } from "../../../lib/demo-marketplace";
import { continueBuyerVerificationAction } from "../actions";

export default async function BuyerRegisterPage({ searchParams }: PageProps<"/buyer/register">) {
  const { listing, parcel } = await searchParams;
  const listingId = typeof listing === "string" ? listing.slice(0, 100) : "";
  const parcelId = typeof parcel === "string" ? findDemoParcel(parcel)?.id ?? "" : "";
  const buyer = await currentBuyer();
  return (
    <section className="seller-card">
      <h1>Register a demo buyer</h1>
      {buyer ? (
        <>
          <p>Active demo buyer <strong>{buyer.displayName}</strong>.</p>
          {parcelId && !listingId ? (
            <form action={continueBuyerVerificationAction} className="seller-actions">
              <input type="hidden" name="parcelId" value={parcelId} />
              <button type="submit" className="seller-primary">Continue with this profile</button>
            </form>
          ) : <p><Link href={listingId ? interestHref(listingId) : "/buyer/dashboard"}>Continue with this profile</Link>.</p>}
        </>
      ) : <><p>Create a fictional buyer profile to save due-diligence checks or track demonstration enquiries. Contact details stay in your own profile.</p><BuyerRegistrationForm listingId={listingId} parcelId={parcelId} /></>}
    </section>
  );
}
