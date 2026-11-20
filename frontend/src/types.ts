export type Role = "viewer" | "engineer" | "approver";

export type Status =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "executed"
  | "planning_failed";

export interface User {
  username: string;
  role: Role;
}

export interface PlanStep {
  order: number;
  action: string;
  risk: "low" | "medium" | "high";
}

export interface Plan {
  summary: string;
  steps: PlanStep[];
}

export interface Change {
  id: number;
  title: string;
  description: string;
  status: Status;
  plan: Plan | null;
  created_by: string;
  reviewed_by: string | null;
  review_comment: string | null;
  created_at: string;
}

export interface AuditEntry {
  actor: string;
  action: string;
  detail: string;
  ts: string;
}
