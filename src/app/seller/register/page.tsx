import { RegisterForm } from "../../../components/seller/register-form";
import { currentSeller } from "../../../lib/seller-session";
import { sellerSwitchKey } from "../../../lib/seller-cookie";
import Link from "next/link";

export default async function RegisterPage() {
  const seller = await currentSeller();

  return (
    <div className="seller-columns">
      <section className="seller-card" aria-labelledby="register-heading">
        <h1 id="register-heading">Register a demo seller</h1>
        <p>Create a fictional profile to save drafts and submit voluntary listing requests for synthetic parcels.</p>
        <RegisterForm />
      </section>
      <aside className="seller-card seller-aside" aria-labelledby="existing-profile">
        <h2 id="existing-profile">Use an existing demo profile</h2>
        {seller && <p>You’re using <strong>{seller.displayName}</strong>. <Link href="/seller/dashboard">Return to your dashboard</Link>.</p>}
        <p>Your existing profile and listing history are saved locally.</p>
        {sellerSwitchKey()
          ? <Link href="/seller/switch" className="seller-secondary">Switch Demo Seller</Link>
          : <p>Enable local demo seller switching to return to a saved profile.</p>}
      </aside>
    </div>
  );
}
