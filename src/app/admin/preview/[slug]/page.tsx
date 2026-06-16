'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { getExpensesBySlug, type SelectExpense } from '@/app/actions/budget';
import { getSeatingData, type SelectGuest, type SelectSeatingTable } from '@/app/actions/seating';
import { GuestsTab } from '@/components/dashboard/GuestsTab';
import BudgetTracker from '@/components/BudgetTracker';
import TableSeating from '@/components/TableSeating';
import { AllFeaturesProvider } from '@/components/entitlements/EntitlementsContext';
import { Eye, X, Users, CheckCircle, Clock, XCircle, Loader2, Wallet } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type PreviewTab = 'overview' | 'guests' | 'budget' | 'seating';

interface RsvpRow {
    id: string;
    firstName: string;
    lastName: string;
    pax: number;
    status: string;
    message: string | null;
}

interface InvitationSummary {
    bride: string;
    groom: string;
    date: string | null;
    venue: string | null;
}

// ─── Overview cards ───────────────────────────────────────────────────────────

function StatCard({
    icon, label, value, sub, color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    color: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 flex items-start gap-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">{label}</p>
                <p className="text-2xl font-serif text-stone-900 mt-0.5">{value}</p>
                {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminClientPreview() {
    const router = useRouter();
    const { slug } = useParams<{ slug: string }>();

    const [isLoading, setIsLoading] = useState(true);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [invitation, setInvitation] = useState<InvitationSummary | null>(null);
    const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
    const [expenses, setExpenses] = useState<SelectExpense[]>([]);
    const [tables, setTables] = useState<SelectSeatingTable[]>([]);
    const [seatingGuests, setSeatingGuests] = useState<SelectGuest[]>([]);
    const [activeTab, setActiveTab] = useState<PreviewTab>('overview');

    // ── Auth + data load ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!slug) return;

        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || session.user.app_metadata?.role !== 'admin') {
                router.push('/login');
                return;
            }

            const token = session.access_token;
            setAccessToken(token);

            // Parallel fetch of invitation + guests
            const [invRes, guestRes] = await Promise.all([
                fetch(`/api/invitation?slug=${slug}`),
                fetchWithAuth(`/api/guests?slug=${slug}`),
            ]);

            if (invRes.ok) {
                const d = await invRes.json();
                if (d) setInvitation({ bride: d.bride, groom: d.groom, date: d.date, venue: d.venue });
            }
            if (guestRes.ok) setRsvps(await guestRes.json());

            // Feature-gated data — silently skip if feature is disabled
            try { setExpenses(await getExpensesBySlug(slug, token)); } catch { /* disabled */ }
            try {
                const s = await getSeatingData(slug, token);
                setTables(s.tables);
                setSeatingGuests(s.guests);
            } catch { /* disabled */ }

            setIsLoading(false);
        };

        void init();
    }, [slug, router]);

    // ── Derived overview stats ────────────────────────────────────────────────
    const totalPax = rsvps.reduce((n, g) => n + (g.pax ?? 1), 0);
    const attendingPax = rsvps.filter(g => g.status === 'attending').reduce((n, g) => n + (g.pax ?? 1), 0);
    const pendingPax = rsvps.filter(g => g.status === 'pending').reduce((n, g) => n + (g.pax ?? 1), 0);
    const declinedPax = rsvps.filter(g => g.status === 'declined').reduce((n, g) => n + (g.pax ?? 1), 0);
    const totalActual = expenses.reduce((n, e) => n + (e.actualCost ?? 0), 0);
    const totalEstimated = expenses.reduce((n, e) => n + (e.estimatedCost ?? 0), 0);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <div className="flex items-center gap-3 text-stone-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading client preview…</span>
                </div>
            </div>
        );
    }

    const coupleTitle = invitation?.bride && invitation?.groom
        ? `${invitation.bride} & ${invitation.groom}`
        : slug;

    const tabs: { id: PreviewTab; label: string }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'guests', label: 'Guests' },
        { id: 'budget', label: 'Budget' },
        { id: 'seating', label: 'Seating' },
    ];

    return (
        <AllFeaturesProvider>
            <div className="min-h-screen bg-stone-50 flex flex-col">

                {/* ── Preview banner ─────────────────────────────────────── */}
                <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-4 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-700 shrink-0">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm font-semibold uppercase tracking-widest">Preview Mode</span>
                    </div>
                    <p className="text-sm text-amber-700 flex-1 min-w-0">
                        Viewing dashboard as <span className="font-semibold">{coupleTitle}</span>
                        <span className="ml-2 text-amber-500 font-mono text-xs">/{slug}</span>
                    </p>
                    <button
                        type="button"
                        onClick={() => window.close()}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 border border-amber-300 hover:border-amber-500 rounded-md px-3 py-1.5 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" /> Close Preview
                    </button>
                </div>

                {/* ── Tab nav ────────────────────────────────────────────── */}
                <div className="bg-white border-b border-stone-200 px-6 flex gap-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-stone-900 text-stone-900'
                                    : 'border-transparent text-stone-500 hover:text-stone-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Tab content ────────────────────────────────────────── */}
                <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">

                    {/* Overview */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            <div>
                                <h1 className="text-3xl font-serif text-stone-900">{coupleTitle}</h1>
                                {invitation?.date && (
                                    <p className="text-stone-400 text-sm mt-1">{invitation.date}{invitation.venue ? ` · ${invitation.venue}` : ''}</p>
                                )}
                            </div>

                            {/* Guest stats */}
                            <div>
                                <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
                                    Guest Summary ({totalPax} total)
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <StatCard
                                        icon={<CheckCircle className="w-4.5 h-4.5" />}
                                        label="Attending"
                                        value={attendingPax}
                                        sub={totalPax > 0 ? `${Math.round((attendingPax / totalPax) * 100)}% confirmed` : undefined}
                                        color="bg-emerald-50 text-emerald-600"
                                    />
                                    <StatCard
                                        icon={<Clock className="w-4.5 h-4.5" />}
                                        label="Pending"
                                        value={pendingPax}
                                        sub="awaiting response"
                                        color="bg-amber-50 text-amber-600"
                                    />
                                    <StatCard
                                        icon={<XCircle className="w-4.5 h-4.5" />}
                                        label="Declined"
                                        value={declinedPax}
                                        color="bg-rose-50 text-rose-500"
                                    />
                                </div>
                            </div>

                            {/* Budget stats */}
                            {expenses.length > 0 && (
                                <div>
                                    <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">Budget</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <StatCard
                                            icon={<Wallet className="w-4.5 h-4.5" />}
                                            label="Spent"
                                            value={formatCurrency(totalActual)}
                                            sub={totalEstimated > 0 ? `of ${formatCurrency(totalEstimated)} estimated` : undefined}
                                            color="bg-stone-100 text-stone-600"
                                        />
                                        <StatCard
                                            icon={<Users className="w-4.5 h-4.5" />}
                                            label="Budget items"
                                            value={expenses.length}
                                            color="bg-stone-100 text-stone-600"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Guests */}
                    {activeTab === 'guests' && (
                        <GuestsTab
                            userSlug={slug}
                            rsvps={rsvps}
                            setRsvps={setRsvps}
                        />
                    )}

                    {/* Budget */}
                    {activeTab === 'budget' && (
                        <BudgetTracker
                            slug={slug}
                            initialExpenses={expenses}
                            isAdmin={true}
                            accessToken={accessToken}
                        />
                    )}

                    {/* Seating */}
                    {activeTab === 'seating' && (
                        <TableSeating
                            slug={slug}
                            initialTables={tables}
                            initialGuests={seatingGuests}
                            accessToken={accessToken}
                        />
                    )}
                </div>
            </div>
        </AllFeaturesProvider>
    );
}
