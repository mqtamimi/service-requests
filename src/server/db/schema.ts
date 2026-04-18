import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["customer", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRole("role").notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ─── Service Requests ────────────────────────────────────────────────────────

export const requestType = pgEnum("request_type", [
  "outage",
  "billing",
  "start_service",
  "stop_service",
  "other",
]);

export const requestPriority = pgEnum("request_priority", [
  "low",
  "medium",
  "high",
]);

export const requestStatus = pgEnum("request_status", [
  "submitted",
  "in_progress",
  "resolved",
  "rejected",
  "closed",
]);

export const commentVisibility = pgEnum("comment_visibility", [
  "public",
  "internal",
]);

export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  reference: text("reference").notNull().unique(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => users.id),
  type: requestType("type").notNull(),
  priority: requestPriority("priority").notNull(),
  description: text("description").notNull(),
  status: requestStatus("status").notNull().default("submitted"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type NewServiceRequest = typeof serviceRequests.$inferInsert;

export const serviceRequestEvents = pgTable("service_request_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => serviceRequests.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  fromStatus: requestStatus("from_status"),
  toStatus: requestStatus("to_status").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export type ServiceRequestEvent = typeof serviceRequestEvents.$inferSelect;

export const serviceRequestComments = pgTable("service_request_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => serviceRequests.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  visibility: commentVisibility("visibility").notNull().default("public"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ServiceRequestComment = typeof serviceRequestComments.$inferSelect;
