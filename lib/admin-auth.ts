import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, isAdminEmail } from "@/lib/auth";
import { hasDatabase } from "@/lib/db";

export type AdminSession = { email: string; name: string };

/** The one place that decides who is staff. Called by every admin page AND every admin action. */
export async function getAdminSession(): Promise<AdminSession | null> {
  if (!hasDatabase) return null;
  try {
    const session = await getAuth().api.getSession({ headers: await headers() });
    if (!session?.user || !isAdminEmail(session.user.email)) return null;
    return { email: session.user.email, name: session.user.name };
  } catch {
    return null;
  }
}

/** For pages: redirect to the login page when not signed in as staff. */
export async function requireAdmin(): Promise<AdminSession> {
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");
  return s;
}

/** For server actions: throw, never redirect. The proxy is only a convenience, this is the gate. */
export async function assertAdmin(): Promise<AdminSession> {
  const s = await getAdminSession();
  if (!s) throw new Error("Not authorised");
  return s;
}
