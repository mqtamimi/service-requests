"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  allowedTransitionsFrom,
  STATUS_LABELS,
  type RequestStatus,
} from "~/lib/transitions";

interface Props {
  requestId: string;
  currentStatus: RequestStatus;
}

export function AdminRequestActions({ requestId, currentStatus }: Props): React.ReactElement {
  const router = useRouter();
  const [commentBody, setCommentBody] = useState("");
  const [visibility, setVisibility] = useState<"public" | "internal">("public");

  // Derived from the shared canTransition rules — no duplicate map
  const allowedNext = allowedTransitionsFrom(currentStatus);

  const updateStatus = api.serviceRequests.updateStatus.useMutation({
    onSuccess: () => router.refresh(),
  });

  const addComment = api.serviceRequests.addComment.useMutation({
    onSuccess: () => {
      setCommentBody("");
      router.refresh();
    },
  });

  return (
    <div className="mt-8 space-y-6 border-t border-neutral-200 pt-6">
      {/* Status Transition */}
      {allowedNext.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-700">Change Status</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {allowedNext.map((toStatus) => (
              <Button
                key={toStatus}
                onClick={() => updateStatus.mutate({ id: requestId, toStatus })}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? "Updating…" : `Mark as ${STATUS_LABELS[toStatus]}`}
              </Button>
            ))}
          </div>
          {updateStatus.error && (
            <p className="mt-2 text-sm text-red-600">{updateStatus.error.message}</p>
          )}
        </div>
      )}

      {allowedNext.length === 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-700">Status</h2>
          <p className="mt-2 text-sm text-neutral-400">
            This request is <span className="font-medium capitalize">{currentStatus.replace(/_/g, " ")}</span> — no further transitions available.
          </p>
        </div>
      )}

      {/* Add Comment */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-700">Add Comment</h2>
        <div className="mt-3 space-y-3">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === "public"}
                onChange={() => setVisibility("public")}
                className="accent-blue-600"
              />
              <span>Public <span className="text-neutral-400">(visible to customer)</span></span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="internal"
                checked={visibility === "internal"}
                onChange={() => setVisibility("internal")}
                className="accent-amber-500"
              />
              <span>Internal <span className="text-neutral-400">(admins only)</span></span>
            </label>
          </div>
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            rows={4}
            placeholder={visibility === "internal" ? "Internal note…" : "Reply to customer…"}
            className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
              visibility === "internal"
                ? "border-amber-300 bg-amber-50 focus:border-amber-400 focus:ring-amber-400"
                : "border-neutral-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
          />
          {addComment.error && (
            <p className="text-sm text-red-600">{addComment.error.message}</p>
          )}
          <Button
            onClick={() => addComment.mutate({ requestId, body: commentBody, visibility })}
            disabled={addComment.isPending || commentBody.trim().length === 0}
          >
            {addComment.isPending ? "Posting…" : "Post Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
