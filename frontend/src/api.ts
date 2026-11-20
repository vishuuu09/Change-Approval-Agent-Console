import type { AuditEntry, Change, User } from "./types";

const BASE = "/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let token: string | null = sessionStorage.getItem("token");

export function setToken(value: string | null): void {
  token = value;
  if (value) sessionStorage.setItem("token", value);
  else sessionStorage.removeItem("token");
}

export function hasToken(): boolean {
  return token !== null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(BASE + path, { ...init, headers });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check that the API is running, then try again.");
  }

  if (!res.ok) {
    let detail = res.statusText || "Request failed";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg: string }) => d.msg).join("; ");
    } catch {
      /* body was not JSON */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function login(username: string, password: string): Promise<void> {
  const data = await request<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: new URLSearchParams({ username, password }),
  });
  setToken(data.access_token);
}

export const me = () => request<User>("/auth/me");

export const listChanges = (status?: string) =>
  request<Change[]>(`/changes${status ? `?status_filter=${encodeURIComponent(status)}` : ""}`);

export const getChange = (id: number) => request<Change>(`/changes/${id}`);
export const getAudit = (id: number) => request<AuditEntry[]>(`/changes/${id}/audit`);

export const createChange = (title: string, description: string) =>
  request<Change>("/changes", json({ title, description }));

export const approve = (id: number, comment: string) =>
  request<Change>(`/changes/${id}/approve`, json({ comment }));

export const reject = (id: number, comment: string) =>
  request<Change>(`/changes/${id}/reject`, json({ comment }));

export const execute = (id: number) =>
  request<Change>(`/changes/${id}/execute`, { method: "POST" });
