CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"bride" varchar(255) NOT NULL,
	"groom" varchar(255) NOT NULL,
	"date" varchar(255),
	"time" varchar(255),
	"venue" varchar(255),
	"location" varchar(255),
	"map_link" text,
	"hero_image" text,
	"hero_video" text,
	"audio_url" text,
	"message" text,
	"gift_message" text,
	"bank_account_name" varchar(255),
	"bank_account_number" varchar(255),
	"mobile_transfer_number" varchar(255),
	"theme" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "invitations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" serial PRIMARY KEY NOT NULL,
	"invitation_id" integer NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"status" varchar(50) NOT NULL,
	"guests" integer DEFAULT 1 NOT NULL,
	"dietary" text,
	"message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE no action ON UPDATE no action;