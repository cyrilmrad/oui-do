"use server";

import { db } from '@/db';
import { expenses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { enforceSlugFeature } from '@/lib/entitlements/guard';

export type InsertExpense = typeof expenses.$inferInsert;
export type SelectExpense = typeof expenses.$inferSelect;

export async function getExpensesBySlug(slug: string, accessToken?: string) {
    try {
        await enforceSlugFeature(slug, 'budget', accessToken);
        const data = await db
            .select()
            .from(expenses)
            .where(eq(expenses.slug, slug))
            .orderBy(expenses.createdAt);
        return data;
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.startsWith('FEATURE_DISABLED:')) {
            return [];
        }
        console.error("Error fetching expenses:", error);
        throw new Error("Failed to fetch expenses from the database.");
    }
}

export async function addExpense(slug: string, payload: Partial<InsertExpense>, accessToken?: string) {
    try {
        await enforceSlugFeature(slug, 'budget', accessToken);
        const [newExpense] = await db
            .insert(expenses)
            .values({
                ...payload,
                slug
            } as InsertExpense)
            .returning();

        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return newExpense;
    } catch (error) {
        console.error("Error adding expense:", error);
        throw new Error("Failed to add expense safely.");
    }
}

export async function updateExpense(id: string, payload: Partial<InsertExpense>, accessToken?: string) {
    try {
        const [existing] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
        if (!existing) {
            throw new Error("Expense not found.");
        }
        await enforceSlugFeature(existing.slug, 'budget', accessToken);

        const [updatedExpense] = await db
            .update(expenses)
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

export async function deleteExpense(id: string, accessToken?: string) {
    try {
        const [existing] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
        if (!existing) {
            throw new Error("Expense not found.");
        }
        await enforceSlugFeature(existing.slug, 'budget', accessToken);

        await db.delete(expenses).where(eq(expenses.id, id));
        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting expense:", error);
        throw new Error("Failed to drop expense from the database.");
    }
}
