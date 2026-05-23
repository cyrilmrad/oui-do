**Context:** We are building the Admin Dashboard for our wedding SaaS. We need to create a dedicated subscription table, backend actions, and the dashboard frontend view.

**Step 1: Drizzle Schema (`db/schema.ts`)**
Create a `subscriptions` table linked 1:1 with `invitations`:

* `id`: uuid, primary key, default random
* `invitationId`: uuid, references `invitations.id`, onDelete: cascade, unique
* `planTier`: varchar, default 'basic' (basic, premium)
* `price`: integer, default 0 (stored in absolute dollar amount)
* `isPaid`: boolean, default false
* Timestamps: `createdAt`, `updatedAt`

**Step 2: Server Actions (`app/actions/admin.ts`)**
Create secure, admin-only Server Actions:

1. `getAdminDashboardData()`: Uses Drizzle to join `invitations` and `subscriptions`. Fetches all records. Also returns calculated aggregate metrics: Total Live Invitations, Total Revenue (sum of `price` where `isPaid` is true), Total Budgets Count, and Count of Basic vs Premium plans.
2. `updateSubscription(id: string, payload: { planTier: string, price: number, isPaid: boolean })`: Updates the subscription record.

**Step 3: UI Implementation (`app/admin/page.tsx`)**
Build a premium, minimal dashboard interface using Tailwind (`stone` palette) consisting of two sections:

1. **The Pulse Row (Top Metrics):** 4 clean grid cards showing: Active Invitations, Total Revenue Realized, Total Budgets Tracked, and Conversion Rate (Percentage of premium vs total).
2. **The Master Ledger Table:** Columns for Event Name/Slug, Client Email, Plan Tier (with premium badge ✨), Invoice Amount, Payment Status (`Paid` in green, `Pending` in amber), and an "Edit" button.
3. **Inline/Modal Edit:** Clicking "Edit" allows changing the Plan Tier, Price, and Paid Status via a lightweight form that fires the `updateSubscription` action.


---

### ⚠️ A Quick RLS Reminder for the SQL Editor

Since you are creating a new table (`subscriptions`), don't forget to run this quick script in  Supabase to match the exact security architecture I configured for my entitlements:

```sql
-- Enable RLS on the new subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write to this table
CREATE POLICY "Admins have full access to subscriptions" 
ON public.subscriptions FOR ALL 
USING ( auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' )
WITH CHECK ( auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' );

```