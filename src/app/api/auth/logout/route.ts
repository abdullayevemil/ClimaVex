import { cookies } from "next/headers";
import { handle, ok } from "@/server/http";
import { destroySession, SESSION_COOKIE } from "@/server/auth/session";

export async function POST() {
  return handle("POST /api/auth/logout", async () => {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) await destroySession(token);
    store.delete(SESSION_COOKIE);
    return ok({ ok: true });
  });
}
