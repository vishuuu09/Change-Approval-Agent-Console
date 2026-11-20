import type { Status } from "../types";

const STEPS = ["Plan drafted", "Awaiting approval", "Approved", "Executed"];

function currentIndex(status: Status): number {
  switch (status) {
    case "pending_approval":
      return 1;
    case "approved":
      return 2;
    case "executed":
      return 3;
    default:
      return 0;
  }
}

export function GateStepper({ status }: { status: Status }) {
  const stopped = status === "rejected" || status === "planning_failed";
  const current = currentIndex(status);
  const locked = !stopped && current < 2;

  return (
    <div className="gate">
      <ol className="stepper" aria-label="Approval progress">
        {STEPS.map((label, i) => {
          const state = stopped ? (i === 0 && status === "rejected" ? "done" : "todo") : i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li key={label} className={`step step-${state}`} aria-current={state === "current" ? "step" : undefined}>
              <span className="step-dot" aria-hidden="true">{i + 1}</span>
              <span className="step-label">{label}</span>
            </li>
          );
        })}
      </ol>
      <p className={`gate-note ${locked || stopped ? "gate-locked" : "gate-open"}`} role="status">
        {status === "rejected" && "Rejected. This request can't be executed."}
        {status === "planning_failed" && "No plan was drafted, so there is nothing to approve or execute."}
        {locked && "Execution is locked until an approver signs off."}
        {status === "approved" && "Approved. Execution is unlocked."}
        {status === "executed" && "Executed. Every step is recorded in the audit trail."}
      </p>
    </div>
  );
}
