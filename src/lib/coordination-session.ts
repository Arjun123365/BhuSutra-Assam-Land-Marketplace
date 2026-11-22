import "server-only";

import { currentAdmin, requireAdmin } from "./admin-session";
import { assistanceActor, requireAssistanceActor } from "./assistance-session";
import type { WorkspaceActor, WorkspaceRole } from "./coordination";

export async function currentCoordinationActor(role: WorkspaceRole): Promise<WorkspaceActor | undefined> {
  if (role !== "Admin") return assistanceActor(role);
  const id = await currentAdmin();
  return id ? { kind: role, id } : undefined;
}

export async function requireCoordinationActor(role: WorkspaceRole): Promise<WorkspaceActor> {
  if (role === "Admin") return { kind: role, id: await requireAdmin() };
  return requireAssistanceActor(role);
}
