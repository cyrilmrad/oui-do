-- 1:1 subscription / billing record per invitation.
-- See src/db/schema.ts for the Drizzle declaration.
-- Run this in the Supabase SQL editor (or via psql) — matches the workflow used
-- for migrations 0002–0007; do NOT use `drizzle-kit push` here because its journal
-- is stale (only tracks 0000–0001, the later migrations were applied manually).

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "invitation_id" integer NOT NULL UNIQUE,
    "plan_tier" varchar(50) NOT NULL DEFAULT 'basic',
    "price" integer NOT NULL DEFAULT 0,
    "is_paid" boolean NOT NULL DEFAULT false,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "subscriptions_invitation_id_fk"
        FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE CASCADE
);

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;

-- Drop-and-recreate so re-running this script is safe even if a partial run already created the policy.
DROP POLICY IF EXISTS "Admins have full access to subscriptions" ON "subscriptions";
CREATE POLICY "Admins have full access to subscriptions"
    ON "subscriptions"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
