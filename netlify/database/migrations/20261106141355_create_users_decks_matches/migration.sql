CREATE TABLE "decks" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"main" jsonb DEFAULT '[]' NOT NULL,
	"extra" jsonb DEFAULT '[]' NOT NULL,
	"side" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"status" text DEFAULT 'waiting' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"host_name" text NOT NULL,
	"guest_name" text,
	"host_secret" text NOT NULL,
	"guest_secret" text,
	"host_deck" jsonb NOT NULL,
	"state" jsonb,
	"version" integer DEFAULT 0 NOT NULL,
	"host_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"guest_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"username" text NOT NULL UNIQUE,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "decks_user_idx" ON "decks" ("user_id");--> statement-breakpoint
CREATE INDEX "matches_status_idx" ON "matches" ("status","is_public");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" ("user_id");--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;