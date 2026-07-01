# Oui-Do — Security Audit, Product Ideas & Monetization Strategy

> Generated 2026-07-01 from a full-codebase audit (three parallel Explore agents: security,
> architecture/monetization, UI/UX), with every critical security claim re-verified against
> source. This is the reference doc for the security-hardening + enhancements work on branch
> `feat/security-hardening-and-enhancements`.

## Context

Full-codebase pass wearing four hats — solution architect, senior frontend engineer, UI/UX
designer, security expert — to (1) surface security risks, (2) generate product ideas, and
(3) map a path to a profitable SaaS sellable to **regular couples** and **wedding planners**.

**Headline:** feature-rich, well-structured MVP that is currently a **manual B2B tool** — there
is *no self-serve billing and no planner tier*. Biggest levers: **(1) close the security gaps
that make public exposure unsafe, then (2) add Stripe self-serve billing + a planner role.**
Premium features are upsell on top of those two.

---

## Architectural fact that reframes the security picture

`src/db/index.ts` connects Drizzle over `postgres.js` using a **direct `DATABASE_URL`** connection.
The browser Supabase client (`src/lib/supabaseClient.ts`) is used **only for auth** — there are
**zero `supabase.from(...)` data reads** in the app. Therefore:

- **The RLS policies in `src/db/schema.ts` do not protect API data access** — the direct
  connection bypasses them. They only backstop browser-direct queries that never happen.
- **The route-handler / server-action guards (`src/lib/entitlements/guard.ts`) are the entire
  security boundary.** Any endpoint missing a guard is fully exposed.

The guard layer itself is **well-built** (`requireFeatureForSlug`, `requireAdmin`,
`requireAdminOrAssistant`, `enforceSlugFeature` — `guard.ts:41-104`). The problems are endpoints
that **skip it** and the **absence of input validation / rate limiting**.

---

# PART A — Security Audit (verified & re-rated)

### HIGH — 1. `/api/invitation` dumps the full row publicly (`SELECT *`)
`src/app/api/invitation/route.ts:15-21` runs `db.select().from(invitations)` (no guard, no field
allowlist) and returns `result[0]` verbatim to any anonymous caller.
- **Impact:** trivial **client-base enumeration** by iterating slugs, and leakage of internal ops
  fields never meant for guests — `clientLocked`, `clientLockedAt`, `isArchived`, `archivedAt`,
  `archiveMessage`, `metadataImageUrl`.
- **Correction:** bank fields are *not* a theft vector — they're intentionally rendered in the
  public gift section. The issue is over-exposure of internal fields + enumeration.
- **Fix:** return an allowlist of public presentation fields (the ones `InvitationPreview` uses).

### HIGH — 2. No rate limiting anywhere; public RSVP allows guest-list pollution & slug enumeration
`src/app/api/rsvp/route.ts` is an unauthenticated POST. `proxy.ts` only refreshes the session.
- **Impact:** (a) generic-link branch (`route.ts:110-121`) lets anyone insert arbitrary guest
  rows into any valid slug → spam; (b) differing status codes (404/403/200) → **slug enumeration
  oracle**; (c) unbounded companion arrays.
- **Already good:** personalized-link `guestId` ownership is verified (`route.ts:44-53`) and pax
  over-claim is blocked (`route.ts:59-61`).
- **Fix:** rate limiting on `/api/rsvp`; cap companion count/length; optional turnstile/honeypot.

### HIGH — 3. Zero security headers (`next.config.ts` is empty)
No CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Impact:** clickjacking, no HTTPS pinning, weaker XSS containment.
- **Fix:** add a `headers()` block; start with a report-only CSP (framer-motion + Supabase +
  Tiptap need allowances), then enforce.

