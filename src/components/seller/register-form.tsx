"use client";
import { registerSellerAction } from "../../app/seller/actions";
import { RegisterForm as View } from "./register-form-view";
export function RegisterForm(props: Omit<Parameters<typeof View>[0], "submit">) { return <View {...props} submit={registerSellerAction} />; }
