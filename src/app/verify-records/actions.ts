"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentBuyer } from "../../lib/buyer-session";
import { parcelRecordHref } from "../../lib/demo-marketplace";
import { DueDiligenceError, saveBuyerCheck } from "../../lib/due-diligence-store";
import { verificationHref } from "../../lib/verification-model";
import { actionRateMessage } from "../../lib/action-rate-limit";

type ActionState = { error?: string };

export async function saveBuyerCheckAction(parcelId: string, checkId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const buyer = await currentBuyer();
  if (!buyer) return { error: "Continue with your demo buyer profile to save progress." };
  const limited = actionRateMessage("buyer-check:" + buyer.id);
  if (limited) return { error: limited };
  const status = form.get("status");
  if (typeof status !== "string") return { error: "Choose a buyer checklist status." };
  try {
    saveBuyerCheck(buyer.id, parcelId, checkId, status);
  } catch (error) {
    if (error instanceof DueDiligenceError) return { error: error.message };
    console.error("Buyer checklist update failed", error);
    return { error: "Could not save progress in the local demo database. Try again." };
  }
  revalidatePath("/verify-records");
  revalidatePath(parcelRecordHref(parcelId));
  redirect(verificationHref(parcelId));
}
