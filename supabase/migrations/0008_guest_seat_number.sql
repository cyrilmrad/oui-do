-- Per-seat placement for seating UI. table_id already exists on guests.
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS seat_number integer NULL;

COMMENT ON COLUMN public.guests.seat_number IS '1-based first seat when seated; null when unseated or legacy rows.';
