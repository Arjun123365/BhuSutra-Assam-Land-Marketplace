import "server-only";

import type { AssistanceRole } from "./assistance";
import { currentBuyer, requireBuyer } from "./buyer-session";
import { currentSeller, requireSeller } from "./seller-session";
import { redirect } from "next/navigation";

export async function assistanceActor(kind: AssistanceRole) {
  if (kind !== "Buyer" && kind !== "Seller") return undefined;
  const profile = kind === "Buyer" ? await currentBuyer() : await currentSeller();
  return profile && { kind, id: profile.id };
}

export async function requireAssistanceActor(kind: AssistanceRole) {
  if (kind !== "Buyer" && kind !== "Seller") redirect("/");
  const profile = kind === "Buyer" ? await requireBuyer() : await requireSeller();
  return { kind, id: profile.id };
}
