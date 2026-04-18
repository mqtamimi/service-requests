import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";
import { AdminQueue } from "~/components/admin/AdminQueue";

export default async function AdminQueuePage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/portal");

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-blue-600 hover:underline">
            ← Admin
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Service Request Queue</h1>
        </div>
      </div>
      <div className="mt-6">
        <AdminQueue />
      </div>
    </main>
  );
}
