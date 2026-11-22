import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminSessionSeconds, demoAdminKey, demoAdministratorId, matchesAdminKey, signAdminSession, validAdminSession } from "./admin-policy";
import { cache } from "react";

const cookieName = "bhusutra_demo_admin";

export async function unlockAdmin(value: string) {
  const key = demoAdminKey();
  if (!key || !matchesAdminKey(value, key)) return false;
  const expires = Math.floor(Date.now() / 1000) + adminSessionSeconds;
  (await cookies()).set(cookieName, signAdminSession(key, expires), {
    path: "/admin", httpOnly: true, sameSite: "strict", maxAge: adminSessionSeconds,
  });
  return true;
}

export async function lockAdmin() {
  (await cookies()).set(cookieName, "", { path: "/admin", maxAge: 0, httpOnly: true, sameSite: "strict" });
}

export const currentAdmin = cache(async function currentAdmin() {
  const key = demoAdminKey();
  if (!key) return null;
  const token = (await cookies()).get(cookieName)?.value;
  return token && validAdminSession(token, key, Math.floor(Date.now() / 1000)) ? demoAdministratorId : null;
});

export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/access");
  return admin;
}
