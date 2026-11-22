"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionRateMessage } from "../../../lib/action-rate-limit";
import { buyerSwitchUnlocked, lockBuyerSwitch, setDemoBuyer, unlockBuyerSwitch } from "../../../lib/buyer-session";
import type { BuyerSwitchActionState } from "../../../lib/buyer-switch-policy";
import { listDemoBuyerProfiles } from "../../../lib/buyer-switch-store";

export async function unlockBuyerSwitchAction(_: BuyerSwitchActionState, form: FormData): Promise<BuyerSwitchActionState> {
  const limited = actionRateMessage("buyer-switch-unlock", 10);
  if (limited) return { error: limited };
  const key = form.get("key");
  if (typeof key !== "string" || key.length < 20 || key.length > 512 || !(await unlockBuyerSwitch(key))) {
    return { error: "The local buyer-switch key was not accepted, or switching is disabled." };
  }
  redirect("/buyer/switch");
}

export async function lockBuyerSwitchAction() {
  await lockBuyerSwitch();
  redirect("/buyer/switch");
}

export async function switchDemoBuyerAction(_: BuyerSwitchActionState, form: FormData): Promise<BuyerSwitchActionState> {
  if (!(await buyerSwitchUnlocked())) return { error: "Unlock local demo buyer switching first." };
  const limited = actionRateMessage("buyer-switch", 30);
  if (limited) return { error: limited };
  const id = form.get("buyerId");
  if (typeof id !== "string" || id.length > 80) return { error: "Select an existing fictional demo buyer." };
  try {
    if (!listDemoBuyerProfiles().some(profile => profile.id === id)) return { error: "Select an existing fictional demo buyer." };
    await setDemoBuyer(id);
  } catch {
    return { error: "The local buyer workspace is unavailable. No buyer records were changed. Try again shortly." };
  }
  revalidatePath("/buyer", "layout");
  revalidatePath("/verify-records");
  revalidatePath("/explore/parcels/[parcelId]", "page");
  redirect("/buyer/dashboard");
}
