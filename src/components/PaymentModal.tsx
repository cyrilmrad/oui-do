"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { X, Plus, Trash2, Wallet, Loader2, Calendar, Banknote, Landmark } from 'lucide-react';
import { getPaymentsByExpense, addPayment, deletePayment } from '@/app/actions/payments';
import type { SelectPayment } from '@/app/actions/payments';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    expenseId: string;
    expenseName: string;
    actualCost: number;
    slug: string;
    isAdmin: boolean;
}

export default function PaymentModal({
    isOpen,
    onClose,
    expenseId,
    expenseName,
    actualCost,
    slug,
    isAdmin,
}: PaymentModalProps) {
    const [payments, setPayments] = useState<SelectPayment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // Form state
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [receivedBy, setReceivedBy] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen && expenseId) {
            setIsLoading(true);
            getPaymentsByExpense(expenseId)
                .then(data => setPayments(data))
                .catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, expenseId]);

    if (!isOpen) return null;

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = actualCost - totalPaid;

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

    const formatDate = (d: Date | string | null) => {
        if (!d) return '—';
        const date = new Date(d);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleAdd = () => {
        const parsedAmount = parseInt(amount);
        if (!parsedAmount || parsedAmount <= 0) return;

        startTransition(async () => {
            try {
                const newPayment = await addPayment(expenseId, slug, {
                    amount: parsedAmount,
                    paymentDate: new Date(paymentDate),
                    receivedBy: receivedBy.trim(),
                    notes: notes.trim(),
                });
                setPayments(prev => [...prev, newPayment]);
                setAmount('');
                setReceivedBy('');
                setNotes('');
                setPaymentDate(new Date().toISOString().split('T')[0]);
            } catch (error) {
                console.error('Failed to add payment:', error);
            }
        });
    };

    const handleDelete = (paymentId: string) => {
        setPayments(prev => prev.filter(p => p.id !== paymentId));
        startTransition(async () => {
            try {
                await deletePayment(paymentId);
            } catch (error) {
                console.error('Failed to delete payment:', error);
            }
        });
    };

    const paidPercent = actualCost > 0 ? Math.min((totalPaid / actualCost) * 100, 100) : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 flex flex-col max-h-full">
                
                {/* Header & Main Summary */}
                <div className="px-8 pt-8 pb-6 border-b border-stone-100 bg-white z-10">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center shadow-md">
                                <Wallet className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-serif font-medium text-stone-900 leading-tight">Payment Ledger</h2>
                                <p className="text-stone-500 text-sm mt-0.5 font-medium">{expenseName}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors bg-stone-50">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Progress Card */}
                    <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200/60 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-stone-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-end mb-4 relative z-10">
                            <div>
                                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Total Paid</p>
                                <p className="text-3xl font-mono font-semibold text-stone-900 tracking-tight">{formatCurrency(totalPaid)}</p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Remaining</p>
                                <p className={`text-xl font-mono tracking-tight font-medium ${remaining <= 0 ? 'text-emerald-500' : 'text-stone-600'}`}>
                                    {formatCurrency(Math.max(remaining, 0))}
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 mt-2">
                            <div className="h-3 w-full bg-stone-200/80 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${paidPercent >= 100 ? 'bg-emerald-500' : 'bg-stone-900'}`}
                                    style={{ width: `${paidPercent}%` }}
                                />
                            </div>
                            <div className="mt-2 text-right">
                                <span className="text-xs font-medium text-stone-500">Goal: {formatCurrency(actualCost)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area (Scrollable) */}
                <div className="flex-1 overflow-y-auto bg-stone-50/50">
                    
                    {/* Payment History List */}
                    <div className="px-8 py-6">
                        <h3 className="text-sm font-bold text-stone-900 mb-4 tracking-tight flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-stone-400" />
                            Transaction History
                        </h3>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-stone-300 mb-2" />
                                <p className="text-sm text-stone-500">Loading ledger...</p>
                            </div>
                        ) : payments.length === 0 ? (
                            <div className="text-center py-12 px-6 bg-white rounded-2xl border border-stone-200 border-dashed">
                                <Banknote className="w-10 h-10 mx-auto text-stone-300 mb-3" />
                                <p className="text-stone-900 font-medium mb-1">No transactions yet</p>
                                <p className="text-sm text-stone-500">
                                    {isAdmin ? "Record your first payment installment below." : "You have no recorded payments for this expense."}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {payments.map((payment, idx) => (
                                    <div key={payment.id} className="group bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all duration-200 hover:border-stone-300 overflow-hidden">
                                        
                                        {/* Date Tag */}
                                        <div className="flex flex-col justify-center items-start bg-stone-50 rounded-xl p-3 w-32 shrink-0 border border-stone-100">
                                            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Date</span>
                                            <span className="text-sm font-semibold text-stone-800">{formatDate(payment.paymentDate)}</span>
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg font-mono font-bold text-stone-900">{formatCurrency(payment.amount)}</span>
                                            </div>
                                            {(payment.receivedBy || payment.notes) && (
                                                <div className="flex items-center gap-1.5 text-sm text-stone-500 mt-1">
                                                    {payment.receivedBy && <><Landmark className="w-3.5 h-3.5 text-stone-400"/><span className="truncate">{payment.receivedBy}</span></>}
                                                    {payment.receivedBy && payment.notes && <span className="text-stone-300 px-1">•</span>}
                                                    {payment.notes && <span className="truncate text-stone-600 italic">{payment.notes}</span>}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleDelete(payment.id)}
                                                className="p-3 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all ml-auto shrink-0"
                                                title="Delete payment"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Spacer for bottom if admin form is visible */}
                    {isAdmin && <div className="h-4" />}
                </div>

                {/* Admin Add Payment Form - Completely Restyled */}
                {isAdmin && (
                    <div className="bg-stone-900 border-t border-stone-800 p-8 z-20 shrink-0">
                        <div className="flex items-center gap-2 mb-6">
                            <Plus className="w-5 h-5 text-stone-400" />
                            <h3 className="text-base font-semibold text-white tracking-wide">Record New Payment</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                            {/* Amount Input (Flex wrapper prevents overlap) */}
                            <div>
                                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Amount</label>
                                <div className="flex items-center bg-stone-950 border border-stone-700/50 rounded-xl px-4 focus-within:ring-2 focus-within:ring-stone-500 focus-within:border-stone-600 transition-all shadow-inner group">
                                    <span className="text-stone-500 font-medium text-lg leading-none group-focus-within:text-stone-300 transition-colors">$</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-transparent py-3.5 px-3 text-lg font-mono text-white placeholder:text-stone-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Date Input */}
                            <div>
                                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Date</label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={e => setPaymentDate(e.target.value)}
                                    className="w-full bg-stone-950 border border-stone-700/50 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-600 transition-all shadow-inner"
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>

                            {/* Received By */}
                            <div>
                                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Received By</label>
                                <input
                                    type="text"
                                    value={receivedBy}
                                    onChange={e => setReceivedBy(e.target.value)}
                                    placeholder="e.g. Bank Transfer, Venmo"
                                    className="w-full bg-stone-950 border border-stone-700/50 rounded-xl px-4 py-3.5 text-white placeholder:text-stone-500 outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-600 transition-all shadow-inner"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Notes</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Optional details..."
                                    className="w-full bg-stone-950 border border-stone-700/50 rounded-xl px-4 py-3.5 text-white placeholder:text-stone-500 outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-600 transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleAdd}
                            disabled={!amount || parseInt(amount) <= 0 || isPending}
                            className="w-full bg-white hover:bg-stone-200 disabled:opacity-50 disabled:hover:bg-white text-stone-900 font-bold py-4 px-6 rounded-xl transition-all shadow-lg text-sm sm:text-base flex items-center justify-center gap-2 group"
                        >
                            {isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin text-stone-600" />
                            ) : (
                                <>
                                    <span>Add Payment into Ledger</span>
                                    <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
