import type { Change, User } from "./types";

export interface Actions {
  canReview: boolean;
  canExecute: boolean;
  /** Plain-language explanation shown when an action is unavailable. */
  note: string | null;
}

/** Mirrors the server rules. The server is the authority; this only shapes the UI. */
export function availableActions(user: User, change: Change): Actions {
  const awaiting = change.status === "pending_approval";
  const own = change.created_by === user.username;

  const canReview = user.role === "approver" && awaiting && !own;
  const canExecute = user.role === "engineer" && change.status === "approved";

  let note: string | null = null;
  if (awaiting && user.role === "approver" && own) {
    note = "You created this request, so another approver has to review it.";
  } else if (awaiting && user.role !== "approver") {
    note = "Waiting for an approver. Execution stays locked until then.";
  } else if (change.status === "approved" && user.role !== "engineer") {
    note = "Approved. An engineer can now execute it.";
  } else if (change.status === "planning_failed") {
    note = "The agent couldn't draft a plan. Create a new request to try again.";
  }
  return { canReview, canExecute, note };
}
