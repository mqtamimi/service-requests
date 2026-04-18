import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import {
  createTRPCRouter,
  customerProcedure,
  adminProcedure,
} from "./trpc";
import {
  serviceRequests,
  serviceRequestEvents,
  serviceRequestComments,
  users,
  requestType,
  requestPriority,
  requestStatus,
} from "~/server/db/schema";
import { canTransition } from "./transitions";

// ── Helpers ────────────────────────────────────────────────────────────────

function generateReference(): string {
  const prefix = "SR";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ── Input schemas ──────────────────────────────────────────────────────────

const createInput = z.object({
  type: z.enum(requestType.enumValues),
  priority: z.enum(requestPriority.enumValues),
  description: z.string().min(10).max(2000),
});

const listAllInput = z.object({
  status: z.enum(requestStatus.enumValues).optional(),
  priority: z.enum(requestPriority.enumValues).optional(),
  sort: z.enum(["asc", "desc"]).default("desc"),
});

const updateStatusInput = z.object({
  id: z.string().uuid(),
  toStatus: z.enum(requestStatus.enumValues),
});

const addCommentInput = z.object({
  requestId: z.string().uuid(),
  body: z.string().min(1).max(5000),
  visibility: z.enum(["public", "internal"]),
});

// ── Router ─────────────────────────────────────────────────────────────────

export const serviceRequestsRouter = createTRPCRouter({
  // ── Customer procedures ──────────────────────────────────────────────────

  create: customerProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const customerId = ctx.session.user.id;

      const [req] = await ctx.db
        .insert(serviceRequests)
        .values({
          reference: generateReference(),
          customerId,
          type: input.type,
          priority: input.priority,
          description: input.description,
          status: "submitted",
        })
        .returning();

      if (!req) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Record creation event
      await ctx.db.insert(serviceRequestEvents).values({
        requestId: req.id,
        actorId: customerId,
        fromStatus: null,
        toStatus: "submitted",
      });

      return req;
    }),

  listMine: customerProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.customerId, ctx.session.user.id))
      .orderBy(desc(serviceRequests.createdAt));
  }),

  getMine: customerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const req = await ctx.db.query.serviceRequests.findFirst({
        where: and(
          eq(serviceRequests.id, input.id),
          eq(serviceRequests.customerId, ctx.session.user.id),
        ),
      });

      if (!req) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const events = await ctx.db
        .select({
          id: serviceRequestEvents.id,
          fromStatus: serviceRequestEvents.fromStatus,
          toStatus: serviceRequestEvents.toStatus,
          at: serviceRequestEvents.at,
        })
        .from(serviceRequestEvents)
        .where(eq(serviceRequestEvents.requestId, req.id))
        .orderBy(serviceRequestEvents.at);

      // Field-level security: strip internal comments from customer response
      const comments = await ctx.db
        .select({
          id: serviceRequestComments.id,
          body: serviceRequestComments.body,
          visibility: serviceRequestComments.visibility,
          createdAt: serviceRequestComments.createdAt,
        })
        .from(serviceRequestComments)
        .where(
          and(
            eq(serviceRequestComments.requestId, req.id),
            eq(serviceRequestComments.visibility, "public"),
          ),
        )
        .orderBy(serviceRequestComments.createdAt);

      return { ...req, events, comments };
    }),

  // ── Admin procedures ─────────────────────────────────────────────────────

  listAll: adminProcedure.input(listAllInput).query(async ({ ctx, input }) => {
    const conditions = [];

    if (input.status) {
      conditions.push(eq(serviceRequests.status, input.status));
    }
    if (input.priority) {
      conditions.push(eq(serviceRequests.priority, input.priority));
    }

    const rows = await ctx.db
      .select({
        id: serviceRequests.id,
        reference: serviceRequests.reference,
        type: serviceRequests.type,
        priority: serviceRequests.priority,
        status: serviceRequests.status,
        description: serviceRequests.description,
        createdAt: serviceRequests.createdAt,
        updatedAt: serviceRequests.updatedAt,
        customer: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(serviceRequests)
      .innerJoin(users, eq(serviceRequests.customerId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        input.sort === "asc"
          ? serviceRequests.createdAt
          : desc(serviceRequests.createdAt),
      );

    return rows;
  }),

  getOne: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const req = await ctx.db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, input.id),
      });

      if (!req) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const customer = await ctx.db.query.users.findFirst({
        where: eq(users.id, req.customerId),
      });

      const events = await ctx.db
        .select({
          id: serviceRequestEvents.id,
          fromStatus: serviceRequestEvents.fromStatus,
          toStatus: serviceRequestEvents.toStatus,
          at: serviceRequestEvents.at,
          actor: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(serviceRequestEvents)
        .innerJoin(users, eq(serviceRequestEvents.actorId, users.id))
        .where(eq(serviceRequestEvents.requestId, req.id))
        .orderBy(serviceRequestEvents.at);

      // Admin sees all comments including internal
      const comments = await ctx.db
        .select({
          id: serviceRequestComments.id,
          body: serviceRequestComments.body,
          visibility: serviceRequestComments.visibility,
          createdAt: serviceRequestComments.createdAt,
          author: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(serviceRequestComments)
        .innerJoin(users, eq(serviceRequestComments.authorId, users.id))
        .where(eq(serviceRequestComments.requestId, req.id))
        .orderBy(serviceRequestComments.createdAt);

      return { ...req, customer, events, comments };
    }),

  updateStatus: adminProcedure
    .input(updateStatusInput)
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, input.id),
      });

      if (!req) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (!canTransition(req.status, input.toStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from "${req.status}" to "${input.toStatus}"`,
        });
      }

      const [updated] = await ctx.db
        .update(serviceRequests)
        .set({ status: input.toStatus, updatedAt: new Date() })
        .where(eq(serviceRequests.id, input.id))
        .returning();

      if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await ctx.db.insert(serviceRequestEvents).values({
        requestId: req.id,
        actorId: ctx.session.user.id,
        fromStatus: req.status,
        toStatus: input.toStatus,
      });

      return updated;
    }),

  addComment: adminProcedure
    .input(addCommentInput)
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, input.requestId),
      });

      if (!req) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [comment] = await ctx.db
        .insert(serviceRequestComments)
        .values({
          requestId: input.requestId,
          authorId: ctx.session.user.id,
          visibility: input.visibility,
          body: input.body,
        })
        .returning();

      return comment;
    }),
});
