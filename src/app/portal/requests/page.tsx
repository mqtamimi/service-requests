import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { serviceRequests } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  closed: "bg-neutral-100 text-neutral-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-neutral-100 text-neutral-600",
  medium: "bg-orange-100 text-orange-700",
  high: "bg-red-100 text-red-700",
};

export default async function MyRequestsPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const requests = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.customerId, session.user.id))
    .orderBy(desc(serviceRequests.createdAt));

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/portal" className="text-sm text-blue-600 hover:underline">
            ← Portal
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">My Requests</h1>
        </div>
        <Link
          href="/portal/requests/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Request
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed border-neutral-300 p-10 text-center">
          <p className="text-neutral-500">You have no service requests yet.</p>
          <Link
            href="/portal/requests/new"
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            Submit your first request →
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/portal/requests/${req.id}`}
                      className="font-mono text-blue-600 hover:underline"
                    >
                      {req.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {req.type.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_COLORS[req.priority]}`}
                    >
                      {req.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[req.status]}`}
                    >
                      {req.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {formatDate(req.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