### MEDIUM — 4. No value-level input validation on mutation routes
Guest updates (`/api/guests` PUT), invitation upsert (`/api/admin/invitation` — allowlists keys
but not values), planner events/todos. No `pax` range, no `status` enum, no length caps.
- **Impact:** integrity corruption, storage bloat, brittle stats.
- **Fix:** Zod schemas at each route boundary. Prerequisite for opening signup to the public.

### MEDIUM — 5. Public seat-finder lookup enables guest-list enumeration
`src/app/api/seating/lookup/route.ts` is public and returns matched names **plus tablemates** for
substring queries ≥2 chars (`route.ts:80,91-105`).
- **Impact:** anyone with a slug can walk the attendee list + social graph.
- **Fix:** rate-limit; require near-exact match (score ≥2) before returning; hide tablemates until
  the searcher's own match is exact; optional per-invite access code in the QR.

### MEDIUM — 6. Unbounded CSV/Excel import
`src/lib/guestCsvImport.ts` + `GuestsTab.tsx` parse the whole file into memory, no size/row cap.
- **Fix:** cap `file.size` (~5 MB) and rows (~10k) before parsing; validate MIME.

### MEDIUM — 7. File upload lacks MIME/size validation
`src/lib/uploadInvitationAsset.ts` sanitizes filename + scopes by slug (good) but accepts any
type/size and uses a predictable `Date.now()-` prefix.
- **Fix:** allowlist image/video MIME, cap size, use `crypto.randomUUID()` prefix.

### LOW — 8. `/api/schedule/[slug]` unauthenticated — **by design**
Schema has `public_read_schedule` RLS `using: true` (`schema.ts:204-208`). Day-of runsheet is
intended public (suppliers). Action: add `noindex`; keep supplier PII out of public fields.

### LOW — 9. Stored XSS via rich text — **not present**
No `dangerouslySetInnerHTML` anywhere; Tiptap renders via React nodes (auto-escaped). Residual:
validate `mapLink`/link fields to block `javascript:` URLs. CSP (#3) covers the rest.

### LOW — 10. `listUsers()` unpaginated (correctness + at-scale authz risk)
Already in `docs/superpowers/FOLLOW-UPS.md`. 4 admin routes call `listUsers()` with no pagination
(Supabase caps at 50). Past 50 users, slug-collision detection + account/password ops silently
miss accounts. Fix: paginate. **Must fix before onboarding at scale.**

### LOW — 11. `update-password` has no per-admin ACL
Any admin can reset any client's password. Fine for single-admin today; **becomes a real
privilege issue when the planner/multi-admin tier ships.** Track with planner work.

**Posture:** solid guard design + clean isolation where guards are applied; gaps are missing
guards on a couple of public reads, no rate limiting, no input validation, no security headers.
All addressable in ~1–2 weeks and are **prerequisites to going self-serve/public.**

---

# PART B — Product & UX Ideas

### Quick wins (in scope for this branch)
- **RSVP success animation / confetti** + optimistic confirmation.
- **Loading skeletons** on invitation + dashboard fetches.
- **`next/image`** for hero/gallery + `loading="lazy"`.
- **A11y pass:** focus-trap modals, `@dnd-kit` keyboard support, `aria-live` saves, contrast, labels.
- **Auto-save + unsaved-changes guard** in dashboard settings.
- **Mobile seating fallback** — tap-to-assign (drag-drop broken on touch).

### Medium (in scope: RSVP analytics + Seating floor-plan; themes → brainstorm first)
- **RSVP analytics** — response-rate timeline, attendance forecast, dietary/song fields.
- **Seating floor-plan** — 2D room layout, capacity warnings, printable place cards + QR seat cards.
- **Theme & animation gallery** — *deferred; brainstorm with owner before building.*
- Guest communication (email reminders), budget charts, builder device-preview/reorder/templates.

### Bigger bets
- Post-wedding archive (memorial page, guest photos, thank-yous).
- Custom domain / white-label (essential for planner tier).
- i18n / bilingual invites (`dir="auto"` groundwork exists).

---

# PART C — Monetization

**Today:** no self-serve billing. `subscriptions` table is a manual ledger (`planTier`, `price`,
`isPaid`) — no Stripe/checkout/webhook. Onboarding is admin-only. Entitlements infra is real and
server-enforced (`guard.ts` + `service.ts`) — perfect backbone for paid tiers, just not wired to
payment. Planner groundwork is partial: an `assistant` role + global `plannerEvents`/`plannerTodos`
exist, but there's **no `planner_id` on invitations and no `planner` role**.

**1) Regular couples (B2C, self-serve):** add signup + Stripe Checkout; webhook flips
`subscriptions.isPaid` and sets `clientEntitlements` to the tier's feature set. One-time
"event pass" pricing (active until ~30 days post-event).

