"use server";

import { db } from '@/db';
import { payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type SelectPayment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Fetches all payments for a specific expense, ordered by date.
 */
export async function getPaymentsByExpense(expenseId: string) {
    try {
        const data = await db.select()
            .from(payments)
            .where(eq(payments.expenseId, expenseId))
            .orderBy(payments.paymentDate);
        return data;
    } catch (error) {
        console.error("Error fetching payments:", error);
        throw new Error("Failed to fetch payments.");
    }
}

/**
 * Inserts a new payment for an expense.
 */
export async function addPayment(expenseId: string, slug: string, payload: { amount: number; paymentDate?: Date; receivedBy?: string; notes?: string }) {
    try {
        const [newPayment] = await db.insert(payments).values({
            expenseId,
            slug,
            amount: payload.amount,
            paymentDate: payload.paymentDate || new Date(),
            receivedBy: payload.receivedBy || '',
            notes: payload.notes || '',
        }).returning();

        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return newPayment;
    } catch (error) {
        console.error("Error adding payment:", error);
        throw new Error("Failed to add payment.");
    }
}

/**
 * Deletes a payment.
 */
export async function deletePayment(id: string) {
    try {
        await db.delete(payments).where(eq(payments.id, id));
        revalidatePath(`/dashboard`);
        revalidatePath(`/admin`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting payment:", error);
        throw new Error("Failed to delete payment.");
    }
}
