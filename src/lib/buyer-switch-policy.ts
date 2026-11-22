export function buyerSwitchKey(environment = process.env) {
  const key = environment.BHUSUTRA_DEMO_BUYER_SWITCH_KEY;
  // Next folds this direct check into production bundles, so a runtime
  // NODE_ENV override cannot enable switching in a production build.
  return process.env.NODE_ENV !== "production" && environment.NODE_ENV === "development" && environment.BHUSUTRA_DEMO_BUYER_SWITCH === "1" && key && key.length >= 20 && key.length <= 512
    ? key
    : undefined;
}

export type DemoBuyerSwitchProfile = {
  id: string;
  displayName: string;
  enquiryCount: number;
  assistanceCount: number;
};

export type BuyerSwitchActionState = { error?: string };
