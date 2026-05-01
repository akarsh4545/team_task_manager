const base = import.meta.env.VITE_API_URL || "";

export type UserPublic = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  capabilities?: {
    canCreateProjects: boolean;
    canJoinTeamsWhenInvited: boolean;
  };
};

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: unknown };
    if (typeof j.error === "string") return j.error;
    return res.statusText || "Request failed";
  } catch {
    return res.statusText || "Request failed";
  }
}

export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  const token = localStorage.getItem("token");
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: string | undefined;
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    body: body ?? init?.body,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}
