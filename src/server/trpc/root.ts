import { createTRPCRouter } from "./trpc";
import { serviceRequestsRouter } from "./serviceRequests";

export const appRouter = createTRPCRouter({
  serviceRequests: serviceRequestsRouter,
});

export type AppRouter = typeof appRouter;
