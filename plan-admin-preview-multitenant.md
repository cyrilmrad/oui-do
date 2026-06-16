# Plan: Admin Preview + Multi-Tenancy Architecture

## Status
| Feature | Status | Branch / Commit |
|---|---|---|
| Admin "Preview as Client" | ✅ Shipped | `feat/admin-client-preview` |
| Multi-tenancy (admin → planners → clients) | 🔜 Planned | — |

---

## Feature 1 — Admin "Preview as Client" ✅

### What was built
Admins can now open any client's dashboard in a read-only preview without logging out of the admin account.

**Entry point**: "Preview as Client ↗" pill link in the per-client top-nav bar — opens `/admin/preview/[slug]` in a new tab.

**`src/app/admin/preview/[slug]/page.tsx`** (new):
1. Verifies admin auth on load → redirects non-admins to `/login`
2. Fetches invitation, guests, budget, seating in parallel using the admin token
3. Renders a sticky amber `PREVIEW MODE` banner + four-tab layout

| Tab | Powered by |
|---|---|
| Overview | Inline stat cards (attending / pending / declined by pax, budget totals) |
| Guests | `GuestsTab` (`src/components/dashboard/GuestsTab.tsx`) |
| Budget | `BudgetTracker` (`src/components/BudgetTracker.tsx`) |
| Seating | `TableSeating` (`src/components/TableSeating.tsx`) |

**`AllFeaturesProvider`** (new export in `src/components/entitlements/EntitlementsContext.tsx`): wraps the preview page so all tabs render regardless of the client's entitlement settings.

### What was NOT changed
- `/dashboard/page.tsx` — client auth logic untouched
- No new API routes
- No DB changes

---

## Feature 2 — Multi-Tenancy: Admin → Planners → Clients 🔜

### Context
The business model will grow to allow wedding planners to each manage their own portfolio of clients. The hierarchy:

```
Super Admin  →  creates / manages planners (future /admin/planners panel)
   Planner   →  creates / manages their own clients (same /admin UI, scoped)
   Client    →  own /dashboard — unchanged
```

Planners use the **same `/admin` UI** as today — data is just scoped by `plannerId`. A future separate super-admin panel will manage planner accounts.

---

### New role: `planner`

Supabase auth `app_metadata`:
```json
{ "role": "planner", "plannerId": "<uuid>" }
```

Login routing (`src/app/login/page.tsx`):
```typescript
if (role === 'planner') router.push('/admin');  // same UI, scoped data
```

---

### DB changes (migration required)

**New table — `planners`:**
```sql
CREATE TABLE planners (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL UNIQUE,   -- matches auth user email
  user_id     uuid NOT NULL UNIQUE,   -- Supabase auth user id
  created_at  timestamptz DEFAULT now()
);
```

**Modified table — `invitations`:** add `planner_id` (nullable for back-compat):
```sql
ALTER TABLE invitations ADD COLUMN planner_id uuid REFERENCES planners(id);
```

Backfill: leave existing rows as `planner_id = NULL`. Super admin sees all (including null). Assign via admin UI later.

**RLS updates** — expand every `role = 'admin'` policy to also allow planners scoped to their own slugs:
```sql
-- Pattern repeated on: seating_tables, guests, expenses, subscriptions,
--                      payments, wedding_schedules, clientEntitlements, invitations
CREATE POLICY "planners_own_clients" ON <table>
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'planner'
      AND slug IN (
        SELECT slug FROM invitations
        WHERE planner_id = (auth.jwt() -> 'app_metadata' ->> 'plannerId')::uuid
      )
    )
  );
```

---

### Auth guard changes (`src/lib/entitlements/guard.ts`)

Extend `verifyBearerUser`:
```typescript
if (role === 'planner') {
    const plannerId = user.app_metadata?.plannerId as string | undefined;
    if (!plannerId) return { ok: false, status: 403, message: 'Missing plannerId in profile' };
    return { ok: true, user, isAdmin: false, isPlanner: true, plannerId };
}
```

New helper used by endpoints both roles can call:
```typescript
export async function requireAdminOrPlanner(request: Request): Promise<AuthGuardResult>
```

---

### API endpoint changes

| Endpoint | Change |
|---|---|
| `GET /api/admin/clients` | Filter users by `plannerId` from JWT when requester is planner |
| `POST /api/admin/create-client` | Stamp `planner_id` on new invitation from JWT |
| `GET/POST /api/admin/invitation` | Verify slug belongs to planner's portfolio |
| `GET /api/admin/client-entitlements` | Scope to planner's slugs |
| `GET/PUT /api/admin/schedule/[slug]` | Verify slug belongs to planner |
| `getAdminDashboardData` in `src/app/actions/admin.ts` | Filter by `plannerId` when caller is planner |

---

### Admin UI changes (`src/app/admin/page.tsx`)

- `checkAdminAuth` → also accept `role === 'planner'`; set `isPlanner` state
- Backend scoping handles client list and dashboard metrics — no extra frontend logic
- **New Planner Manager tab** (super-admin only) → `src/components/admin/PlannerManager.tsx`
  - Create planner accounts
  - Assign existing clients to planners
  - Only visible when `role === 'admin'`

---

### Migration sequence (when ready to ship)

1. Create `planners` table (new migration file)
2. Add nullable `planner_id` to `invitations`
3. Update RLS policies on all 8 affected tables
4. Extend `verifyBearerUser` + add `requireAdminOrPlanner` in `guard.ts`
5. Scope all admin API endpoints
6. Update `admin/page.tsx` to accept planner role + add PlannerManager tab
7. Update `login/page.tsx` for planner routing
8. Test: create test planner in Supabase, assign invitations, verify isolation

---

### Pre-ship checklist (Feature 2)

- [ ] Test planner user can only see their own clients
- [ ] Super admin still sees all clients across all planners
- [ ] Planner attempting to access another planner's slug → 403
- [ ] Existing clients (planner_id = NULL) visible only to super admin
- [ ] `tsc --noEmit` zero errors
- [ ] All existing RLS behavior for `client` role unchanged
