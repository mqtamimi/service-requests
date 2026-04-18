import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function AdminPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="mt-2 text-red-600">You are not authorized to view this page.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">Admin</h1>
      <p className="mt-2 text-neutral-600">Signed in as {session.user.email}.</p>
      <p className="mt-6 rounded-md border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
        Build the admin triage queue and detail view here. See <code>README.md</code>.
      </p>
    </main>
  );
}
