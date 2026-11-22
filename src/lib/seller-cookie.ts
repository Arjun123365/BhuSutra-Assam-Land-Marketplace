import { createHmac, timingSafeEqual } from "node:crypto";

export function sellerSwitchKey(environment = process.env) {
  const key = environment.BHUSUTRA_DEMO_SELLER_SWITCH_KEY;
  return environment.NODE_ENV === "development" && environment.BHUSUTRA_DEMO_SELLER_SWITCH === "1" && key && key.length >= 20
    ? key
    : undefined;
}

export function matchesSellerSecret(value: string, expected: string) {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

type SellerCookiePurpose = "seller-session" | "seller-switch" | "buyer-session" | "buyer-switch";

export function signSellerCookie(purpose: SellerCookiePurpose, value: string, expires: number, key: string) {
  const payload = value + "." + expires;
  const signature = createHmac("sha256", key).update("bhusutra:" + purpose + ":" + payload).digest("hex");
  return payload + "." + signature;
}

export function verifySellerCookie(purpose: SellerCookiePurpose, token: string, key: string, now: number) {
  if (token.length > 256) return undefined;
  const match = /^([a-zA-Z0-9-]{1,80})\.(\d{1,15})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return undefined;
  const [, value, expires] = match;
  if (Number(expires) <= now || !matchesSellerSecret(token, signSellerCookie(purpose, value, Number(expires), key))) return undefined;
  return value;
}
