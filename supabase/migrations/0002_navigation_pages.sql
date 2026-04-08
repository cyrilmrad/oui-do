-- Lodging & exploring multi-page content (labels, copy, hotels[], spots[])
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "navigation_pages" jsonb;

COMMENT ON COLUMN "invitations"."navigation_pages" IS 'NavigationPagesContent JSON: menu labels, lodging/exploring titles and intros, lodgingHotels[], exploringSpots[]';
