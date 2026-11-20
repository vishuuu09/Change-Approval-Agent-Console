import type { Status } from "../types";

const LABEL: Record<Status, string> = {
  draft: "Draft",
  pending_approval: "Awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
  executed: "Executed",
  planning_failed: "Planning failed",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge-${status}`}>{LABEL[status]}</span>;
}
