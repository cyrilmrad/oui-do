-- Wedding day-of schedule per client slug
-- Publicly readable (suppliers get a share link), admin-only write.

create table if not exists wedding_schedules (
  id                   uuid        primary key default gen_random_uuid(),
  slug                 text        not null unique references invitations(slug) on delete cascade,
  title                text        not null default '',
  wedding_date         date,
  background_color     text        not null default '#cfe8e0',
  background_image_url text,
  accent_color         text        not null default '#00150f',
  text_color           text        not null default '#1a2e25',
  items                jsonb       not null default '[]'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table wedding_schedules enable row level security;

-- Admins can do everything
create policy "admin_all_schedule" on wedding_schedules
  for all to authenticated
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Public read — shareable link for suppliers, no login required
create policy "public_read_schedule" on wedding_schedules
  for select to anon, authenticated
  using (true);
