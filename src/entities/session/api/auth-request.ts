import type { Session, SessionUser } from "../model/session";

async function request(api: string, path: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(api.replace(/\/$/, "") + "/auth/" + path, {
    ...options,
    credentials: "include",
    cache: "no-store",
    signal: options.signal ?? AbortSignal.timeout(90000),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "microfronts",
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof body?.message === "string" ? body.message : `API: HTTP ${response.status}`,
    );
  return body;
}

function isUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    typeof user.email === "string" &&
    typeof user.name === "string" &&
    (user.role === "USER" || user.role === "ADMIN")
  );
}

export async function getSession(api: string, signal?: AbortSignal): Promise<Session> {
  const body = await request(api, "me", { signal });
  if (
    !body ||
    typeof body !== "object" ||
    !("user" in body) ||
    (body.user !== null && !isUser(body.user))
  ) {
    throw new Error("Некорректный ответ сервера о сессии");
  }
  return { user: body.user };
}

export async function authenticate(
  api: string,
  mode: "login" | "register",
  fields: { email: string; password: string; name?: string },
  guestKey: string,
): Promise<Session> {
  await request(api, mode, {
    method: "POST",
    headers: { "X-Cart-Key": guestKey },
    body: JSON.stringify({
      email: fields.email,
      password: fields.password,
      ...(mode === "register" ? { name: fields.name } : {}),
    }),
  });
  // Login/register set an HttpOnly cookie; only /me returns the current user.
  const session = await getSession(api);
  if (!session.user)
    throw new Error("Не удалось подтвердить вход. Проверьте настройки cookie и API.");
  return session;
}

export async function logout(api: string): Promise<void> {
  await request(api, "logout", { method: "POST" });
}
