import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import {
  serviceRequests,
  serviceRequestEvents,
  serviceRequestComments,
} from "~/server/db/schema";
import { and, eq, asc } from "drizzle-orm";

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

export default async function CustomerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const req = await db.query.serviceRequests.findFirst({
    where: and(
      eq(serviceRequests.id, id),
      eq(serviceRequests.customerId, session.user.id),
    ),
  });

  if (!req) notFound();

  const events = await db
    .select()
    .from(serviceRequestEvents)
    .where(eq(serviceRequestEvents.requestId, id))
    .orderBy(asc(serviceRequestEvents.at));

  // Field-level security: only public comments
  const comments = await db
    .select()
    .from(serviceRequestComments)
    .where(
      and(
        eq(serviceRequestComments.requestId, id),
        eq(serviceRequestComments.visibility, "public"),
      ),
    )
    .orderBy(asc(serviceRequestComments.createdAt));

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/portal/requests" className="text-sm text-blue-600 hover:underline">
        ← My Requests
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{req.reference}</h1>
          <p className="mt-1 text-sm text-neutral-500 capitalize">
            {req.type.replace("_", " ")} · {req.priority} priority
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[req.status]}`}
        >
          {req.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-700">Description</h2>
        <p className="mt-2 text-sm text-neutral-600 whitespace-pre-wrap">{req.description}</p>
        <p className="mt-3 text-xs text-neutral-400">Submitted {formatDate(req.createdAt)}</p>
      </div>

      {events.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-neutral-700">Status History</h2>
          <ol className="mt-3 space-y-2">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-center gap-3 text-sm">
                <span className="text-neutral-400 text-xs">{formatDate(ev.at)}</span>
                {ev.fromStatus ? (
                  <span className="text-neutral-600">
                    <span className="capitalize">{ev.fromStatus.replace("_", " ")}</span>
                    {" → "}
                    <span className="capitalize font-medium">{ev.toStatus.replace("_", " ")}</span>
                  </span>
                ) : (
                  <span className="capitalize font-medium text-neutral-600">
                    Created as {ev.toStatus}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-neutral-700">Comments from Support</h2>
        {comments.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">No comments yet.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg bg-neutral-50 border border-neutral-200 p-3">
                <p className="text-sm text-neutral-700 whitespace-pre-wrap">{c.body}</p>
                <p className="mt-1 text-xs text-neutral-400">{formatDate(c.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
