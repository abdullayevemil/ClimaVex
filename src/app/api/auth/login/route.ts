import { prisma } from "@/lib/prisma";
import { fail, handle, ok, readJson } from "@/server/http";
import { loginSchema } from "@/server/schemas";
import { createSession, sessionCookieOptions, SESSION_COOKIE, verifyPassword } from "@/server/auth/session";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  return handle("POST /api/auth/login", async () => {
    const body = loginSchema.parse(await readJson(request));
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });

    // Same message and comparable work for both failure modes, so the response
    // does not reveal which addresses are registered.
    const valid = user ? await verifyPassword(body.password, user.passwordHash) : false;
    if (!user || !valid) return fail(401, "Email or password is incorrect.");

    const { token, expiresAt } = await createSession(user.id);
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));

    return ok({
      id: user.id, email: user.email, name: user.name, role: user.role,
      organisation: user.organisation, locale: user.locale, isDemo: user.isDemo,
    });
  });
}
