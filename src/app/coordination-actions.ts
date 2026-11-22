"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../lib/admin-session";
import type { WorkspaceRole } from "../lib/coordination";
import { requireCoordinationActor } from "../lib/coordination-session";
import { CoordinationError, markNotificationRead, recordCoordination } from "../lib/coordination-store";
import { actionRateMessage } from "../lib/action-rate-limit";

export async function notificationReadAction(role: WorkspaceRole, key: string) {
  const actor = await requireCoordinationActor(role);
  try {
    markNotificationRead(actor, key);
  } catch (error) {
    if (!(error instanceof CoordinationError)) throw error;
  }
  const base = "/" + role.toLowerCase();
  revalidatePath(base, "layout");
  redirect(base + "/notifications");
}

export async function coordinationAction(reference: string, form: FormData) {
  const admin = await requireAdmin();
  if (actionRateMessage("admin-write:" + admin)) redirect("/admin/transactions/" + encodeURIComponent(reference) + "?notice=rate-limited");
  const kind = form.get("kind");
  const note = form.get("note");
  const target = form.get("targetId");
  const path = "/admin/transactions/" + encodeURIComponent(reference);
  try {
    recordCoordination(admin, reference, {
      kind: typeof kind === "string" ? kind : "",
      note: typeof note === "string" ? note : "",
      targetId: typeof target === "string" && /^\d+$/.test(target) ? Number(target) : undefined,
    });
  } catch (error) {
    if (!(error instanceof CoordinationError)) {
      console.error("Demo coordination update failed", error);
      redirect(path + "?notice=store-error");
    }
    redirect(path + "?notice=unavailable");
  }
  for (const role of ["admin", "buyer", "seller"]) revalidatePath("/" + role, "layout");
  redirect(path);
}
