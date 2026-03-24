"use client";

import React, { useState, useMemo } from 'react';
import { SelectExpense } from '@/app/actions/budget';
import { Trash2, Plus, DollarSign, Calculator, LineChart, Wallet } from 'lucide-react';
import { addExpense, updateExpense, deleteExpense } from '@/app/actions/budget';
import PaymentModal from '@/components/PaymentModal';

interface BudgetTrackerProps {
    slug: string;
    initialExpenses: SelectExpense[];
    isAdmin?: boolean;
}

export default function BudgetTracker({ slug, initialExpenses, isAdmin = false }: BudgetTrackerProps) {
    const [expenses, setExpenses] = useState<SelectExpense[]>(initialExpenses);
    const [isSaving, setIsSaving] = useState(false);

    // Payment Modal State
    const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; expenseId: string; expenseName: string; actualCost: number }>({
        isOpen: false,
        expenseId: '',
        expenseName: '',
        actualCost: 0,
    });

    // Calculate Summary Totals
    const { estimatedTotal, actualTotal, difference } = useMemo(() => {
        let est = 0;
        let act = 0;
        expenses.forEach(exp => {
            if (exp.isIncluded) {
                est += exp.estimatedCost || 0;
                act += exp.actualCost || 0;
            }
        });
        return {
            estimatedTotal: est,
            actualTotal: act,
            difference: act - est
        };
    }, [expenses]);

    // Format currency helper
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Generic cell change handler (local state immediately)
    const handleChange = (id: string, field: keyof SelectExpense, value: any) => {
        setExpenses(prev => prev.map(exp => {
            if (exp.id === id) {
                return { ...exp, [field]: value };
            }
            return exp;
        }));
    };

    // Trigger database update on blur
    const handleBlur = async (id: string, field: keyof SelectExpense, value: any) => {
        setIsSaving(true);
        try {
            await updateExpense(id, { [field]: value });
        } catch (error) {
            console.error("Failed to update expense", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Toggle inclusion directly fires update
    const handleToggleInclusion = async (id: string, currentValue: boolean) => {
        const newValue = !currentValue;
        handleChange(id, 'isIncluded', newValue);
        setIsSaving(true);
        try {
            await updateExpense(id, { isIncluded: newValue });
        } catch (error) {
            console.error("Failed to toggle inclusion", error);
            // Revert on fail
            handleChange(id, 'isIncluded', currentValue);
        } finally {
            setIsSaving(false);
        }
    };

    // Add empty row
    const handleAddExpense = async () => {
        setIsSaving(true);
        try {
            const newExpense = await addExpense(slug, {
                category: 'New Category',
                supplier: '',
                description: '',
                estimatedCost: 0,
                actualCost: 0,
                notes: '',
                isIncluded: true,
            });
            setExpenses(prev => [...prev, newExpense]);
        } catch (error) {
            console.error("Failed to add expense", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Drop row
    const handleDeleteExpense = async (id: string) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this expense?");
        if (!confirmDelete) return;

        // Optimistically remove
        const previousExpenses = [...expenses];
        setExpenses(prev => prev.filter(e => e.id !== id));

        try {
            await deleteExpense(id);
        } catch (error) {
            console.error("Failed to delete expense", error);
            // Revert on fail
            setExpenses(previousExpenses);
        }
    };

    return (
        <div className="w-full flex justify-center animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="w-full max-w-7xl">

                {/* Header & Summary Cards */}
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h2 className="text-3xl font-serif text-stone-900 mb-2">Budget Tracker</h2>
                            <p className="text-sm text-stone-500 font-light">Monitor your event expenses in real-time. Changes are saved automatically.</p>
                        </div>
                        {isSaving && (
                            <div className="flex items-center text-xs text-stone-400 font-mono animate-pulse">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></div> Saving...
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Estimated Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-stone-100 flex items-center justify-between group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all">
                            <div>
                                <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">Estimated Total</p>
                                <p className="text-3xl font-serif text-stone-900">{formatCurrency(estimatedTotal)}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Calculator className="w-5 h-5 text-stone-600" />
                            </div>
                        </div>

                        {/* Actual Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-stone-100 flex items-center justify-between group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all">
                            <div>
                                <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">Actual Total</p>
                                <p className="text-3xl font-serif text-stone-900">{formatCurrency(actualTotal)}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <DollarSign className="w-5 h-5 text-stone-600" />
                            </div>
                        </div>

                        {/* Difference Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-stone-100 flex items-center justify-between group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all">
                            <div>
                                <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">Difference</p>
                                <p className={`text-3xl font-serif ${difference > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${difference > 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                                <LineChart className={`w-5 h-5 ${difference > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Spreadsheet Table */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-stone-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-stone-50 text-xs uppercase tracking-widest font-semibold text-stone-500 border-b border-stone-100">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">Inc</th>
                                    <th className="px-6 py-4 w-48">Category</th>
                                    <th className="px-6 py-4 w-48">Supplier</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4 w-36 text-right">Estimated</th>
                                    <th className="px-6 py-4 w-36 text-right">Actual</th>
                                    <th className="px-6 py-4">Notes</th>
                                    <th className="px-6 py-4 w-20 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 text-stone-800">
                                {expenses.map((expense) => (
                                    <tr key={expense.id} className="group hover:bg-stone-50/50 transition-colors">
                                        <td className="px-6 py-3 text-center align-middle">
                                            <div className="relative inline-flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={expense.isIncluded || false}
                                                    onChange={() => handleToggleInclusion(expense.id, expense.isIncluded || false)}
                                                    className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer appearance-none bg-white checked:bg-emerald-600 checked:border-transparent transition-all"
                                                />
                                                {expense.isIncluded && (
                                                    <svg className="w-3 h-3 text-white absolute pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                value={expense.category || ''}
                                                onChange={(e) => handleChange(expense.id, 'category', e.target.value)}
                                                onBlur={(e) => handleBlur(expense.id, 'category', e.target.value)}
                                                className={`w-full bg-transparent px-2 py-1.5 focus:outline-none focus:bg-white focus:ring-1 focus:ring-stone-200 rounded transition-all font-medium ${!expense.isIncluded ? 'opacity-40 line-through' : ''}`}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                value={expense.supplier || ''}
                                                onChange={(e) => handleChange(expense.id, 'supplier', e.target.value)}
                                                onBlur={(e) => handleBlur(expense.id, 'supplier', e.target.value)}
                                                placeholder="Supplier name"
                                                className={`w-full bg-transparent px-2 py-1.5 focus:outline-none focus:bg-white focus:ring-1 focus:ring-stone-200 rounded transition-all ${!expense.isIncluded ? 'opacity-40' : ''}`}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                value={expense.description || ''}
                                                onChange={(e) => handleChange(expense.id, 'description', e.target.value)}
                                                onBlur={(e) => handleBlur(expense.id, 'description', e.target.value)}
                                                placeholder="Details..."
                                                className={`w-full bg-transparent px-2 py-1.5 min-w-[200px] focus:outline-none focus:bg-white focus:ring-1 focus:ring-stone-200 rounded transition-all ${!expense.isIncluded ? 'opacity-40' : ''}`}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="relative flex items-center">
                                                <span className="absolute left-2 text-stone-400 pointer-events-none">$</span>
                                                <input
                                                    type="number"
                                                    value={expense.estimatedCost || ''}
                                                    onChange={(e) => handleChange(expense.id, 'estimatedCost', parseInt(e.target.value) || 0)}
                                                    onBlur={(e) => handleBlur(expense.id, 'estimatedCost', parseInt(e.target.value) || 0)}
                                                    className={`w-full bg-transparent pl-6 pr-2 py-1.5 focus:outline-none focus:bg-white focus:ring-1 focus:ring-stone-200 rounded text-right transition-all font-mono text-sm tracking-wide ${!expense.isIncluded ? 'opacity-40' : ''}`}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="relative flex items-center">
                                                <span className="absolute left-2 text-stone-400 pointer-events-none">$</span>
                                                <input
                                                    type="number"
                                                    value={expense.actualCost || ''}
                                                    onChange={(e) => handleChange(expense.id, 'actualCost', parseInt(e.target.value) || 0)}
                                                    onBlur={(e) => handleBlur(expense.id, 'actualCost', parseInt(e.target.value) || 0)}
                                                    className={`w-full bg-transparent pl-6 pr-2 py-1.5 focus:outline-none focus:bg-white focus:ring-1 focus:ring-stone-200 rounded text-right transition-all font-mono text-sm tracking-wide ${!expense.isIncluded ? 'opacity-40' : ''}`}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                value={expense.notes || ''}
                                                onChange={(e) => handleChange(expense.id, 'notes', e.target.value)}
                                                onBlur={(e) => handleBlur(expense.id, 'notes', e.target.value)}
                                                placeholder="Add a note"
                                                className="w-full bg-transparent px-2 py-1.5 min-w-[150px] focus:outline-none focus:bg-white focus:ring-1 focus:ring-stone-200 rounded transition-all italic text-stone-500 text-xs"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => setPaymentModal({
                                                        isOpen: true,
                                                        expenseId: expense.id,
                                                        expenseName: `${expense.category}${expense.supplier ? ` — ${expense.supplier}` : ''}`,
                                                        actualCost: expense.actualCost || 0,
                                                    })}
                                                    className="text-stone-300 hover:text-stone-700 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-md hover:bg-stone-100"
                                                    title="View payments"
                                                >
                                                    <Wallet className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteExpense(expense.id)}
                                                    className="text-stone-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-md hover:bg-rose-50"
                                                    title="Delete this expense"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {expenses.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-stone-400 font-light text-sm">
                                            No expenses tracked yet. Click below to add your first budget item.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-stone-50/50 p-4 border-t border-stone-100">
                        <button
                            onClick={handleAddExpense}
                            className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors px-3 py-2 rounded-md hover:bg-stone-100"
                        >
                            <Plus className="w-4 h-4" /> Add Expense
                        </button>
                    </div>
                </div>

            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={paymentModal.isOpen}
                onClose={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
                expenseId={paymentModal.expenseId}
                expenseName={paymentModal.expenseName}
                actualCost={paymentModal.actualCost}
                slug={slug}
                isAdmin={isAdmin}
            />
        </div>
    );
}
