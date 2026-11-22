"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assistanceHref, assistanceStartHref, type AssistanceRole } from "../lib/assistance";
import { requireAssistanceActor } from "../lib/assistance-session";
import { AssistanceError, startAssistance, updateAssistance } from "../lib/assistance-store";
import { actionRateMessage } from "../lib/action-rate-limit";

function refreshAssistance(reference: string) {
  for (const role of ["Buyer", "Seller"] as const) {
    revalidatePath(assistanceHref(role));
    revalidatePath(assistanceHref(role, reference));
    revalidatePath("/" + role.toLowerCase() + "/notifications");
  }
  revalidatePath("/admin", "layout");
}

export async function startAssistanceAction(listingId: string) {
  const buyer = await requireAssistanceActor("Buyer");
  if (actionRateMessage("assistance:" + buyer.id)) redirect(assistanceStartHref(listingId) + "?notice=rate-limited");
  let reference: string;
  try {
    reference = startAssistance(buyer.id, listingId);
  } catch (error) {
    if (!(error instanceof AssistanceError)) {
      console.error("Demo assistance initiation failed", error);
      redirect(assistanceStartHref(listingId) + "?notice=store-error");
    }
    redirect(assistanceStartHref(listingId) + "?notice=unavailable");
  }
  refreshAssistance(reference);
  redirect(assistanceHref("Buyer", reference));
}

export async function updateAssistanceAction(role: AssistanceRole, reference: string, form: FormData) {
  const actor = await requireAssistanceActor(role);
  if (actionRateMessage("assistance:" + actor.id)) redirect(assistanceHref(role, reference) + "?notice=rate-limited");
  const action = form.get("action");
  const check = form.get("check");
  const mark = form.get("completed");
  const detail = assistanceHref(role, reference);
  try {
    if (typeof action === "string") updateAssistance(actor, reference, { action });
    else if (typeof check === "string" && (mark === "yes" || mark === "no")) {
      updateAssistance(actor, reference, { check, completed: mark === "yes" });
    } else throw new AssistanceError("Invalid assistance update.");
  } catch (error) {
    if (!(error instanceof AssistanceError)) {
      console.error("Demo assistance update failed", error);
      redirect(detail + "?notice=store-error");
    }
    redirect(detail + "?notice=unavailable");
  }
  refreshAssistance(reference);
  redirect(detail);
}
