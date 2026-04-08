import { db } from '@/db';
import { clientEntitlements } from '@/db/schema';
import type { FeatureKey } from '@/lib/features';
import { eq } from 'drizzle-orm';
import { getDefaultFeatureFlags } from '@/lib/entitlements/defaults';

export type EntitlementsPayload = {
    slug: string;
    features: Record<FeatureKey, boolean>;
};

function rowToFeatures(row: typeof clientEntitlements.$inferSelect): Record<FeatureKey, boolean> {
    return {
        guests: row.guestsEnabled,
        messages: row.messagesEnabled,
        budget: row.budgetEnabled,
        seating: row.seatingEnabled,
        settings: row.settingsEnabled
    };
}

export async function getClientEntitlementsBySlug(slug: string): Promise<EntitlementsPayload> {
    const rows = await db.select().from(clientEntitlements).where(eq(clientEntitlements.slug, slug)).limit(1);
    if (rows.length === 0) {
        return { slug, features: getDefaultFeatureFlags() };
    }
    return { slug, features: rowToFeatures(rows[0]) };
}

export async function getAllClientEntitlements() {
    const rows = await db.select().from(clientEntitlements);
    return rows;
}

export async function upsertClientEntitlements(
    slug: string,
    flags: Partial<Record<FeatureKey, boolean>>
) {
    const defaults = getDefaultFeatureFlags();
    const existing = await db.select().from(clientEntitlements).where(eq(clientEntitlements.slug, slug)).limit(1);

    const merged = existing[0]
        ? {
              guestsEnabled: flags.guests ?? existing[0].guestsEnabled,
              messagesEnabled: flags.messages ?? existing[0].messagesEnabled,
              budgetEnabled: flags.budget ?? existing[0].budgetEnabled,
              seatingEnabled: flags.seating ?? existing[0].seatingEnabled,
              settingsEnabled: flags.settings ?? existing[0].settingsEnabled
          }
        : {
              guestsEnabled: flags.guests ?? defaults.guests,
              messagesEnabled: flags.messages ?? defaults.messages,
              budgetEnabled: flags.budget ?? defaults.budget,
              seatingEnabled: flags.seating ?? defaults.seating,
              settingsEnabled: flags.settings ?? defaults.settings
          };

    if (existing[0]) {
        await db
            .update(clientEntitlements)
            .set({ ...merged, updatedAt: new Date() })
            .where(eq(clientEntitlements.slug, slug));
    } else {
        await db.insert(clientEntitlements).values({
            slug,
            ...merged
        });
    }

    return getClientEntitlementsBySlug(slug);
}

export async function assertFeatureEnabled(slug: string, feature: FeatureKey): Promise<void> {
    const { features } = await getClientEntitlementsBySlug(slug);
    if (!features[feature]) {
        const err = new Error(`FEATURE_DISABLED:${feature}`);
        (err as Error & { statusCode?: number }).statusCode = 403;
        throw err;
    }
}
