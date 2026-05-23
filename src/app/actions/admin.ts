"use server";

import { db } from '@/db';
import { invitations, subscriptions, expenses } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { verifyBearerUser } from '@/lib/entitlements/guard';

export type SubscriptionRecord = typeof subscriptions.$inferSelect;
export type SubscriptionPayload = {
    planTier: string;
    price: number;
    isPaid: boolean;
};

/**
 * One row per invitation, left-joined with its (optional) subscription.
 * If an invitation has no subscription yet, the subscription fields are null.
 */
export type AdminLedgerRow = {
    invitationId: number;
    slug: string;
    bride: string;
    groom: string;
    date: string | null;
    subscriptionId: string | null;
    planTier: string | null;
    price: number | null;
    isPaid: boolean | null;
};

export type AdminDashboardMetrics = {
    totalInvitations: number;
    totalRevenue: number;
    totalBudgetsTracked: number;
    basicCount: number;
    premiumCount: number;
    /** premium / totalInvitations as a 0-100 number; 0 when there are no invitations. */
    conversionRate: number;
};

export type AdminDashboardData = {
    rows: AdminLedgerRow[];
    metrics: AdminDashboardMetrics;
};

async function enforceAdmin(accessToken: string | undefined): Promise<void> {
    const auth = await verifyBearerUser(accessToken);
    if (!auth.ok) {
        throw new Error(auth.message);
    }
    if (!auth.isAdmin) {
        throw new Error('Admin only');
    }
}

export async function getAdminDashboardData(accessToken?: string): Promise<AdminDashboardData> {
    await enforceAdmin(accessToken);

    // Left join so invitations without a subscription still appear in the ledger.
    const joined = await db
        .select({
            invitationId: invitations.id,
            slug: invitations.slug,
            bride: invitations.bride,
            groom: invitations.groom,
            date: invitations.date,
            subscriptionId: subscriptions.id,
            planTier: subscriptions.planTier,
            price: subscriptions.price,
            isPaid: subscriptions.isPaid
        })
        .from(invitations)
        .leftJoin(subscriptions, eq(subscriptions.invitationId, invitations.id))
        .orderBy(invitations.createdAt);

    // Count of distinct slugs that have at least one expense — "budgets tracked".
    const budgetSlugs = await db
        .selectDistinct({ slug: expenses.slug })
        .from(expenses);

    const rows: AdminLedgerRow[] = joined.map((r) => ({
        invitationId: r.invitationId,
        slug: r.slug,
        bride: r.bride,
        groom: r.groom,
        date: r.date,
        subscriptionId: r.subscriptionId,
        planTier: r.planTier,
        price: r.price,
        isPaid: r.isPaid
    }));

    const totalInvitations = rows.length;
    const totalRevenue = rows.reduce((sum, r) => sum + (r.isPaid ? (r.price ?? 0) : 0), 0);
    const basicCount = rows.filter((r) => r.planTier === 'basic').length;
    const premiumCount = rows.filter((r) => r.planTier === 'premium').length;
    const conversionRate = totalInvitations === 0 ? 0 : (premiumCount / totalInvitations) * 100;

    return {
        rows,
        metrics: {
            totalInvitations,
            totalRevenue,
            totalBudgetsTracked: budgetSlugs.length,
            basicCount,
            premiumCount,
            conversionRate
        }
    };
}

/**
 * Upsert one subscription row. If `id` doesn't yet exist, the caller should pass `invitationId`
 * via `payload` (extended below) — but this signature follows the plan exactly: update only.
 * For inserts (no existing subscription yet), use upsertSubscriptionForInvitation.
 */
export async function updateSubscription(
    id: string,
    payload: SubscriptionPayload,
    accessToken?: string
): Promise<SubscriptionRecord> {
    await enforceAdmin(accessToken);

    const [updated] = await db
        .update(subscriptions)
        .set({
            planTier: payload.planTier,
            price: payload.price,
            isPaid: payload.isPaid,
            updatedAt: new Date()
        })
        .where(eq(subscriptions.id, id))
        .returning();

    if (!updated) {
        throw new Error('Subscription not found');
    }

    revalidatePath('/admin');
    return updated;
}

/**
 * Companion to updateSubscription: when an invitation has no subscription row yet,
 * the ledger row's `subscriptionId` is null and we need to insert. The admin dashboard
 * edit modal calls this when no row exists, otherwise calls updateSubscription.
 */
export async function upsertSubscriptionForInvitation(
    invitationId: number,
    payload: SubscriptionPayload,
    accessToken?: string
): Promise<SubscriptionRecord> {
    await enforceAdmin(accessToken);

    const [row] = await db
        .insert(subscriptions)
        .values({
            invitationId,
            planTier: payload.planTier,
            price: payload.price,
            isPaid: payload.isPaid
        })
        .onConflictDoUpdate({
            target: subscriptions.invitationId,
            set: {
                planTier: payload.planTier,
                price: payload.price,
                isPaid: payload.isPaid,
                updatedAt: sql`now()`
            }
        })
        .returning();

    revalidatePath('/admin');
    return row;
}
