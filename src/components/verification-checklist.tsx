"use client";
import { saveBuyerCheckAction } from "../app/verify-records/actions";
import { BuyerCheckForm as View } from "./verification-checklist-view";
export function BuyerCheckForm(props: Omit<Parameters<typeof View>[0], "submit">) { return <View {...props} submit={saveBuyerCheckAction.bind(null,props.parcelId,props.checkId)} />; }
