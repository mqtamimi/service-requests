// Re-export from the shared lib so server code imports from here
// and the single source of truth lives in ~/lib/transitions
export { canTransition, allowedTransitionsFrom } from "~/lib/transitions";
export type { RequestStatus } from "~/lib/transitions";
