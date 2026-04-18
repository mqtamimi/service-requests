import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import {
  serviceRequests,
  serviceRequestEvents,
  serviceRequestComments,
  users,
} from "~/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { AdminRequestActions } from "~/components/admin/AdminRequestActions";

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

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/portal");

  const { id } = await params;

  const req = await db.query.serviceRequests.findFirst({
    where: eq(serviceRequests.id, id),
  });
  if (!req) notFound();

  const customer = await db.query.users.findFirst({
    where: eq(users.id, req.customerId),
  });

  const events = await db
    .select({
      id: serviceRequestEvents.id,
      fromStatus: serviceRequestEvents.fromStatus,
      toStatus: serviceRequestEvents.toStatus,
      at: serviceRequestEvents.at,
      actor: { id: users.id, name: users.name, email: users.email },
    })
    .from(serviceRequestEvents)
    .innerJoin(users, eq(serviceRequestEvents.actorId, users.id))
    .where(eq(serviceRequestEvents.requestId, id))
    .orderBy(asc(serviceRequestEvents.at));

  const comments = await db
    .select({
      id: serviceRequestComments.id,
      body: serviceRequestComments.body,
      visibility: serviceRequestComments.visibility,
      createdAt: serviceRequestComments.createdAt,
      author: { id: users.id, name: users.name, email: users.email },
    })
    .from(serviceRequestComments)
    .innerJoin(users, eq(serviceRequestComments.authorId, users.id))
    .where(eq(serviceRequestComments.requestId, id))
    .orderBy(asc(serviceRequestComments.createdAt));

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/admin/requests" className="text-sm text-blue-600 hover:underline">
        ← Queue
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{req.reference}</h1>
          <p className="mt-1 text-sm text-neutral-500 capitalize">
            {req.type.replace(/_/g, " ")} · {req.priority} priority
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[req.status]}`}>
          {req.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Customer */}
      <div className="mt-5 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Customer</h2>
        <p className="mt-1 font-medium">{customer?.name ?? "Unknown"}</p>
        <p className="text-sm text-neutral-500">{customer?.email}</p>
      </div>

      {/* Description */}
      <div className="mt-4 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Description</h2>
        <p className="mt-2 text-sm text-neutral-700 whitespace-pre-wrap">{req.description}</p>
        <p className="mt-3 text-xs text-neutral-400">
          Submitted {formatDate(req.createdAt)} · Updated {formatDate(req.updatedAt)}
        </p>
      </div>

      {/* Status History */}
      {events.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-neutral-700">Status History</h2>
          <ol className="mt-3 space-y-2 border-l border-neutral-200 pl-4">
            {events.map((ev) => (
              <li key={ev.id} className="text-sm">
                <span className="text-xs text-neutral-400">{formatDate(ev.at)}</span>
                <span className="ml-3 text-neutral-600">
                  {ev.fromStatus ? (
                    <>
                      <span className="capitalize">{ev.fromStatus.replace(/_/g, " ")}</span>
                      {" → "}
                      <span className="capitalize font-medium">{ev.toStatus.replace(/_/g, " ")}</span>
                    </>
                  ) : (
                    <span className="capitalize font-medium">Created as {ev.toStatus}</span>
                  )}
                </span>
                <span className="ml-2 text-xs text-neutral-400">by {ev.actor.name}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Comments */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-neutral-700">Thread</h2>
        {comments.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">No comments yet.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {comments.map((c) => (
              <li
                key={c.id}
                className={`rounded-lg border p-3 ${
                  c.visibility === "internal"
                    ? "border-amber-200 bg-amber-50"
                    : "border-neutral-200 bg-neutral-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-600">{c.author.name}</span>
                  {c.visibility === "internal" && (
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Internal
                    </span>
                  )}
                  <span className="ml-auto text-xs text-neutral-400">{formatDate(c.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap">{c.body}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Actions: status change + add comment — client component */}
      <AdminRequestActions requestId={id} currentStatus={req.status} />
    </main>
  );
}
