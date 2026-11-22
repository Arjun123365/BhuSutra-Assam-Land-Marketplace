"use server";

import { redirect } from "next/navigation";
import type { SellerActionState } from "../../../lib/seller-demo";
import { lockSellerSwitch, sellerSwitchUnlocked, setDemoSeller, unlockSellerSwitch } from "../../../lib/seller-session";
import { listDemoSellerProfiles } from "../../../lib/seller-store";
import { actionRateMessage } from "../../../lib/action-rate-limit";

export async function unlockSellerSwitchAction(_: SellerActionState, form: FormData): Promise<SellerActionState> {
  const limited = actionRateMessage("seller-switch-unlock", 10);
  if (limited) return { error: limited };
  const key = form.get("key");
  if (typeof key !== "string" || key.length > 512 || !(await unlockSellerSwitch(key))) {
    return { error: "The local seller-switch key was not accepted, or switching is disabled." };
  }
  redirect("/seller/switch");
}

export async function lockSellerSwitchAction() {
  await lockSellerSwitch();
  redirect("/seller/switch");
}

export async function switchDemoSellerAction(_: SellerActionState, form: FormData): Promise<SellerActionState> {
  if (!(await sellerSwitchUnlocked())) return { error: "Unlock local demo seller switching first." };
  const limited = actionRateMessage("seller-switch", 30);
  if (limited) return { error: limited };
  const id = form.get("sellerId");
  if (typeof id !== "string" || !listDemoSellerProfiles().some(profile => profile.id === id)) {
    return { error: "Select an existing fictional demo seller." };
  }
  await setDemoSeller(id);
  redirect("/seller/dashboard");
}
