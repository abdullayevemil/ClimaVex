import { TwinWorkspace } from "@/components/twin/twin-workspace";
import { SignIn } from "@/components/twin/sign-in";
import { getSessionUser } from "@/server/auth/session";

/**
 * The application opens directly onto the interactive digital twin map — no
 * onboarding flow, no splash. Unauthenticated visitors get the sign-in screen
 * because every farm read is authorised server-side.
 */
export default async function Home() {
  const user = await getSessionUser();
  if (!user) return <SignIn />;
  return <TwinWorkspace user={{ ...user, locale: String(user.locale) }} />;
}
