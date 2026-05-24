"use client";

import React, { useMemo, useState } from 'react';
import { Sparkles, X, Loader2, Mail, Receipt, Calculator, TrendingUp, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminDashboardData, AdminLedgerRow, SubscriptionPayload } from '@/app/actions/admin';

interface AdminClient {
    id: string;
    slug: string;
    email?: string | null;
    bride?: string | null;
    groom?: string | null;
}

interface DashboardOverviewProps {
    data: AdminDashboardData | null;
    loading: boolean;
    clients: AdminClient[];
    onSaveSubscription: (row: AdminLedgerRow, payload: SubscriptionPayload) => Promise<void>;
}

type EditState = {
    row: AdminLedgerRow;
    draft: SubscriptionPayload;
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

/**
 * Admin dashboard overview — metric cards + master ledger of all invitations + their subscriptions.
 * Visually leans on the stone/emerald palette (client-dashboard side) per the plan, deliberately
 * different from the surrounding admin shell's forest tokens.
 */
export function DashboardOverview({ data, loading, clients, onSaveSubscription }: DashboardOverviewProps) {
    const [edit, setEdit] = useState<EditState | null>(null);
    const [saving, setSaving] = useState(false);

    const emailBySlug = useMemo(() => {
        const map = new Map<string, string>();
        for (const c of clients) {
            if (c.email) map.set(c.slug, c.email);
        }
        return map;
    }, [clients]);

    const rows = data?.rows ?? [];
    const metrics = data?.metrics;

    const handleSave = async () => {
        if (!edit) return;
        setSaving(true);
        try {
            await onSaveSubscription(edit.row, edit.draft);
            toast.success("Subscription updated", {
                description: `${edit.row.bride} & ${edit.row.groom} · ${edit.draft.planTier}`
            });
            setEdit(null);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Update failed';
            toast.error("Failed to update subscription", { description: message });
        } finally {
            setSaving(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center text-stone-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Loading dashboard…</span>
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-y-auto bg-stone-50/40">
            <div className="max-w-[1600px] mx-auto px-8 md:px-12 lg:px-16 py-10 md:py-14">
                <header className="mb-12">
                    <span className="font-label uppercase tracking-[0.2em] text-[0.7rem] font-semibold text-stone-500 mb-3 block">Operations Overview</span>
                    <h1 className="font-serif text-[3rem] leading-tight text-stone-900">Dashboard</h1>
                    <p className="mt-3 text-sm text-stone-500 max-w-xl">
                        Pulse of every active invitation, billing tier, and revenue realized to date.
                    </p>
                </header>

                {/* The Pulse Row */}
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-12">
                    <MetricCard
                        label="Active Invitations"
                        value={metrics ? String(metrics.totalInvitations) : '—'}
                        Icon={Mail}
                        accentClass="bg-stone-100 text-stone-700"
                    />
                    <MetricCard
                        label="Revenue Realized"
                        value={metrics ? formatCurrency(metrics.totalRevenue) : '—'}
                        Icon={Receipt}
                        accentClass="bg-emerald-50 text-emerald-700"
                        hint={metrics ? `${metrics.basicCount} basic · ${metrics.premiumCount} premium` : undefined}
                    />
                    <MetricCard
                        label="Budgets Tracked"
                        value={metrics ? String(metrics.totalBudgetsTracked) : '—'}
                        Icon={Calculator}
                        accentClass="bg-amber-50 text-amber-700"
                    />
                    <MetricCard
                        label="Conversion Rate"
                        value={metrics ? `${metrics.conversionRate.toFixed(1)}%` : '—'}
                        Icon={TrendingUp}
                        accentClass="bg-stone-900 text-white"
                        hint={metrics ? `${metrics.premiumCount} premium of ${metrics.totalInvitations}` : undefined}
                    />
                </section>

                {/* Master Ledger */}
                <section className="bg-white rounded-2xl shadow-sm border border-stone-200/70 overflow-hidden">
                    <div className="px-6 py-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <h2 className="font-serif text-xl text-stone-900">Master Ledger</h2>
                            <p className="text-xs text-stone-500 mt-1">All invitations with current subscription state.</p>
                        </div>
                        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-stone-400">
                            {rows.length} record{rows.length === 1 ? '' : 's'}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-stone-50/60 border-b border-stone-100">
                                    <th className="px-6 py-3.5 text-[0.65rem] font-semibold text-stone-500 uppercase tracking-widest">Event</th>
                                    <th className="px-6 py-3.5 text-[0.65rem] font-semibold text-stone-500 uppercase tracking-widest">Client</th>
                                    <th className="px-6 py-3.5 text-[0.65rem] font-semibold text-stone-500 uppercase tracking-widest">Plan</th>
                                    <th className="px-6 py-3.5 text-[0.65rem] font-semibold text-stone-500 uppercase tracking-widest text-right">Invoice</th>
                                    <th className="px-6 py-3.5 text-[0.65rem] font-semibold text-stone-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-3.5 text-[0.65rem] font-semibold text-stone-500 uppercase tracking-widest text-right">&nbsp;</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center text-sm text-stone-400 italic">
                                            No invitations yet.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => {
                                        const email = emailBySlug.get(row.slug);
                                        const tier = row.planTier ?? 'basic';
                                        const isPremium = tier === 'premium';
                                        const price = row.price ?? 0;
                                        const paid = !!row.isPaid;

                                        return (
                                            <tr key={row.invitationId} className="hover:bg-stone-50/60 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-serif text-stone-900">{row.bride} &amp; {row.groom}</div>
                                                    <div className="text-[0.7rem] text-stone-400 mt-0.5 tracking-wider">/{row.slug}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-700">
                                                    {email ?? <span className="text-stone-400 italic">—</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {isPremium ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-900 text-stone-50">
                                                            <Sparkles className="w-3 h-3" aria-hidden />
                                                            Premium
                                                        </span>
                                                    ) : row.subscriptionId === null ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500 border border-stone-200 italic">
                                                            Unassigned
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
                                                            Basic
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-serif text-stone-900 tabular-nums">
                                                    {row.subscriptionId === null ? <span className="text-stone-400">—</span> : formatCurrency(price)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {row.subscriptionId === null ? (
                                                        <span className="text-xs text-stone-400 italic">No record</span>
                                                    ) : paid ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            Paid
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEdit({
                                                            row,
                                                            draft: {
                                                                planTier: tier,
                                                                price,
                                                                isPaid: paid
                                                            }
                                                        })}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-colors"
                                                    >
                                                        <Pencil className="w-3 h-3" /> Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {edit && (
                <EditSubscriptionModal
                    edit={edit}
                    saving={saving}
                    onClose={() => (!saving ? setEdit(null) : null)}
                    onChange={(patch) => setEdit((prev) => prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function MetricCard({
    label,
    value,
    Icon,
    accentClass,
    hint
}: {
    label: string;
    value: string;
    Icon: React.ComponentType<{ className?: string }>;
    accentClass: string;
    hint?: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-stone-200/70 shadow-sm p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-stone-500">{label}</span>
                <span className={`p-2 rounded-lg ${accentClass}`}>
                    <Icon className="w-4 h-4" />
                </span>
            </div>
            <div className="font-serif text-4xl text-stone-900 tabular-nums tracking-tight">{value}</div>
            {hint && <div className="text-[0.7rem] text-stone-400 italic">{hint}</div>}
        </div>
    );
}

function EditSubscriptionModal({
    edit,
    saving,
    onClose,
    onChange,
    onSave
}: {
    edit: EditState;
    saving: boolean;
    onClose: () => void;
    onChange: (patch: Partial<SubscriptionPayload>) => void;
    onSave: () => void;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-[1px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-sub-title"
        >
            <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-md w-full">
                <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h3 id="edit-sub-title" className="font-serif text-lg text-stone-900">Edit subscription</h3>
                        <p className="text-xs text-stone-500 mt-1 truncate">
                            {edit.row.bride} &amp; {edit.row.groom} <span className="text-stone-400">· /{edit.row.slug}</span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="text-stone-400 hover:text-stone-700 transition-colors p-1 -mt-1 disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!saving) onSave();
                    }}
                    className="px-6 py-5 space-y-5"
                >
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-stone-500 uppercase tracking-widest block">Plan tier</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['basic', 'premium'] as const).map((tier) => {
                                const selected = edit.draft.planTier === tier;
                                return (
                                    <button
                                        key={tier}
                                        type="button"
                                        onClick={() => onChange({ planTier: tier })}
                                        className={`px-4 py-3 rounded-lg text-sm font-medium border transition-colors capitalize ${
                                            selected
                                                ? 'bg-stone-900 text-white border-stone-900'
                                                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                                        }`}
                                    >
                                        {tier === 'premium' && <Sparkles className="inline w-3 h-3 mr-1.5 -mt-0.5" aria-hidden />}
                                        {tier}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-stone-500 uppercase tracking-widest block" htmlFor="edit-sub-price">Price</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                            <input
                                id="edit-sub-price"
                                type="number"
                                min={0}
                                step={1}
                                value={Number.isFinite(edit.draft.price) ? edit.draft.price : 0}
                                onChange={(e) => {
                                    const next = parseInt(e.target.value, 10);
                                    onChange({ price: Number.isFinite(next) ? Math.max(0, next) : 0 });
                                }}
                                className="w-full pl-8 pr-4 py-3 border border-stone-200 rounded-lg text-stone-900 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400"
                            />
                        </div>
                        <p className="text-[0.65rem] text-stone-400">Whole dollars, no cents.</p>
                    </div>

                    <div>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={edit.draft.isPaid}
                                onChange={(e) => onChange({ isPaid: e.target.checked })}
                                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900">Marked as paid</span>
                        </label>
                    </div>

                    <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2.5 rounded-md text-sm font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2.5 rounded-md text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                        >
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Save changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
