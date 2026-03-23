"use server";

import { db } from '@/db';
import { seatingTables, guests } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type SelectSeatingTable = typeof seatingTables.$inferSelect;
export type InsertSeatingTable = typeof seatingTables.$inferInsert;
export type SelectGuest = typeof guests.$inferSelect;

/**
 * Fetches all seating tables and non-declined guests for a given slug.
 */
export async function getSeatingData(slug: string) {
    try {
        // Get the invitation ID for this slug
        const { invitations } = await import('@/db/schema');
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

        // Only fetch attending or pending guests (exclude declined)
        const guestsData = await db.select()
            .from(guests)
            .where(and(
                eq(guests.invitationId, invitation.id),
                ne(guests.status, 'declined')
            ))
            .orderBy(guests.createdAt);

        return { tables: tablesData, guests: guestsData };
    } catch (error) {
        console.error("Error fetching seating data:", error);
        throw new Error("Failed to fetch seating data.");
    }
}

/**
 * Creates a new seating table for a given event.
 */
export async function createTable(slug: string, payload: { name: string; capacity: number; shape?: string }) {
    try {
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

/**
 * Updates an existing seating table (name, capacity, shape).
 */
export async function updateTable(id: string, payload: Partial<InsertSeatingTable>) {
    try {
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

/**
 * Deletes a seating table. Guests' tableId will be set to null via onDelete cascade.
 */
export async function deleteTable(id: string) {
    try {
        await db.delete(seatingTables).where(eq(seatingTables.id, id));
        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting table:", error);
        throw new Error("Failed to delete seating table.");
    }
}

/**
 * Assigns a guest to a table (or un-assigns if tableId is null).
 */
export async function assignGuestToTable(guestId: string, tableId: string | null) {
    try {
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
