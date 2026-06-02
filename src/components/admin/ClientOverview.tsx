'use client';

import React, { useState, useEffect } from 'react';
import {
    Users, CheckCircle, Wallet, CalendarDays, ArrowRight,
    Loader2, BookOpen, LayoutList, Calendar, Lock, Globe, Archive,
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { toast } from 'sonner';
import type { InvitationData } from '@/components/InvitationPreview';
import type { SelectGuest } from '@/app/actions/seating';
import type { SelectExpense } from '@/app/actions/budget';
import ConfirmDialog from '@/components/ConfirmDialog';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LifecycleState {
    clientLocked: boolean;
    clientLockedAt: string | null;
    isArchived: boolean;
    archivedAt: string | null;
    archiveMessage: string | null;
}

interface ClientOverviewProps {
    liveData: InvitationData;
    guests: SelectGuest[];
    expenses: SelectExpense[];
    accessToken: string | null;
    hasInvitation: boolean;
    onNavigate: (tab: 'builder' | 'budget' | 'seating' | 'schedule') => void;
    onInvitationSaved: (updates: Pick<InvitationData, 'bride' | 'groom' | 'date'>) => void;
    slug?: string;
    lifecycle?: LifecycleState | null;
    onLifecycleChange?: (patch: LifecycleState) => void;
    accounts?: { id: string; email: string }[];
    onAccountsChanged?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
    if (cents === 0) return '$0';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(cents);
}

function formatTimestamp(value: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    accent?: 'stone' | 'emerald' | 'amber';
}

function StatCard({ icon, label, value, sub, accent = 'stone' }: StatCardProps) {
    const accentStyles: Record<string, string> = {
        stone: 'bg-stone-100 text-stone-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
    };
    return (
        <div className="bg-white border border-stone-200/70 rounded-xl shadow-sm p-6 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accentStyles[accent]}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">{label}</p>
                <p className="text-3xl font-serif text-stone-900 mt-0.5 leading-none">{value}</p>
                {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

interface QuickNavButtonProps {
    icon: React.ReactNode;
    label: string;
    description: string;
    onClick: () => void;
}

function QuickNavButton({ icon, label, description, onClick }: QuickNavButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group bg-white border border-stone-200/70 rounded-xl shadow-sm p-5 flex items-center gap-4 hover:border-stone-400 hover:shadow transition-all text-left w-full"
        >
            <div className="w-9 h-9 rounded-lg bg-stone-100 group-hover:bg-stone-900 text-stone-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-900">{label}</p>
                <p className="text-xs text-stone-400 mt-0.5 leading-snug">{description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-600 transition-colors shrink-0" />
        </button>
    );
}

// ─── Accounts section ─────────────────────────────────────────────────────────

interface AccountsSectionProps {
    slug: string;
    accounts: { id: string; email: string }[];
    onAccountsChanged: () => void;
}

function AccountsSection({ slug, accounts, onAccountsChanged }: AccountsSectionProps) {
    const [pendingDelete, setPendingDelete] = useState<{ id: string; email: string } | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleDelete(userId: string) {
        setBusy(true);
        try {
            const res = await fetchWithAuth(`/api/admin/clients/${encodeURIComponent(slug)}/account`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) {
                const { error } = await res.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(typeof error === 'string' ? error : 'Request failed');
            }
            toast.success('Account removed');
            onAccountsChanged();
        } catch (err: unknown) {
            toast.error('Could not remove account', {
                description: err instanceof Error ? err.message : 'Unknown error',
            });
        } finally {
            setBusy(false);
            setPendingDelete(null);
        }
    }

    return (
        <div className="bg-white border border-stone-200/70 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-stone-500" />
                    </div>
                    <span className="text-sm font-semibold text-stone-700">Accounts</span>
                </div>
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full bg-stone-100 text-stone-500">
                    {accounts.length} {accounts.length === 1 ? 'login' : 'logins'}
                </span>
            </div>
            <div className="divide-y divide-stone-100">
                {accounts.length === 0 && (
                    <p className="px-5 py-4 text-sm text-stone-400">No linked accounts.</p>
                )}
                {accounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                        <span className="text-sm text-stone-700 truncate">{acc.email}</span>
                        <button
                            type="button"
                            disabled={busy || accounts.length <= 1}
                            onClick={() => setPendingDelete(acc)}
                            title={accounts.length <= 1 ? 'Cannot remove the only account' : 'Remove account'}
                            className="text-[0.7rem] font-label font-bold uppercase tracking-widest px-3 py-1.5 rounded-md text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </div>

            <ConfirmDialog
                isOpen={pendingDelete !== null}
                tone="danger"
                title="Remove account"
                body={`Remove ${pendingDelete?.email ?? ''} from this wedding? They will lose access to this dashboard. This cannot be undone.`}
                confirmLabel="Remove"
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => { if (pendingDelete) handleDelete(pendingDelete.id); }}
            />
        </div>
    );
}

// ─── Lifecycle section ────────────────────────────────────────────────────────

interface LifecycleSectionProps {
    slug: string;
    lifecycle: LifecycleState;
    onLifecycleChange: (patch: LifecycleState) => void;
}

function LifecycleSection({ slug, lifecycle, onLifecycleChange }: LifecycleSectionProps) {
    const { clientLocked, isArchived, clientLockedAt, archivedAt } = lifecycle;

    const [busy, setBusy] = useState(false);
    const [pending, setPending] = useState<'lock' | 'archive' | null>(null);
    const [localArchiveMessage, setLocalArchiveMessage] = useState(lifecycle.archiveMessage ?? '');
    const [savingMessage, setSavingMessage] = useState(false);

    // Sync textarea when parent refreshes lifecycle data
    useEffect(() => {
        setLocalArchiveMessage(lifecycle.archiveMessage ?? '');
    }, [lifecycle.archiveMessage]);

    async function patchLifecycle(
        patch: { clientLocked?: boolean; isArchived?: boolean; archiveMessage?: string },
        successMessage = 'Lifecycle updated',
    ) {
        setBusy(true);
        try {
            const res = await fetchWithAuth(`/api/admin/clients/${encodeURIComponent(slug)}/lifecycle`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
            });
            if (!res.ok) {
                const { error } = await res.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(typeof error === 'string' ? error : 'Request failed');
            }
            const updated = await res.json();
            onLifecycleChange({
                clientLocked: updated.clientLocked,
                clientLockedAt: updated.clientLockedAt,
                isArchived: updated.isArchived,
                archivedAt: updated.archivedAt,
                archiveMessage: updated.archiveMessage ?? null,
            });
            toast.success(successMessage);
        } catch (err: unknown) {
            toast.error('Could not update lifecycle', {
                description: err instanceof Error ? err.message : 'Unknown error',
            });
        } finally {
            setBusy(false);
            setPending(null);
        }
    }

    async function handleSaveArchiveMessage() {
        setSavingMessage(true);
        try {
            await patchLifecycle({ archiveMessage: localArchiveMessage }, 'Note saved');
        } finally {
            setSavingMessage(false);
        }
    }

    // Derive phase label + badge colors
    const phase = isArchived && clientLocked
        ? { label: 'Closed', cls: 'bg-stone-100 text-stone-500' }
        : isArchived
            ? { label: 'Archived', cls: 'bg-stone-100 text-stone-500' }
            : clientLocked
                ? { label: 'Paused', cls: 'bg-amber-50 text-amber-700' }
                : { label: 'Live', cls: 'bg-emerald-50 text-emerald-700' };

    const phaseDot = isArchived || (isArchived && clientLocked)
        ? 'bg-stone-400'
        : clientLocked
            ? 'bg-amber-400'
            : 'bg-emerald-500';

    return (
        <>
            <div className="bg-white border border-stone-200/70 rounded-xl shadow-sm overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center">
                            <Archive className="w-3.5 h-3.5 text-stone-500" />
                        </div>
                        <span className="text-sm font-semibold text-stone-700">Lifecycle</span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full ${phase.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${phaseDot}`} />
                        {phase.label}
                    </span>
                </div>

                {/* Control 1 — Dashboard access */}
                <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-stone-100">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0">
                            {clientLocked
                                ? <Lock className="w-3.5 h-3.5 text-amber-500" />
                                : <Lock className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.5} />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[0.8rem] font-semibold text-stone-800 leading-tight">Dashboard access</p>
                            <p className="text-[0.68rem] text-stone-400 mt-0.5 leading-tight">
                                {clientLocked
                                    ? 'Client sees a paused-account screen on login'
                                    : 'Client can log in and edit their dashboard'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => clientLocked ? patchLifecycle({ clientLocked: false }) : setPending('lock')}
                        className={`shrink-0 inline-flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                            clientLocked
                                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${clientLocked ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                        {clientLocked ? 'Locked' : 'Active'}
                    </button>
                </div>

                {/* Control 2 — Public invitation */}
                <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0">
                            {isArchived
                                ? <Archive className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.5} />
                                : <Globe className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.5} />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[0.8rem] font-semibold text-stone-800 leading-tight">Public invitation</p>
                            <p className="text-[0.68rem] text-stone-400 mt-0.5 leading-tight">
                                {isArchived
                                    ? 'Shows the memorial thank-you view — gifts preserved'
                                    : `Live at /invite/${slug}`}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => isArchived ? patchLifecycle({ isArchived: false }) : setPending('archive')}
                        className={`shrink-0 inline-flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                            isArchived
                                ? 'bg-stone-100 border-stone-200 text-stone-500 hover:bg-stone-200'
                                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${isArchived ? 'bg-stone-400' : 'bg-emerald-500'}`} />
                        {isArchived ? 'Archived' : 'Live'}
                    </button>
                </div>

                {/* Thank-you note */}
                <div className="px-5 py-4 bg-stone-50 border-t border-stone-100">
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-stone-400 mb-2">
                        Personal thank-you note
                        <span className="normal-case tracking-normal font-normal text-stone-300 ml-1">
                            (shown on archived page)
                        </span>
                    </p>
                    <textarea
                        value={localArchiveMessage}
                        onChange={(e) => setLocalArchiveMessage(e.target.value)}
                        rows={2}
                        placeholder="e.g. For every kind word and shared laugh — our hearts are full."
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-[0.8rem] text-stone-700 italic placeholder:text-stone-300 placeholder:not-italic resize-none focus:outline-none focus:ring-1 focus:ring-stone-300"
                    />
                    <div className="flex justify-end mt-2">
                        <button
                            type="button"
                            onClick={() => void handleSaveArchiveMessage()}
                            disabled={savingMessage || busy}
                            className="text-[0.62rem] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-50 transition-colors"
                        >
                            {savingMessage ? 'Saving…' : 'Save note'}
                        </button>
                    </div>
                </div>

                {/* Timestamps */}
                <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex gap-6">
                    <span className="text-[0.6rem] text-stone-300">
                        Last locked: <span className="text-stone-400 font-medium">{formatTimestamp(clientLockedAt)}</span>
                    </span>
                    <span className="text-[0.6rem] text-stone-300">
                        Last archived: <span className="text-stone-400 font-medium">{formatTimestamp(archivedAt)}</span>
                    </span>
                </div>
            </div>

            {/* Confirm dialogs */}
            <ConfirmDialog
                isOpen={pending === 'lock'}
                title="Lock dashboard access?"
                body="The client will see a paused-account screen the next time they open the dashboard. You can reverse this at any time."
                confirmLabel="Lock account"
                tone="danger"
                onCancel={() => setPending(null)}
                onConfirm={() => void patchLifecycle({ clientLocked: true })}
            />
            <ConfirmDialog
                isOpen={pending === 'archive'}
                title="Archive the public invitation?"
                body="The public invitation will be replaced with the memorial thank-you view. The registry/gift block stays visible. You can reverse this at any time."
                confirmLabel="Archive invitation"
                tone="danger"
                onCancel={() => setPending(null)}
                onConfirm={() => void patchLifecycle({ isArchived: true })}
            />
        </>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ClientOverview({
    liveData,
    guests,
    expenses,
    hasInvitation,
    onNavigate,
    onInvitationSaved,
    slug,
    lifecycle,
    onLifecycleChange,
    accounts,
    onAccountsChanged,
}: ClientOverviewProps) {
    const [miniForm, setMiniForm] = useState({
        bride: liveData.bride || '',
        groom: liveData.groom || '',
        date: liveData.date || '',
    });
    const [isSavingBasics, setIsSavingBasics] = useState(false);

    // ── Derived stats ────────────────────────────────────────────────────────
    const totalGuests = guests.reduce((sum, g) => sum + (g.pax ?? 1), 0);
    const attendingCount = guests
        .filter(g => g.status === 'attending')
        .reduce((sum, g) => sum + (g.pax ?? 1), 0);
    const totalActualBudget = expenses.reduce((sum, e) => sum + (e.actualCost ?? 0), 0);
    const totalEstimatedBudget = expenses.reduce((sum, e) => sum + (e.estimatedCost ?? 0), 0);

    const hasCoupleName = liveData.bride && liveData.groom;
    const displayTitle = hasCoupleName
        ? `${liveData.bride} & ${liveData.groom}`
        : liveData.slug;

    // ── Save basics (new client quick-start) ────────────────────────────────
    const handleSaveBasics = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!miniForm.bride.trim() || !miniForm.groom.trim()) {
            toast.error('Bride and Groom names are required');
            return;
        }
        setIsSavingBasics(true);
        try {
            const payload: Partial<InvitationData> = {
                slug: liveData.slug,
                bride: miniForm.bride.trim(),
                groom: miniForm.groom.trim(),
                date: miniForm.date,
                message: "We can't wait to celebrate our special day with our favorite people.",
            };
            const res = await fetchWithAuth('/api/admin/invitation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(typeof err?.error === 'string' ? err.error : 'Failed to save');
            }
            toast.success('Invitation created', {
                description: `${miniForm.bride} & ${miniForm.groom}`,
            });
            onInvitationSaved({
                bride: miniForm.bride.trim(),
                groom: miniForm.groom.trim(),
                date: miniForm.date,
            });
        } catch (err) {
            toast.error('Failed to save', {
                description: err instanceof Error ? err.message : 'Unknown error',
            });
        } finally {
            setIsSavingBasics(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="w-full h-full overflow-y-auto bg-stone-50/40">
            <div className="max-w-3xl mx-auto px-8 md:px-12 py-10 md:py-14 space-y-10">

                {/* ── Header ───────────────────────────────────────────────── */}
                <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">
                        Client Overview &middot; /{liveData.slug}
                    </p>
                    <h1 className="text-4xl font-serif text-stone-900 leading-tight">
                        {displayTitle}
                    </h1>
                    {liveData.date && (
                        <p className="text-sm text-stone-400 mt-2 flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" aria-hidden />
                            {liveData.date}
                        </p>
                    )}
                </div>

                {/* ── New client quick-start form ───────────────────────────── */}
                {!hasInvitation && (
                    <div className="bg-white border border-amber-200 rounded-2xl shadow-sm p-7 space-y-5">
                        <div>
                            <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-1">
                                No invitation yet
                            </p>
                            <h2 className="text-lg font-serif text-stone-900">
                                Set up the basics to get started
                            </h2>
                            <p className="text-sm text-stone-400 mt-1">
                                Add bride &amp; groom names and the wedding date. You can fill in the full invitation in the builder later.
                            </p>
                        </div>
                        <form onSubmit={(e) => void handleSaveBasics(e)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                                    Bride&apos;s Name <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={miniForm.bride}
                                    onChange={e => setMiniForm(p => ({ ...p, bride: e.target.value }))}
                                    placeholder="e.g. Sarah"
                                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                                    Groom&apos;s Name <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={miniForm.groom}
                                    onChange={e => setMiniForm(p => ({ ...p, groom: e.target.value }))}
                                    placeholder="e.g. Gebran"
                                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                                    Wedding Date
                                </label>
                                <input
                                    type="date"
                                    value={miniForm.date}
                                    onChange={e => setMiniForm(p => ({ ...p, date: e.target.value }))}
                                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                                />
                            </div>
                            <div className="sm:col-span-3 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSavingBasics}
                                    className="bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 font-semibold py-2.5 px-8 rounded-lg text-sm transition-colors flex items-center gap-2"
                                >
                                    {isSavingBasics
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving&hellip;</>
                                        : 'Save & Continue'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── Stat cards ────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                        icon={<Users className="w-5 h-5" />}
                        label="Guests"
                        value={totalGuests}
                        sub="attending + pending"
                        accent="stone"
                    />
                    <StatCard
                        icon={<CheckCircle className="w-5 h-5" />}
                        label="Attending"
                        value={attendingCount}
                        sub={totalGuests > 0 ? `${Math.round((attendingCount / totalGuests) * 100)}% confirmed` : 'no guests yet'}
                        accent="emerald"
                    />
                    <StatCard
                        icon={<Wallet className="w-5 h-5" />}
                        label="Budget Spent"
                        value={formatCurrency(totalActualBudget)}
                        sub={totalEstimatedBudget > 0 ? `of ${formatCurrency(totalEstimatedBudget)} estimated` : 'no budget yet'}
                        accent="amber"
                    />
                </div>

                {/* ── Client Status (lifecycle) ─────────────────────────────── */}
                {slug && lifecycle && onLifecycleChange && (
                    <div>
                        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
                            Client Status
                        </p>
                        <LifecycleSection
                            slug={slug}
                            lifecycle={lifecycle}
                            onLifecycleChange={onLifecycleChange}
                        />
                    </div>
                )}
                {/* ── Accounts ──────────────────────────────────────────────── */}
                {slug && accounts && onAccountsChanged && (
                    <div>
                        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
                            Accounts
                        </p>
                        <AccountsSection
                            slug={slug}
                            accounts={accounts}
                            onAccountsChanged={onAccountsChanged}
                        />
                    </div>
                )}

                {/* ── Quick navigation ──────────────────────────────────────── */}
                <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
                        Quick Access
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <QuickNavButton
                            icon={<BookOpen className="w-4 h-4" />}
                            label="Invitation Builder"
                            description="Edit the public invitation, media, theme, and RSVP settings"
                            onClick={() => onNavigate('builder')}
                        />
                        <QuickNavButton
                            icon={<Wallet className="w-4 h-4" />}
                            label="Budget Tracker"
                            description="Track expenses, suppliers, and payment status"
                            onClick={() => onNavigate('budget')}
                        />
                        <QuickNavButton
                            icon={<LayoutList className="w-4 h-4" />}
                            label="Table Seating"
                            description="Assign guests to tables and manage the seating plan"
                            onClick={() => onNavigate('seating')}
                        />
                        <QuickNavButton
                            icon={<Calendar className="w-4 h-4" />}
                            label="Day-of Schedule"
                            description="Build and share the supplier runsheet for the wedding day"
                            onClick={() => onNavigate('schedule')}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
