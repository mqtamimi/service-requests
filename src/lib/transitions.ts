/**
 * Single source of truth for status transition rules.
 * Imported by both the tRPC router (server) and UI components (client).
 */

export type RequestStatus =
  | "submitted"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "closed";

const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  submitted: ["in_progress", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: ["closed"],
  rejected: [],
  closed: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function allowedTransitionsFrom(from: RequestStatus): RequestStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: "Submitted",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
  closed: "Closed",
};
