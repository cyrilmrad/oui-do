"use server";

import { db } from '@/db';
import { expenses, payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { enforceSlugFeature } from '@/lib/entitlements/guard';

export type SelectPayment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

export async function getPaymentsByExpense(expenseId: string, accessToken?: string) {
    try {
        const [exp] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
        if (!exp) {
            throw new Error("Expense not found.");
        }
        await enforceSlugFeature(exp.slug, 'budget', accessToken);

        const data = await db
            .select()
            .from(payments)
            .where(eq(payments.expenseId, expenseId))
            .orderBy(payments.paymentDate);
        return data;
    } catch (error) {
        console.error("Error fetching payments:", error);
        throw new Error("Failed to fetch payments.");
    }
}

export async function addPayment(
    expenseId: string,
    slug: string,
    payload: { amount: number; paymentDate?: Date; receivedBy?: string; notes?: string },
    accessToken?: string
) {
    try {
        await enforceSlugFeature(slug, 'budget', accessToken);

        const [newPayment] = await db
            .insert(payments)
            .values({
                expenseId,
                slug,
                amount: payload.amount,
                paymentDate: payload.paymentDate || new Date(),
                receivedBy: payload.receivedBy || '',
                notes: payload.notes || ''
            })
            .returning();

        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return newPayment;
    } catch (error) {
        console.error("Error adding payment:", error);
        throw new Error("Failed to add payment.");
    }
}

export async function deletePayment(id: string, accessToken?: string) {
    try {
        const [row] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
        if (!row) throw new Error("Payment not found.");
        await enforceSlugFeature(row.slug, 'budget', accessToken);

        await db.delete(payments).where(eq(payments.id, id));
        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting payment:", error);
        throw new Error("Failed to delete payment.");
    }
}
