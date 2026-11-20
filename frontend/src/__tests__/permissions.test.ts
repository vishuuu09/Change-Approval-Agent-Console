import { availableActions } from "../permissions";
import type { Change, User } from "../types";

const base: Change = {
  id: 1, title: "t", description: "d", status: "pending_approval", plan: null,
  created_by: "engineer1", reviewed_by: null, review_comment: null, created_at: "2026-01-01T00:00:00Z",
};
const approver: User = { username: "approver1", role: "approver" };
const engineer: User = { username: "engineer1", role: "engineer" };
const viewer: User = { username: "viewer1", role: "viewer" };

describe("availableActions", () => {
  it("lets an approver review someone else's pending request", () => {
    expect(availableActions(approver, base).canReview).toBe(true);
  });
  it("blocks self-review", () => {
    const own = { ...base, created_by: "approver1" };
    const a = availableActions(approver, own);
    expect(a.canReview).toBe(false);
    expect(a.note).toMatch(/another approver/);
  });
  it("never lets engineers or viewers review", () => {
    expect(availableActions(engineer, base).canReview).toBe(false);
    expect(availableActions(viewer, base).canReview).toBe(false);
  });
  it("only allows execution once approved, and only for engineers", () => {
    expect(availableActions(engineer, base).canExecute).toBe(false);
    const approved = { ...base, status: "approved" as const };
    expect(availableActions(engineer, approved).canExecute).toBe(true);
    expect(availableActions(approver, approved).canExecute).toBe(false);
    expect(availableActions(viewer, approved).canExecute).toBe(false);
  });
  it("offers no actions on rejected or executed requests", () => {
    for (const status of ["rejected", "executed"] as const) {
      const a = availableActions(engineer, { ...base, status });
      expect(a.canReview || a.canExecute).toBe(false);
    }
  });
});
