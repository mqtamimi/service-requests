"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

const REQUEST_TYPES = [
  { value: "outage", label: "Outage" },
  { value: "billing", label: "Billing" },
  { value: "start_service", label: "Start Service" },
  { value: "stop_service", label: "Stop Service" },
  { value: "other", label: "Other" },
] as const;

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export function NewRequestForm(): React.ReactElement {
  const router = useRouter();
  const [type, setType] = useState<(typeof REQUEST_TYPES)[number]["value"]>("other");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]["value"]>("medium");
  const [description, setDescription] = useState("");

  const create = api.serviceRequests.create.useMutation({
    onSuccess: (req) => {
      router.push(`/portal/requests/${req.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({ type, priority, description });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-neutral-700">
          Request Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {REQUEST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-neutral-700">
          Priority
        </label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as typeof priority)}
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-neutral-700">
          Description
          <span className="ml-1 text-xs font-normal text-neutral-400">(10–2000 characters)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          minLength={10}
          maxLength={2000}
          required
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Please describe your issue in detail..."
        />
        <p className="mt-1 text-right text-xs text-neutral-400">
          {description.length} / 2000
        </p>
      </div>

      {create.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {create.error.message}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={create.isPending || description.length < 10}
          className="flex-1"
        >
          {create.isPending ? "Submitting..." : "Submit Request"}
        </Button>
        <Link
          href="/portal/requests"
          className="flex items-center justify-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
