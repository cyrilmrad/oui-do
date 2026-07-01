# Follow-ups & Deferred Enhancements

Running list of UI/UX and technical improvements surfaced during the Planner and
Account-Creation-Revamp work but intentionally left out of scope. Keep this list
current — add items as they come up, check them off (or move to a dated "Done"
section) when shipped.

_Last updated: 2026-07-01_

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
- [ ] **`displayName` duplicated in entitlements UI** — the couple-name helper is
  copy-pasted in `EntitlementsClientList.tsx` and `EntitlementsDetail.tsx`. Extract to
  a shared `src/components/admin/entitlements/utils.ts` (or export from `types.ts`)
  when the display logic next needs to change.
- [ ] **`featureMeta.ts` lives in `src/lib/` but imports lucide-react** — the rest of
  `src/lib/entitlements/*.ts` is pure (server-safe). `featureMeta.ts` pulls in React
  icon components, so it's client-only. Consider moving it to
  `src/components/admin/entitlements/featureMeta.ts` to keep `src/lib` free of UI deps.

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
- [ ] **Escape-to-close on `PasswordManagerModal`** — the extracted password modal
  (like the original) has no keyboard dismissal. Add an `Escape` key handler for
  accessibility; applies to other admin modals too if standardized.

## Notes

- Manual verification for the account-creation revamp (create new wedding / add
  login / create assistant / slug-collision errors / remove account) was **not** run
  by the agent because it would create real users in production Supabase. Run these
  in a safe environment before relying on the feature in production.

## Deferred from the 2026-07-01 hardening + enhancements pass

Context: `docs/audits/2026-07-01-security-audit-and-monetization.md`. Branch
`feat/security-hardening-and-enhancements`. The items below were in scope but
intentionally deferred (production risk / needs a decision or migration):

- [ ] **Dashboard auto-save + unsaved-changes guard** — a `beforeunload` guard
  needs reliable dirty-state tracking in `app/dashboard/page.tsx`. A naive snapshot
  compare risks false-positive "unsaved changes" prompts on every close if the
  serialized `weddingDetails` diverges from the saved snapshot (merged defaults,
  key order). Best done alongside the planned dashboard decomposition, or with an
  explicit `settingsDirty` flag wired through the settings onChange handlers.
- [ ] **Broad accessibility sweep** — the seating planner is now keyboard/screen-
  reader operable (tap/keyboard assignment sheet), confetti respects reduced motion,
  the dashboard loader is `aria-busy`, and the hero backdrop got a decorative alt.
  Still to do: focus-trap on all modals (CsvImportModal, PasswordManagerModal,
  ConfirmDialog), explicit `<label htmlFor>` across the settings form, and a
  contrast pass on `text-stone-400` over light backgrounds.
- [ ] **Spatial seating floor-plan** — a drag-to-position 2D room layout needs
  persisted table x/y coordinates → a `seating_tables` migration (nullable `posX`,
  `posY`) + `db:push`. The print chart + capacity enforcement + tap/keyboard
  assignment shipped without a migration; the spatial canvas is the remaining piece.
- [ ] **`next/image` for invitation media** — couples can point hero/gallery images
  at arbitrary hosts, so `next/image` optimization isn't viable without either a
  permissive `remotePatterns` (defeats the point) or `unoptimized`. Shipped native
  `loading="lazy"` on below-the-fold `<img>` instead. Revisit if media moves to the
  Supabase bucket exclusively (then allowlist that one host and convert).
- [ ] **Rate limiting → shared store** — `src/lib/rateLimit.ts` is per-instance
  in-memory (documented). Back it with Upstash/Redis for multi-instance production.
- [ ] **Report-only CSP → enforced** — `next.config.ts` ships CSP report-only. Add a
  report endpoint, confirm no violations, then switch to `Content-Security-Policy`.
- [ ] **Planner [id] update/toggle routes** — `/api/planner/events/[id]` and
  `/api/planner/todos/[id]` (and `/api/admin/reset-password`) were not given the new
  validation pass (trusted admin/assistant roles). Add for consistency.
