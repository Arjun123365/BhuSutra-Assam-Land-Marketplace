"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buyerTypes, interestHref } from "../../lib/buyer-demo";
import { requireBuyer, setDemoBuyer } from "../../lib/buyer-session";
import { BuyerDemoError, changeEnquiry, registerBuyer, submitEnquiry } from "../../lib/buyer-store";
import { demoDistricts, findDemoParcel } from "../../lib/demo-marketplace";
import { requireSeller } from "../../lib/seller-session";
import { getApprovedListings } from "../../lib/seller-store";
import { verificationHref } from "../../lib/verification-model";
import { actionRateMessage } from "../../lib/action-rate-limit";

type ActionState = { error?: string; success?: string };

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function actionError(error: unknown): ActionState {
  if (error instanceof BuyerDemoError) return { error: error.message };
  console.error("Demo buyer operation failed", error);
  return { error: "The local demonstration store is temporarily unavailable." };
}

function refreshEnquiries() {
  revalidatePath("/buyer/dashboard");
  revalidatePath("/seller/dashboard");
}

export async function registerBuyerAction(_: ActionState, form: FormData): Promise<ActionState> {
  const limited = actionRateMessage("buyer-register", 10);
  if (limited) return { error: limited };
  const displayName = text(form, "displayName");
  const mobile = text(form, "mobile");
  const email = text(form, "email");
  const district = demoDistricts.find(value => value === text(form, "district"));
  const buyerType = buyerTypes.find(value => value === text(form, "buyerType"));

  if (displayName.length < 2 || displayName.length > 60) return { error: "Enter a fictional display name of 2–60 characters." };
  if (!/^00000[0-9]{5}$/.test(mobile)) return { error: "Use a fictional test number beginning with 00000 followed by five digits." };
  if (email && (email.length > 100 || !/^[^\s@]+@[^\s@]+\.test$/i.test(email))) return { error: "Enter a fictional .test email or leave this field empty." };
  if (!district || !buyerType) return { error: "Select a supported district and buyer type." };
  if (form.get("consent") !== "on") return { error: "Demonstration consent is required." };

  const listingId = text(form, "listingId");
  const verificationParcel = findDemoParcel(text(form, "parcelId"));
  let destination = "/buyer/dashboard";
  try {
    if (listingId && getApprovedListings(listingId).length) destination = interestHref(listingId);
    else if (verificationParcel) destination = verificationHref(verificationParcel.id);
    await setDemoBuyer(registerBuyer({ displayName, mobile, email, district, buyerType }));
  } catch (error) {
    return actionError(error);
  }
  redirect(destination);
}

export async function continueBuyerVerificationAction(form: FormData) {
  const buyer = await requireBuyer();
  const parcel = findDemoParcel(text(form, "parcelId"));
  if (!parcel) redirect("/verify-records");
  await setDemoBuyer(buyer.id);
  redirect(verificationHref(parcel.id));
}

export async function submitEnquiryAction(_: ActionState, form: FormData): Promise<ActionState> {
  const buyer = await requireBuyer();
  const limited = actionRateMessage("buyer-message:" + buyer.id, 30);
  if (limited) return { error: limited };
  try {
    submitEnquiry(buyer.id, text(form, "listingId"), text(form, "message"));
  } catch (error) {
    return actionError(error);
  }
  refreshEnquiries();
  revalidatePath("/");
  redirect("/buyer/dashboard?notice=submitted");
}

export async function closeBuyerEnquiryAction(_: ActionState, form: FormData): Promise<ActionState> {
  const buyer = await requireBuyer();
  const limited = actionRateMessage("buyer-message:" + buyer.id, 30);
  if (limited) return { error: limited };
  try {
    changeEnquiry({ kind: "Buyer", id: buyer.id }, text(form, "enquiryId"), "Closed");
  } catch (error) {
    return actionError(error);
  }
  refreshEnquiries();
  return { success: "Enquiry closed." };
}

export async function sellerEnquiryAction(_: ActionState, form: FormData): Promise<ActionState> {
  const seller = await requireSeller();
  const limited = actionRateMessage("seller-message:" + seller.id, 30);
  if (limited) return { error: limited };
  const next = text(form, "next");
  if (next !== "Viewed" && next !== "Responded" && next !== "Closed") return { error: "Choose an available enquiry action." };
  try {
    changeEnquiry({ kind: "Seller", id: seller.id }, text(form, "enquiryId"), next, text(form, "response"));
  } catch (error) {
    return actionError(error);
  }
  refreshEnquiries();
  return { success: "Enquiry updated." };
}
