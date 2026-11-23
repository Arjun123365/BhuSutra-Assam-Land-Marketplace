"use client";
import { closeBuyerEnquiryAction,registerBuyerAction,sellerEnquiryAction,submitEnquiryAction } from "../../app/buyer/actions";
import * as View from "./buyer-forms-view";
export function BuyerRegistrationForm(props: Omit<Parameters<typeof View.BuyerRegistrationForm>[0], "submit">) { return <View.BuyerRegistrationForm {...props} submit={registerBuyerAction} />; }
export function ExpressInterestForm(props: Omit<Parameters<typeof View.ExpressInterestForm>[0], "submit">) { return <View.ExpressInterestForm {...props} submit={submitEnquiryAction} />; }
export function EnquiryActionForm(props: Omit<Parameters<typeof View.EnquiryActionForm>[0], "submit">) { return <View.EnquiryActionForm {...props} submit={props.mode === "buyer-close" ? closeBuyerEnquiryAction : sellerEnquiryAction} />; }
