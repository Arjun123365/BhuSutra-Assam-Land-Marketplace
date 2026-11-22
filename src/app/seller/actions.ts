"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { demoDistricts, findDemoParcel } from "../../lib/demo-marketplace";
import { contactPreferences, demoImage, saleCategories, sellerTypes, type ListingDetails, type SellerActionState } from "../../lib/seller-demo";
import { validAskingPrice } from "../../lib/listing-review";
import { requireSeller, setDemoSeller } from "../../lib/seller-session";
import { registerSeller, resubmitClarification, saveListing, SellerDemoError, withdrawListing } from "../../lib/seller-store";
import { actionRateMessage } from "../../lib/action-rate-limit";

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function taskError(error: unknown): SellerActionState {
  if (error instanceof SellerDemoError) return { error: error.message };
  console.error("Seller demo datastore operation failed", error);
  return { error: "The demo store is temporarily unavailable. Please try again." };
}

export async function registerSellerAction(_: SellerActionState, form: FormData): Promise<SellerActionState> {
  const limited = actionRateMessage("seller-register", 10);
  if (limited) return { error: limited };
  const displayName = text(form, "displayName");
  const mobile = text(form, "mobile");
  const email = text(form, "email");
  const district = demoDistricts.find(value => value === text(form, "district"));
  const sellerType = sellerTypes.find(value => value === text(form, "sellerType"));

  if (displayName.length < 2 || displayName.length > 60) return { error: "Enter a fictional display name of 2–60 characters." };
  if (!/^00000[0-9]{5}$/.test(mobile)) return { error: "Use a test mobile number beginning with 00000 followed by five digits." };
  if (email && (email.length > 100 || !/^[^\s@]+@[^\s@]+\.test$/i.test(email))) return { error: "Use a test email ending in .test, or leave email blank." };
  if (!district || !sellerType) return { error: "Choose a supported district and seller type." };
  if (form.get("processingConsent") !== "on" || form.get("terms") !== "on") return { error: "Both demonstration consent and acceptance of the prototype terms are required." };

  try {
    await setDemoSeller(registerSeller({ displayName, mobile, email, district, sellerType }));
  } catch (error) {
    return taskError(error);
  }
  redirect("/seller/dashboard");
}

export async function saveListingAction(_: SellerActionState, form: FormData): Promise<SellerActionState> {
  const seller = await requireSeller();
  const limited = actionRateMessage("seller-write:" + seller.id);
  if (limited) return { error: limited };
  const intent = text(form, "intent");
  const parcel = findDemoParcel(text(form, "parcelId"));
  if (intent !== "submit" && intent !== "draft") return { error: "Choose Save draft or Submit for demo review." };
  if (!parcel) return { error: "Choose a demonstration parcel before saving." };

  const submit = intent === "submit";
  const details: ListingDetails = {
    askingPrice: text(form, "askingPrice"),
    description: text(form, "description"),
    saleCategory: text(form, "saleCategory"),
    image: text(form, "image"),
    contactPreference: text(form, "contactPreference"),
    declaration: form.get("declaration") === "on",
    consent: form.get("consent") === "on",
    acknowledgePending: form.get("acknowledgePending") === "on",
    acknowledgeRestriction: Boolean(parcel.restriction) && form.get("acknowledgeRestriction") === "on",
  };

  if ((submit || details.askingPrice) && !validAskingPrice(details.askingPrice)) {
    return { error: "Enter a positive asking price up to ₹100 crore, with at most two decimal places." };
  }
  if (details.description.length > 600 || (submit && details.description.length < 10)) return { error: "Use 10–600 characters for the submitted property description." };
  if (details.saleCategory && !saleCategories.some(value => value === details.saleCategory)) return { error: "Choose a supported demo sale category." };
  if (details.image && details.image !== demoImage) return { error: "Only the supplied local demo image can be selected." };
  if (!contactPreferences.some(value => value === details.contactPreference)) return { error: "Choose a demo contact preference." };
  if (details.contactPreference === "Demo email" && !seller.email) return { error: "Choose another contact preference. Your demo profile has no test email." };
  if (submit && (!details.declaration || !details.consent || !details.acknowledgePending)) return { error: "Confirm the seller declaration, voluntary consent and pending verification before submitting." };
  if (submit && parcel.restriction && !details.acknowledgeRestriction) return { error: "Acknowledge that the demonstration restriction requires review before submitting." };

  try {
    saveListing({ sellerId: seller.id, draftId: text(form, "draftId"), parcelId: parcel.id, submit, details });
  } catch (error) {
    return taskError(error);
  }
  revalidatePath("/seller/dashboard");
  redirect("/seller/dashboard?notice=" + (submit ? "submitted" : "draft"));
}

export async function withdrawListingAction(_: SellerActionState, form: FormData): Promise<SellerActionState> {
  const seller = await requireSeller();
  const limited = actionRateMessage("seller-write:" + seller.id);
  if (limited) return { error: limited };
  try {
    withdrawListing(seller.id, text(form, "listingId"));
  } catch (error) {
    return taskError(error);
  }
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/explore/parcels/[parcelId]", "page");
  revalidatePath("/seller/dashboard");
  redirect("/seller/dashboard?notice=withdrawn");
}

export async function resubmitClarificationAction(_: SellerActionState, form: FormData): Promise<SellerActionState> {
  const seller = await requireSeller();
  const limited = actionRateMessage("seller-write:" + seller.id);
  if (limited) return { error: limited };
  try {
    resubmitClarification(seller.id, text(form, "listingId"), text(form, "response"));
  } catch (error) {
    return taskError(error);
  }
  revalidatePath("/seller/dashboard");
  revalidatePath("/admin", "layout");
  redirect("/seller/dashboard?notice=resubmitted");
}
