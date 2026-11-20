import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { Change } from "../types";

vi.mock("../api", () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, getChange: vi.fn(), getAudit: vi.fn(), approve: vi.fn(), reject: vi.fn(), execute: vi.fn() };
});

import * as api from "../api";
import { ChangeDetail } from "../components/ChangeDetail";

const change: Change = {
  id: 7, title: "Resize cache cluster", description: "Scale from 3 to 5 nodes.", status: "pending_approval",
  plan: { summary: "Plan", steps: [{ order: 1, action: "Snapshot state", risk: "low" }] },
  created_by: "engineer1", reviewed_by: null, review_comment: null, created_at: "2026-01-01T00:00:00Z",
};

function setup(status: Change["status"]) {
  vi.mocked(api.getChange).mockResolvedValue({ ...change, status });
  vi.mocked(api.getAudit).mockResolvedValue([{ actor: "engineer1", action: "created", detail: "", ts: "2026-01-01T00:00:00Z" }]);
}

describe("ChangeDetail", () => {
  it("shows Approve and Reject to an approver on a pending request", async () => {
    setup("pending_approval");
    render(<ChangeDetail changeId={7} user={{ username: "approver1", role: "approver" }} onChanged={() => {}} />);
    expect(await screen.findByRole("button", { name: "Approve" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Execute change" })).not.toBeInTheDocument();
  });

  it("hides review buttons from an engineer and keeps execution locked", async () => {
    setup("pending_approval");
    render(<ChangeDetail changeId={7} user={{ username: "engineer1", role: "engineer" }} onChanged={() => {}} />);
    await screen.findByText("Resize cache cluster");
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Execute change" })).not.toBeInTheDocument();
  });

  it("shows Execute only to an engineer once approved", async () => {
    setup("approved");
    render(<ChangeDetail changeId={7} user={{ username: "engineer1", role: "engineer" }} onChanged={() => {}} />);
    expect(await screen.findByRole("button", { name: "Execute change" })).toBeEnabled();
  });

  it("renders the audit trail", async () => {
    setup("pending_approval");
    render(<ChangeDetail changeId={7} user={{ username: "viewer1", role: "viewer" }} onChanged={() => {}} />);
    expect(await screen.findByText("created")).toBeInTheDocument();
  });
});
