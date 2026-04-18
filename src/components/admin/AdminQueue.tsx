"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

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

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type StatusFilter = "" | "submitted" | "in_progress" | "resolved" | "rejected" | "closed";
type PriorityFilter = "" | "low" | "medium" | "high";
type SortDir = "asc" | "desc";

export function AdminQueue(): React.ReactElement {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("");
  const [sort, setSort] = useState<SortDir>("desc");

  const { data, isLoading, error } = api.serviceRequests.listAll.useQuery({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    sort,
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          aria-label="Filter by priority"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortDir)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          aria-label="Sort order"
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-4">
        {isLoading && (
          <div className="py-12 text-center text-sm text-neutral-400">Loading requests…</div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Failed to load requests: {error.message}
          </div>
        )}

        {data && data.length === 0 && (
          <div className="mt-8 rounded-lg border border-dashed border-neutral-300 p-10 text-center">
            <p className="text-neutral-500">No requests match the current filters.</p>
          </div>
        )}

        {data && data.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.map((req) => (
                  <tr key={req.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/requests/${req.id}`}
                        className="font-mono text-blue-600 hover:underline"
                      >
                        {req.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{req.customer.name}</div>
                      <div className="text-xs text-neutral-400">{req.customer.email}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{req.type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_COLORS[req.priority]}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[req.status]}`}>
                        {req.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{formatDate(req.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
