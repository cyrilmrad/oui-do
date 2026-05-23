# CLAUDE.md

Orientation for AI assistants working on this repo. Keep edits to this file tight and high-signal — it loads into every session.

## What this is

**Oui-Do** — a Next.js wedding-invitation SaaS. Each client (couple) gets their own slug-scoped invitation site at `/invite/<slug>` with RSVP, gift options, multi-page navigation, budget tracking, and seating. Admins onboard clients and edit invitations through a builder UI; clients log in to a dashboard to manage guests, see RSVPs, edit their own settings, etc.

**Status:** production. Be careful with destructive actions and breaking changes — see the "Production caveats" section below.

## Stack

- **Next.js 16** (App Router) + React 19
- **Tailwind v4** (CSS-first, design tokens in `src/app/globals.css`)
- **Supabase** — auth, storage (`assets` bucket), and the Postgres DB behind Drizzle
- **Drizzle ORM** on `postgres.js` (limited to 1 connection per serverless instance — see `bd79592`)
- **Tiptap** — rich text for the multi-page blog editor
- **Sonner** — toast notifications (themed in `globals.css`; **never `alert()`** — see Conventions)
- **lucide-react** — icons
- **framer-motion** — used inside `InvitationPreview`
- **@dnd-kit** — drag-and-drop for table seating
- **read-excel-file** — guest CSV/Excel import (dynamic-imported on demand)

## Folder structure

```
src/
├── app/                          # Next.js App Router
│   ├── admin/page.tsx            # Admin workspace (client list + invitation builder)
│   ├── dashboard/page.tsx        # Client dashboard (guests / messages / budget / seating / settings)
│   ├── invite/[slug]/page.tsx    # Public invitation
│   ├── login/                    # Login + reset-password flow
│   ├── api/                      # REST endpoints
│   │   ├── admin/                #   client CRUD, entitlements, invitation upsert
│   │   ├── guests/               #   guest CRUD + CSV import
│   │   ├── invitation/           #   public invitation GET
│   │   ├── me/, rsvp/            #   session, RSVP submission
│   ├── actions/                  # Server actions (budget, seating, payments)
│   ├── layout.tsx                # Root layout — mounts <Toaster />
│   └── globals.css               # Design tokens + sonner theming
├── components/
│   ├── InvitationPreview.tsx     # Live preview; ALSO the source of truth for InvitationData / Theme / nav helpers
│   ├── BudgetTracker.tsx
│   ├── TableSeating.tsx
│   ├── admin/                    # Admin-only components
│   │   ├── ClientList.tsx, NewClientForm.tsx, CustomSectionBlock.tsx, ClientEntitlementsPanel.tsx
│   │   └── builder/              # One file per section of the invitation builder (Couple, Hero, Houses, …)
│   ├── dashboard/                # Dashboard tab components (GuestsTab, CsvImportModal, etc.)
│   ├── blog/InvitationBlogEditor.tsx
│   └── entitlements/             # <EntitlementsProvider> + useEntitlements hook
├── hooks/                        # Shared hooks
│   ├── useNavigationPages.ts     # 11 handlers for editing InvitationData.navigationPages
│   ├── useGiftOptions.ts         # bank/mobile gift options
│   └── useCustomSections.ts      # customSections array
├── lib/                          # Utilities & infra
│   ├── supabaseClient.ts         # Browser supabase client
│   ├── auth/supabaseAdmin.ts     # Server-side admin client (service-role; never import from client code)
│   ├── fetchWithAuth.ts          # fetch wrapper that attaches Supabase access token
│   ├── navigationPages.ts        # NavigationPagesContent types + merge helpers + EMPTY_* constants
│   ├── guestCsvImport.ts         # CSV/Excel guest-row parser + template URL
│   ├── entitlements/             # Feature flags per client (FeatureKey, defaults, guard, service)
│   ├── features.ts
│   ├── rsvpClosedMessageBold.ts
│   └── uploadInvitationAsset.ts
├── db/                           # Drizzle: schema.ts + index.ts (client)
└── proxy.ts                      # Next.js 16 middleware → proxy (used to be middleware.ts)
```

## Design system

Tokens live in `src/app/globals.css` under `@theme inline`. Two parallel palettes:

- **Admin (editorial / Material-design tokens):** `text-primary`, `text-on-surface`, `text-secondary`, `bg-surface`, `bg-surface-container-low`, `bg-surface-container-high`, `bg-surface-container-lowest`, `border-outline-variant`. Primary is deep forest green `#00150f`. Fonts: `font-headline` (Noto Serif) + `font-body`/`font-label` (Manrope).
- **Dashboard (Tailwind stones/emeralds):** `bg-stone-50/100/200/…`, `text-stone-500/700/900`, `emerald-*` for success/attending, `rose-*` for delete/declined, `amber-*` for pending. Headlines use `font-serif`.

These two visual languages coexist intentionally — admin is editorial/dark-forest, dashboard is light/stone. Don't try to merge them.

