import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "~/server/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/portal");

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-neutral-800">Admin</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="text-neutral-600 hover:text-neutral-900">
              Dashboard
            </Link>
            <Link href="/admin/requests" className="text-neutral-600 hover:text-neutral-900">
              Queue
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          <span>{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-neutral-500 hover:text-neutral-800 underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div>{children}</div>
    </div>
  );
}
