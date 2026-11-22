import { createHmac, timingSafeEqual } from "node:crypto";

export const demoAdministratorId = "local-demo-administrator";
export const adminSessionSeconds = 3600;

export function demoAdminKey(environment = process.env) {
  const key = environment.BHUSUTRA_DEMO_ADMIN_KEY;
  return environment.NODE_ENV === "development" && environment.BHUSUTRA_DEMO_ADMIN === "1" && key && key.length >= 20
    ? key
    : undefined;
}

export function matchesAdminKey(value: string, key: string) {
  const actual = Buffer.from(value);
  const expected = Buffer.from(key);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function signAdminSession(key: string, expires: number) {
  const signature = createHmac("sha256", key).update("bhusutra-admin-session:" + expires).digest("hex");
  return expires + "." + signature;
}

export function validAdminSession(token: string, key: string, now: number) {
  if (!/^\d{1,15}\.[a-f0-9]{64}$/.test(token)) return false;
  const expires = Number(token.split(".")[0]);
  return expires > now && expires <= now + adminSessionSeconds && matchesAdminKey(token, signAdminSession(key, expires));
}
