import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("../api", () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, login: vi.fn(), me: vi.fn() };
});

import * as api from "../api";
import { Login } from "../components/Login";

describe("Login", () => {
  it("shows the server's error message when sign-in fails", async () => {
    vi.mocked(api.login).mockRejectedValueOnce(new api.ApiError(401, "Incorrect username or password"));
    render(<Login onSignedIn={() => {}} />);
    await userEvent.type(screen.getByLabelText("Username"), "engineer1");
    await userEvent.type(screen.getByLabelText("Password"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect username or password");
  });

  it("passes the signed-in user up on success", async () => {
    const user = { username: "approver1", role: "approver" as const };
    vi.mocked(api.login).mockResolvedValueOnce(undefined);
    vi.mocked(api.me).mockResolvedValueOnce(user);
    const onSignedIn = vi.fn();
    render(<Login onSignedIn={onSignedIn} />);
    await userEvent.type(screen.getByLabelText("Username"), "approver1");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await vi.waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(user));
  });
});
