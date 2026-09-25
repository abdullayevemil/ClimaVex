import { handle, ok } from "@/server/http";
import { getSessionUser } from "@/server/auth/session";

export async function GET() {
  return handle("GET /api/auth/me", async () => ok({ user: await getSessionUser() }));
}
