import { SwitchDemoSellerForm, UnlockSellerSwitchForm } from "../../../components/seller/switch-forms";
import { sellerSwitchKey } from "../../../lib/seller-cookie";
import { currentSeller, sellerSwitchUnlocked } from "../../../lib/seller-session";
import { listDemoSellerProfiles } from "../../../lib/seller-store";
import { lockSellerSwitchAction } from "./actions";

export default async function SwitchSellerPage() {
  const enabled = Boolean(sellerSwitchKey());
  const unlocked = enabled && await sellerSwitchUnlocked();
  const profiles = unlocked ? listDemoSellerProfiles() : [];
  const active = unlocked ? await currentSeller() : undefined;

  return (
    <section className="seller-card" aria-labelledby="switch-seller-title">
      <h1 id="switch-seller-title">Switch Demo Seller</h1>
      <p>Use this local tool to return to an existing fictional profile. Switching only changes the active profile in this browser.</p>
      {!enabled ? (
        <p className="seller-warning" role="status">Seller switching requires explicit local development configuration. Production builds disable this feature.</p>
      ) : !unlocked ? (
        <UnlockSellerSwitchForm />
      ) : (
        <>
          {profiles.length ? <SwitchDemoSellerForm profiles={profiles} activeId={active?.id} /> : <p>No eligible fictional profiles were found in the local store.</p>}
          <form action={lockSellerSwitchAction} className="seller-form"><div className="seller-actions"><button type="submit" className="seller-secondary">Lock seller switching</button></div></form>
        </>
      )}
    </section>
  );
}