| Tier | Price (illustrative) | Features |
|---|---|---|
| Free/Starter | $0 | guests + messages, watermark |
| Pro | $99–149 one-time | all 5 features + premium themes/animations + custom seat QR, no watermark |
| Premium | $249 one-time | Pro + RSVP analytics, guest email reminders, custom domain, archive |

**2) Wedding planners (B2B, recurring — highest LTV):** add a `planner` role + `planner_id` on
invitations; scoped dashboard managing many couples.

| Tier | Price (illustrative) | Includes |
|---|---|---|
| Planner Solo | ~$49/mo | ~10 active weddings, dashboard, templates/duplication, white-label logo |
| Planner Studio | ~$99–149/mo | ~30 weddings, team seats (reuse `assistant` role), custom domain, per-planner calendar/todos |
| Agency/Enterprise | custom | unlimited, full white-label, priority support, done-for-you build |

Alternative planner model: **wholesale wedding-slot packs** (buy at discount, resell to couples).

**Upsell levers:** premium theme/animation packs · custom domain · guest email/SMS (SendGrid/
Twilio) · RSVP analytics · floor-plan seating · **printed place cards / QR seat cards** (physical
goods margin) · post-wedding archive · done-for-you build.

---

# Execution roadmap

**P0 — Security hardening (~1–2 wks) — gates going public.** invitation field allowlist · Zod on
mutation routes · rate limiting on `/api/rsvp` + `/api/seating/lookup` · security headers ·
CSV/file caps + upload MIME · paginate `listUsers()` · schedule `noindex`.

**P1 — Self-serve billing (~3–5 wks).** Stripe Checkout + webhook → `subscriptions` →
`clientEntitlements` (reuse `upsertClientEntitlements`); public signup + `/pricing`; tier→feature
map in `src/lib/features.ts`.

**P2 — Planner tier (~3–5 wks).** migration: `planner_id` on `invitations` + `planner` role +
backfill; scope `plannerEvents`/`plannerTodos` per planner; planner dashboard/builder routes;
per-admin/planner ACL on `update-password`; white-label domain + logo.

**P3 — Premium / upsell (ongoing).** theme & animation gallery, guest communication, RSVP
analytics, floor-plan seating + printed cards, post-wedding archive.

---

## Verification (no test framework — per CLAUDE.md)

Every change: `node_modules/.bin/tsc --noEmit` → `npm run lint` → `npm run build`, then manual
runtime via `npm run dev`. Small behavior-preserving commits, new branch per effort, escape
`& ' "` in JSX, don't raise the postgres `max:1` pool.

**Security regression checklist (P0), unauthenticated:**
- `GET /api/invitation?slug=<x>` returns only allowlisted fields (no `archiveMessage`/`clientLocked`).
- Rapid `POST /api/rsvp` and `GET /api/seating/lookup` return `429` after the limit.
- Malformed bodies (negative `pax`, bad `status`, oversized strings) return `400`.
- `curl -I` shows the new security headers.

**Billing (P1):** Stripe test mode + `stripe listen`; a test payment flips `isPaid` and unlocks the
tier's `clientEntitlements` (gated tab renders instead of `<FeatureLockedMessage>`).
