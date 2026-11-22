"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentAdmin, lockAdmin, unlockAdmin } from "../../lib/admin-session";
import { decisionStatuses } from "../../lib/listing-review";
import type { SellerActionState } from "../../lib/seller-demo";
import { recordAdminDecision, SellerDemoError } from "../../lib/seller-store";
import { actionRateMessage } from "../../lib/action-rate-limit";

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export async function unlockAdminAction(_: SellerActionState, form: FormData): Promise<SellerActionState> {
  const limited = actionRateMessage("admin-unlock", 10);
  if (limited) return { error: limited };
  const key = field(form, "key");
  if (!key || key.length > 512 || !(await unlockAdmin(key))) {
    return { error: "The local administrator key was not accepted, or demo administrator access is disabled." };
  }
  redirect("/admin/dashboard");
}

export async function lockAdminAction() {
  await lockAdmin();
  redirect("/admin/access");
}

export async function decideListingAction(_: SellerActionState, form: FormData): Promise<SellerActionState> {
  const administratorId = await currentAdmin();
  if (!administratorId) return { error: "Unlock the local demo administrator workspace before recording a decision." };
  const limited = actionRateMessage("admin-write:" + administratorId);
  if (limited) return { error: limited };

  const id = field(form, "listingId");
  const decision = decisionStatuses.find(status => status === field(form, "decision"));
  if (!id || !decision) return { error: "Choose a valid listing and decision." };
  try {
    recordAdminDecision({
      id, decision, administratorId, remarks: field(form, "remarks"),
      acknowledgeRestriction: form.get("acknowledgeRestriction") === "on",
      restrictionRemarks: field(form, "restrictionRemarks"),
    });
  } catch (error) {
    if (error instanceof SellerDemoError) return { error: error.message };
    console.error("Demo administrator decision failed", error);
    return { error: "The decision could not be saved. Try again." };
  }
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/explore/parcels/[parcelId]", "page");
  revalidatePath("/seller/dashboard");
  revalidatePath("/admin", "layout");
  redirect("/admin/listings/" + encodeURIComponent(id) + "?saved=1");
}
