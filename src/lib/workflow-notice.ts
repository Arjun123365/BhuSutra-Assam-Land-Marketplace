export function workflowNotice(value: unknown) {
  if (value === "rate-limited") return "Too many demo actions. Wait one minute before trying again.";
  if (value === "store-error") return "The local demo store is temporarily unavailable. Try again. Your existing records are preserved.";
  if (value === "unavailable") return "This action is unavailable for the current record or workflow stage. Review the saved information and try again.";
  return undefined;
}
