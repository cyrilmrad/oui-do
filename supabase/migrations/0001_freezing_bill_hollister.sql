CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"category" varchar(255) NOT NULL,
	"is_included" boolean DEFAULT true,
	"supplier" varchar(255),
	"description" text,
	"estimated_cost" integer DEFAULT 0,
	"actual_cost" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" integer NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"pax" integer DEFAULT 1 NOT NULL,
	"table_id" uuid,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "guests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seating_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"capacity" integer DEFAULT 8,
	"shape" varchar(50) DEFAULT 'round',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "seating_tables" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rsvps" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "rsvps" CASCADE;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "reception_time" varchar(255);--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "reception_venue" varchar(255);--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "reception_location" varchar(255);--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "details_background_url" text;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "hero_logo_url" text;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "show_hero_logo" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "show_formal_invitation" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "formal_invitation_image" text;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "custom_sections" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_slug_invitations_slug_fk" FOREIGN KEY ("slug") REFERENCES "public"."invitations"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_table_id_seating_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."seating_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seating_tables" ADD CONSTRAINT "seating_tables_slug_invitations_slug_fk" FOREIGN KEY ("slug") REFERENCES "public"."invitations"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "Admins have full access to expenses" ON "expenses" AS PERMISSIVE FOR ALL TO public USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');--> statement-breakpoint
CREATE POLICY "Clients can manage their own expenses" ON "expenses" AS PERMISSIVE FOR ALL TO public USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'client' AND slug = (auth.jwt() -> 'app_metadata' ->> 'slug')) WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'client' AND slug = (auth.jwt() -> 'app_metadata' ->> 'slug'));--> statement-breakpoint
CREATE POLICY "Admins have full access to guests" ON "guests" AS PERMISSIVE FOR ALL TO public USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');--> statement-breakpoint
CREATE POLICY "Clients can manage their own guests" ON "guests" AS PERMISSIVE FOR ALL TO public USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'client' AND invitation_id IN (SELECT id FROM public.invitations WHERE slug = (auth.jwt() -> 'app_metadata' ->> 'slug'))) WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'client' AND invitation_id IN (SELECT id FROM public.invitations WHERE slug = (auth.jwt() -> 'app_metadata' ->> 'slug')));--> statement-breakpoint
CREATE POLICY "Admins have full access to seating_tables" ON "seating_tables" AS PERMISSIVE FOR ALL TO public USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');--> statement-breakpoint
CREATE POLICY "Clients can manage their own seating_tables" ON "seating_tables" AS PERMISSIVE FOR ALL TO public USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'client' AND slug = (auth.jwt() -> 'app_metadata' ->> 'slug')) WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'client' AND slug = (auth.jwt() -> 'app_metadata' ->> 'slug'));