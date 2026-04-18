import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";

export default async function PortalPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-neutral-900">
        Welcome, {session.user.name ?? session.user.email}
      </h1>
      <p className="mt-2 text-neutral-500">
        Submit and track your service requests below.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/portal/requests/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Submit a request
        </Link>
        <Link
          href="/portal/requests"
          className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          View my requests
        </Link>
      </div>
    </div>
  );
}
