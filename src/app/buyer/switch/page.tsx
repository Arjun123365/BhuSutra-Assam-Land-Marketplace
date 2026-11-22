import { SwitchDemoBuyerForm, UnlockBuyerSwitchForm } from "../../../components/buyer/switch-forms";
import { buyerSwitchKey } from "../../../lib/buyer-switch-policy";
import { buyerSwitchUnlocked, currentBuyer } from "../../../lib/buyer-session";
import { listDemoBuyerProfiles } from "../../../lib/buyer-switch-store";
import type { DemoBuyerSwitchProfile } from "../../../lib/buyer-switch-policy";
import { lockBuyerSwitchAction } from "./actions";

export default async function SwitchBuyerPage() {
  const enabled = Boolean(buyerSwitchKey());
  const unlocked = enabled && await buyerSwitchUnlocked();
  let profiles: DemoBuyerSwitchProfile[] = [];
  let unavailable = false;
  if (unlocked) {
    try { profiles = listDemoBuyerProfiles(); } catch { unavailable = true; }
  }
  const active = unlocked ? await currentBuyer() : undefined;
  return (
    <section className="seller-card" aria-labelledby="switch-buyer-title">
      <h1 id="switch-buyer-title">Switch Demo Buyer</h1>
      <p>Return to an existing fictional buyer profile. This local demonstration tool is not real authentication. Switching changes this browser&apos;s active buyer; it does not create profiles or alter their records.</p>
      {!enabled ? (
        <p className="seller-warning" role="status">Buyer switching requires explicit local development configuration. Production builds disable this feature.</p>
      ) : !unlocked ? <UnlockBuyerSwitchForm /> : (
        <>
          <p className="seller-feedback">Active demo buyer: <strong>{active?.displayName ?? "None selected"}</strong>. Unlock expires after 15 minutes.</p>
          {unavailable ? <p role="alert" className="seller-error">The local buyer profiles are temporarily unavailable. Existing records are unchanged.</p>
            : profiles.length ? <SwitchDemoBuyerForm profiles={profiles} activeId={active?.id} /> : <p>No eligible fictional buyer profiles were found in the local store.</p>}
          <form action={lockBuyerSwitchAction} className="seller-form"><div className="seller-actions"><button type="submit" className="seller-secondary">Lock buyer switching</button></div></form>
        </>
      )}
    </section>
  );
}
