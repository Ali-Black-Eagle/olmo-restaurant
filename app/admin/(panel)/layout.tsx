import { requireAdmin } from "@/lib/admin-auth";
import { AdminNav, SignOutButton } from "@/components/admin/nav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <div className="md:grid md:grid-cols-[220px_1fr]">
      <aside className="admin-line border-b md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:block md:py-6">
          <p className="font-display text-3xl leading-none">Olmo</p>
          <p className="admin-muted hidden pt-1 text-sm md:block">Staff admin</p>
          <div className="md:hidden">
            <SignOutButton />
          </div>
        </div>
        <AdminNav />
        <div className="hidden px-4 pb-6 pt-10 text-sm md:block">
          <p className="admin-muted break-all">{session.email}</p>
          <div className="mt-2">
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
