import "server-only";

import { randomBytes } from "node:crypto";
import { linkSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { matchesSellerSecret, sellerSwitchKey, signSellerCookie, verifySellerCookie } from "./seller-cookie";
import { databasePath, getSeller } from "./seller-store";
import { cache } from "react";

const sellerCookie = "bhusutra_demo_seller";
const switchCookie = "bhusutra_demo_seller_switch";
const sellerLifetime = 30 * 24 * 60 * 60;
const switchLifetime = 15 * 60;
const now = () => Math.floor(Date.now() / 1000);
let signingKey: string | undefined;

export function readSigningKey() {
  if (signingKey) return signingKey;
  const keyPath = databasePath + ".session-key";
  try {
    signingKey = readFileSync(keyPath, "utf8");
    return signingKey;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return undefined;
  }
}

export function ensureSigningKey() {
  const existing = readSigningKey();
  if (existing) return existing;

  const keyPath = databasePath + ".session-key";
  const temporary = keyPath + "." + randomBytes(8).toString("hex");
  mkdirSync(dirname(keyPath), { recursive: true });
  writeFileSync(temporary, randomBytes(32).toString("hex"), { mode: 0o600, flag: "wx" });
  try {
    // Publish the complete key without replacing another process's key.
    linkSync(temporary, keyPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  } finally {
    unlinkSync(temporary);
  }
  const stored = readSigningKey();
  if (!stored) throw new Error("Seller session key is unavailable.");
  return stored;
}

export const currentSeller = cache(async function currentSeller() {
  const token = (await cookies()).get(sellerCookie)?.value;
  if (!token?.includes(".")) return undefined;
  const key = readSigningKey();
  const id = key ? verifySellerCookie("seller-session", token, key, now()) : undefined;
  return id ? getSeller(id) : undefined;
});

export async function requireSeller() {
  const seller = await currentSeller();
  if (!seller) redirect("/seller/register");
  return seller;
}

export async function setDemoSeller(id: string) {
  const token = signSellerCookie("seller-session", id, now() + sellerLifetime, ensureSigningKey());
  (await cookies()).set(sellerCookie, token, {
    path: "/seller", httpOnly: true, sameSite: "lax", maxAge: sellerLifetime,
  });
}

export async function unlockSellerSwitch(value: string) {
  const key = sellerSwitchKey();
  if (!key || !matchesSellerSecret(value, key)) return false;
  const token = signSellerCookie("seller-switch", "unlocked", now() + switchLifetime, key);
  (await cookies()).set(switchCookie, token, {
    path: "/seller/switch", httpOnly: true, sameSite: "strict", maxAge: switchLifetime,
  });
  return true;
}

export async function sellerSwitchUnlocked() {
  const key = sellerSwitchKey();
  if (!key) return false;
  const token = (await cookies()).get(switchCookie)?.value;
  return Boolean(token && verifySellerCookie("seller-switch", token, key, now()) === "unlocked");
}

export async function lockSellerSwitch() {
  (await cookies()).set(switchCookie, "", {
    path: "/seller/switch", httpOnly: true, sameSite: "strict", maxAge: 0,
  });
}
