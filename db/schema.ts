import { pgTable, serial, text, timestamp, integer, jsonb, boolean, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial().primaryKey(),
  username: text().notNull().unique(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text().notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const decks = pgTable(
  "decks",
  {
    id: serial().primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text().notNull().default(""),
    main: jsonb().notNull().default([]),
    extra: jsonb().notNull().default([]),
    side: jsonb().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("decks_user_idx").on(t.userId)],
);

export const matches = pgTable(
  "matches",
  {
    id: text().primaryKey(),
    code: text().notNull().unique(),
    status: text().notNull().default("waiting"), // waiting | active | finished
    isPublic: boolean("is_public").notNull().default(true),
    hostName: text("host_name").notNull(),
    guestName: text("guest_name"),
    hostSecret: text("host_secret").notNull(),
    guestSecret: text("guest_secret"),
    hostDeck: jsonb("host_deck").notNull(),
    state: jsonb(),
    version: integer().notNull().default(0),
    hostSeenAt: timestamp("host_seen_at", { withTimezone: true }).defaultNow().notNull(),
    guestSeenAt: timestamp("guest_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("matches_status_idx").on(t.status, t.isPublic)],
);
