import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { matchesSellerSecret, signSellerCookie, verifySellerCookie } from "./seller-cookie";
import { ensureSigningKey, readSigningKey } from "./seller-session";
import { getBuyer } from "./buyer-store";
import { cache } from "react";
import { buyerSwitchKey } from "./buyer-switch-policy";

const cookieName = "bhusutra_demo_buyer_workspace";
const legacyCookieName = "bhusutra_demo_buyer";
const lifetime = 30 * 24 * 60 * 60;
const switchCookieName = "bhusutra_demo_buyer_switch";
const switchLifetime = 15 * 60;
const now = () => Math.floor(Date.now() / 1000);

export const currentBuyer = cache(async function currentBuyer() {
  const jar = await cookies();
  const token = (jar.get(cookieName) ?? jar.get(legacyCookieName))?.value;
  if (!token?.includes(".")) return undefined;
  const key = readSigningKey();
  const id = key ? verifySellerCookie("buyer-session", token, key, now()) : undefined;
  return id ? getBuyer(id) : undefined;
});

export async function requireBuyer() {
  const buyer = await currentBuyer();
  if (!buyer) redirect("/buyer/register");
  return buyer;
}

export async function setDemoBuyer(id: string) {
  const token = signSellerCookie("buyer-session", id, now() + lifetime, ensureSigningKey());
  const jar = await cookies();
  jar.set(cookieName, token, {
    path: "/", httpOnly: true, sameSite: "lax", maxAge: lifetime,
  });
  if (jar.has(legacyCookieName)) jar.set(legacyCookieName, "", { path: "/buyer", maxAge: 0 });
}

export async function unlockBuyerSwitch(value: string) {
  const key = buyerSwitchKey();
  if (!key || !matchesSellerSecret(value, key)) return false;
  (await cookies()).set(switchCookieName, signSellerCookie("buyer-switch", "unlocked", now() + switchLifetime, key), {
    path: "/buyer/switch", httpOnly: true, sameSite: "strict", maxAge: switchLifetime,
  });
  return true;
}

export async function buyerSwitchUnlocked() {
  const key = buyerSwitchKey();
  if (!key) return false;
  const token = (await cookies()).get(switchCookieName)?.value;
  return Boolean(token && verifySellerCookie("buyer-switch", token, key, now()) === "unlocked");
}

export async function lockBuyerSwitch() {
  (await cookies()).set(switchCookieName, "", {
    path: "/buyer/switch", httpOnly: true, sameSite: "strict", maxAge: 0,
  });
}
