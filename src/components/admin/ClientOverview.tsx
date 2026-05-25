'use client';

import React, { useState } from 'react';
import { Users, CheckCircle, Wallet, CalendarDays, ArrowRight, Loader2, BookOpen, LayoutList, Calendar } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { toast } from 'sonner';
import type { InvitationData } from '@/components/InvitationPreview';
import type { SelectGuest } from '@/app/actions/seating';
import type { SelectExpense } from '@/app/actions/budget';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientOverviewProps {
    liveData: InvitationData;
    guests: SelectGuest[];
    expenses: SelectExpense[];
    accessToken: string | null;
    hasInvitation: boolean;
    onNavigate: (tab: 'builder' | 'budget' | 'seating' | 'schedule') => void;
    onInvitationSaved: (updates: Pick<InvitationData, 'bride' | 'groom' | 'date'>) => void;
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

// ─── Component ───────────────────────────────────────────────────────────────

export function ClientOverview({
    liveData,
    guests,
    expenses,
    hasInvitation,
    onNavigate,
    onInvitationSaved,
}: ClientOverviewProps) {
    const [miniForm, setMiniForm] = useState({
        bride: liveData.bride || '',
        groom: liveData.groom || '',
        date: liveData.date || '',
    });
    const [isSavingBasics, setIsSavingBasics] = useState(false);

    // ── Derived stats — use pax so multi-person entries count correctly ──────
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

    // ── Save basics (new client quick-start) ─────────────────────────────────
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

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="w-full h-full overflow-y-auto bg-stone-50/40">
            <div className="max-w-3xl mx-auto px-8 md:px-12 py-10 md:py-14 space-y-10">

                {/* ── Header ───────────────────────────────────────────────── */}
                <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">
                        Client Overview · /{liveData.slug}
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
                                        : 'Save &amp; Continue'}
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
