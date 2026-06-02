# Follow-ups & Deferred Enhancements

Running list of UI/UX and technical improvements surfaced during the Planner and
Account-Creation-Revamp work but intentionally left out of scope. Keep this list
current — add items as they come up, check them off (or move to a dated "Done"
section) when shipped.

_Last updated: 2026-06-02_

---

## Technical

- [ ] **Unpaginated `listUsers()`** — `src/app/api/admin/clients/route.ts`,
  `src/app/api/admin/create-client/route.ts`, and
  `src/app/api/admin/clients/[slug]/account/route.ts` all call
  `supabaseAdmin.auth.admin.listUsers()` with no pagination (Supabase default page
  size is 50). Pre-existing pattern, but it now also affects slug-existence checks
  and the per-wedding accounts list. Once the workspace exceeds ~50 users the
  clients list, slug collision detection, and account deletion can all silently miss
  accounts. Fix: paginate (`perPage`/`page` loop) or move account lookups to a query
  that filters server-side.
- [ ] **`Rsvp` interface** — replace the `any[]` rsvps typing in the dashboard parent
  and `GuestsTab` with a real interface (already noted in CLAUDE.md TODOs).
- [ ] **`crypto.randomUUID()`** — replace `Math.random().toString(36).substring(7)`
  ID generation in `useGiftOptions`, `useCustomSections`, and inline spots.
- [ ] **`Client` interface for the clients list** — `ClientList`/`NewClientForm`
  use `clients: any[]` mirroring `realClients: any[]` in `admin/page.tsx`. Now that
  the shape includes `accounts: {id,email}[]`, a typed `Client` model would remove
  several `any`s and make the accounts wiring safer.
- [ ] **Stable sort tie-break** — `clients/route.ts` sorts accounts by `createdAt`
  with `(a < b ? -1 : 1)` (returns `1` for equal timestamps). Harmless today
  (distinct timestamps); make it a proper `-1 | 0 | 1` compare if it ever matters.

## UI / UX

- [ ] **Assistant management surface** — assistants can be *created* but there is no
  list to view / rename / reset-password / delete them. Add a minimal "Assistants"
  section (likely near the admin sidebar or as a tab) once there are real assistants
  to manage.
- [ ] **Per-account password reset from the wedding overview** — the new Accounts
  section in `ClientOverview` lists logins with a Remove button. Password reset still
  lives only in the Entitlements panel and targets the *representative* (oldest)
  account. Add per-account reset in the Accounts section so any specific login can be
  reset.
- [ ] **Client-specific top-nav on mobile** — the admin per-client tab strip
  (Overview / Builder / Budget / Seating / Day-of Schedule) uses `px-8` with 5 tabs
  and will overflow horizontally on small screens. The global nav drawer was added,
  but this inner strip is still desktop-shaped. Make it scroll or wrap on mobile.
- [ ] **FullCalendar now-indicator color** — currently the default red. If brand
  alignment is wanted, theme it via the `--fc-now-indicator-color` CSS variable
  (kept red intentionally for the universal "current time" convention).
- [ ] **Decorative image removed from creation modal** — the old `NewClientForm`
  had a decorative Unsplash portrait at the bottom; the revamp dropped it for a
  cleaner form. Re-add a tasteful editorial flourish if the empty space feels bare.

## Notes

- Manual verification for the account-creation revamp (create new wedding / add
  login / create assistant / slug-collision errors / remove account) was **not** run
  by the agent because it would create real users in production Supabase. Run these
  in a safe environment before relying on the feature in production.
