"use server";

import { db } from '@/db';
import { expenses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type InsertExpense = typeof expenses.$inferInsert;
export type SelectExpense = typeof expenses.$inferSelect;

/**
 * Fetches all expenses for a specific event, ordered by creation date.
 */
export async function getExpensesBySlug(slug: string) {
    try {
        const data = await db.select()
            .from(expenses)
            .where(eq(expenses.slug, slug))
            .orderBy(expenses.createdAt);
        return data;
    } catch (error) {
        console.error("Error fetching expenses:", error);
        throw new Error("Failed to fetch expenses from the database.");
    }
}

/**
 * Inserts a new expense row for a given event.
 */
export async function addExpense(slug: string, payload: Partial<InsertExpense>) {
    try {
        const [newExpense] = await db.insert(expenses).values({
            ...payload,
            slug,
        } as InsertExpense).returning();

        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return newExpense;
    } catch (error) {
        console.error("Error adding expense:", error);
        throw new Error("Failed to add expense safely.");
    }
}

/**
 * Updates an existing expense row (e.g., actualCost or supplier).
 */
export async function updateExpense(id: string, payload: Partial<InsertExpense>) {
    try {
        const [updatedExpense] = await db.update(expenses)
            .set({ ...payload, updatedAt: new Date() })
            .where(eq(expenses.id, id))
            .returning();

        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return updatedExpense;
    } catch (error) {
        console.error("Error updating expense:", error);
        throw new Error("Failed to update the specified expense.");
    }
}

/**
 * Deletes an expense entirely.
 */
export async function deleteExpense(id: string) {
    try {
        await db.delete(expenses).where(eq(expenses.id, id));
        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting expense:", error);
        throw new Error("Failed to drop expense from the database.");
    }
}
