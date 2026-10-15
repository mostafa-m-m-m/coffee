import { Suspense } from "react";
import { getLocale } from "next-intl/server";
import { signOut } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { pinLocale } from "@/i18n/server";
import { AdminShell } from "@/components/admin/admin-shell";

async function logout() {
  "use server";
  await signOut({ redirectTo: `/${await getLocale()}/login` });
}

// Layer 3 of 3 (after the proxy and the API checks): re-verify the role on the server.
async function AdminGate({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "VIEWER") {
    const locale = await getLocale();
    return redirect({
      href: { pathname: "/login", query: { callbackUrl: `/${locale}/admin` } },
      locale,
    });
  }
  return (
    <AdminShell name={session!.user.name ?? ""} role={role} logout={logout}>
      {children}
    </AdminShell>
  );
}

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  await pinLocale(params);
  return (
    <Suspense fallback={<div className="min-h-screen animate-pulse bg-border" aria-busy="true" />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