The **sonner toast theming** in `globals.css` was tuned to match these palettes (success = emerald-50/900, error = rose-50/900, warning = amber-50/900). If you add new toast variants, follow the same restraint — no bright colors.

## Conventions

### State editing for `InvitationData`

The admin builder and dashboard settings both edit the same `InvitationData` shape. The three shared mutation patterns are extracted as hooks — **use them instead of writing inline `setState` logic**:

```ts
const { handleAddGiftOption, handleRemoveGiftOption, handleGiftOptionChange } = useGiftOptions(setLiveData);
const { handleAddSection, handleRemoveSection, handleSectionChange } = useCustomSections(setLiveData);
const { updateNavigationPages, addLodgingHotel, /* …11 total */ } = useNavigationPages(setLiveData);
```

If you find yourself duplicating one of these handlers, edit the hook instead.

### Components

- Tabs and large form sections live as their own components — never inline new ~100-line blocks in `app/*/page.tsx`.
- Builder section files live under `src/components/admin/builder/` and are **purely presentational**: they take explicit props (state values + callbacks), no `useState`, no hooks beyond what comes via props.
- The parent page owns all state. Sections never reach into `useNavigationPages` etc. themselves — the parent destructures and passes handlers down.

### Notifications

- **Always use `toast.*` from `sonner`**, never `alert()`. The theme is pre-configured in `globals.css`.
- `toast.success("Title", { description: "Detail" })` for completed mutations
- `toast.error("Title", { description: errorMessage })` for failures
- `confirm("…")` is fine for blocking user prompts — it's not a notification.

### Types

`InvitationData`, `Theme`, `CustomSection`, `GiftOption`, `HousesData`, and all `Navigation*` types are **re-exported from `@/components/InvitationPreview`**. Import them from there, not from `@/lib/navigationPages` directly (except for purely-lib code).

There are intentional `any` types at component prop boundaries that mirror the parent's `useState<any[]>` (e.g. `rsvps: any[]` in `GuestsTab`). Not a free pass — only acceptable when the parent already uses `any`.

### Authentication

- Client code uses `@/lib/supabaseClient` (browser client) or `@/lib/fetchWithAuth` (attaches access token).
- Server / admin routes use `@/lib/auth/supabaseAdmin` (service-role key). Never import this from client code.
- `app_metadata.role` distinguishes `'admin'` vs `'client'`. Slug-scoped routes verify the user's `app_metadata.slug` matches.

### Entitlements

Features per client are gated via `useEntitlements()` (`@/components/entitlements/EntitlementsContext`). Available feature keys live in `@/lib/features.ts`. Render `<FeatureLockedMessage label="…" />` when a tab is disabled, and reset `activeTab` to `'overview'` in the parent if the active feature gets locked.

## Common commands

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Next production build |
| `npm run lint` | ESLint |
| `npm run db:push` | Drizzle: push schema to DB |
| `node_modules/.bin/tsc --noEmit` | Type-check (no npm script) |

## Production caveats

This codebase is **live in production**. Default to small, behavior-preserving changes:

- **Verify before declaring done:** run `tsc --noEmit` after edits. The repo lints with warnings allowed — but a brand-new error needs justification.
- **Don't introduce raw `&`, `'`, `"` inside JSX text nodes** — ESLint flags them. Use `&amp;` / `&apos;` / `&quot;`.
- **Don't add features to the bug fix.** No surrounding cleanups, no opportunistic refactors mixed in. Refactor commits stay separate.
- **`postgres.js` is pinned to 1 connection per serverless instance** (`bd79592`). Don't raise that limit without checking Supabase pool sizing.
- **Large JSX swaps with the Edit tool are fragile** (strict match). For >100-line replacements, `sed -i '<start>,<end>d'` followed by an `Edit`-based insertion is more reliable.
- **Don't commit `.claude/`** — it's local Claude Code settings, not project config.

## Active work / recent history

- Steps 1–5 of an ongoing decomposition of `app/admin/page.tsx` (2334 → 1138 lines) and `app/dashboard/page.tsx` (1917 → 1283 lines). See `refactor/decompose-page-components` branch.
- Sonner toast notifications replaced all `alert()` calls.
- See `memory/MEMORY.md` (per-user, not checked in) for the step-by-step rationale.

## Things still TODO (good first refactors)

- Introduce a proper `Rsvp` interface and replace `any[]` rsvps typing in parent + `GuestsTab`.
- Replace `Math.random().toString(36).substring(7)` ID generation with `crypto.randomUUID()` (used in `useGiftOptions`, `useCustomSections`, and a few inline places).
- Extract remaining dashboard render functions (`renderOverview`, `renderMessages`, `renderBudget`, `renderSeating`, `renderSettings`) into their own components — same pattern as `GuestsTab`.
- Move the four sidebar-reset blocks in `app/admin/page.tsx` (the `setHeroImageFile(null); setHeroImagePreview(null); …` copy-pasted 4×) into a single `resetBuilderState()` helper.
