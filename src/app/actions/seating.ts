"use server";

import { db } from '@/db';
import { seatingTables, guests, invitations } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { enforceSlugFeature } from '@/lib/entitlements/guard';

export type SelectSeatingTable = typeof seatingTables.$inferSelect;
export type InsertSeatingTable = typeof seatingTables.$inferInsert;
export type SelectGuest = typeof guests.$inferSelect;

export async function getSeatingData(slug: string, accessToken?: string) {
    try {
        await enforceSlugFeature(slug, 'seating', accessToken);

        const [invitation] = await db.select({ id: invitations.id })
            .from(invitations)
            .where(eq(invitations.slug, slug));

        if (!invitation) {
            return { tables: [], guests: [] };
        }

        const tablesData = await db.select()
            .from(seatingTables)
            .where(eq(seatingTables.slug, slug))
            .orderBy(seatingTables.createdAt);

        const guestsData = await db.select()
            .from(guests)
            .where(and(
                eq(guests.invitationId, invitation.id),
                ne(guests.status, 'declined')
            ))
            .orderBy(guests.createdAt);

        return { tables: tablesData, guests: guestsData };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.startsWith('FEATURE_DISABLED:')) {
            return { tables: [], guests: [] };
        }
        console.error("Error fetching seating data:", error);
        throw new Error("Failed to fetch seating data.");
    }
}

export async function createTable(
    slug: string,
    payload: { name: string; capacity: number; shape?: string },
    accessToken?: string
) {
    try {
        await enforceSlugFeature(slug, 'seating', accessToken);
        const [newTable] = await db.insert(seatingTables).values({
            slug,
            name: payload.name,
            capacity: payload.capacity,
            shape: payload.shape || 'round',
        }).returning();

        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return newTable;
    } catch (error) {
        console.error("Error creating table:", error);
        throw new Error("Failed to create seating table.");
    }
}

export async function updateTable(id: string, payload: Partial<InsertSeatingTable>, accessToken?: string) {
    try {
        const [existing] = await db.select().from(seatingTables).where(eq(seatingTables.id, id)).limit(1);
        if (!existing) throw new Error("Table not found.");
        await enforceSlugFeature(existing.slug, 'seating', accessToken);

        const [updated] = await db.update(seatingTables)
            .set({ ...payload, updatedAt: new Date() })
            .where(eq(seatingTables.id, id))
            .returning();

        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return updated;
    } catch (error) {
        console.error("Error updating table:", error);
        throw new Error("Failed to update seating table.");
    }
}

export async function deleteTable(id: string, accessToken?: string) {
    try {
        const [existing] = await db.select().from(seatingTables).where(eq(seatingTables.id, id)).limit(1);
        if (!existing) throw new Error("Table not found.");
        await enforceSlugFeature(existing.slug, 'seating', accessToken);

        await db.delete(seatingTables).where(eq(seatingTables.id, id));
        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting table:", error);
        throw new Error("Failed to delete seating table.");
    }
}

export async function assignGuestToTable(guestId: string, tableId: string | null, accessToken?: string) {
    try {
        const [guestRow] = await db.select().from(guests).where(eq(guests.id, guestId)).limit(1);
        if (!guestRow) throw new Error("Guest not found.");
        const [inv] = await db.select().from(invitations).where(eq(invitations.id, guestRow.invitationId)).limit(1);
        if (!inv) throw new Error("Invitation not found.");
        await enforceSlugFeature(inv.slug, 'seating', accessToken);

        const [updated] = await db.update(guests)
            .set({ tableId, updatedAt: new Date() })
            .where(eq(guests.id, guestId))
            .returning();

        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return updated;
    } catch (error) {
        console.error("Error assigning guest to table:", error);
        throw new Error("Failed to assign guest to table.");
    }
}
