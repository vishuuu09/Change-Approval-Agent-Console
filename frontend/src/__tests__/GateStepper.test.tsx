import { render, screen } from "@testing-library/react";
import { GateStepper } from "../components/GateStepper";

describe("GateStepper", () => {
  it("marks the current step and says execution is locked while awaiting approval", () => {
    render(<GateStepper status="pending_approval" />);
    expect(screen.getByText("Awaiting approval").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("status")).toHaveTextContent("Execution is locked until an approver signs off.");
  });
  it("says execution is unlocked once approved", () => {
    render(<GateStepper status="approved" />);
    expect(screen.getByRole("status")).toHaveTextContent("Execution is unlocked");
  });
  it("explains a rejection", () => {
    render(<GateStepper status="rejected" />);
    expect(screen.getByRole("status")).toHaveTextContent("can't be executed");
  });
});
