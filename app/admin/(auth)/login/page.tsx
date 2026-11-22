import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getAdminSession()) redirect("/admin");
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[460px] content-center px-5 py-12">
      <p className="font-display text-5xl">Olmo</p>
      <h1 className="mt-6 text-[2.2rem]">Staff sign in</h1>
      <p className="mt-3 admin-muted">Enter your work email and we will send you a sign-in link. There is no password.</p>
      <LoginForm />
    </main>
  );
}
