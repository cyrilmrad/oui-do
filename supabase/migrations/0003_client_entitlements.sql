CREATE TABLE IF NOT EXISTS "client_entitlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"guests_enabled" boolean DEFAULT true NOT NULL,
	"messages_enabled" boolean DEFAULT true NOT NULL,
	"budget_enabled" boolean DEFAULT false NOT NULL,
	"seating_enabled" boolean DEFAULT false NOT NULL,
	"settings_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "client_entitlements_slug_unique" UNIQUE("slug"),
	CONSTRAINT "client_entitlements_slug_invitations_fk" FOREIGN KEY ("slug") REFERENCES "public"."invitations"("slug") ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE "client_entitlements" IS 'Per-slug feature flags; missing row uses app defaults (guests+messages on, rest off).';
