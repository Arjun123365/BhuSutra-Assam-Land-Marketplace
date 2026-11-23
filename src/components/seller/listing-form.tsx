"use client";
import { saveListingAction } from "../../app/seller/actions";
import { ListingForm as View } from "./listing-form-view";
export function ListingForm(props: Omit<Parameters<typeof View>[0], "submit">) { return <View {...props} submit={saveListingAction} />; }
