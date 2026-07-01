'use client';

import { useMemo } from 'react';
import { TrendingUp, Users } from 'lucide-react';

// Mirrors the parent dashboard's `rsvps: any[]` convention (see CLAUDE.md — the
// parent stores RSVPs as any[]; a real Rsvp interface is a tracked follow-up).
interface RsvpAnalyticsProps {
    rsvps: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

function toDayKey(iso: unknown): string | null {
    if (typeof iso !== 'string' || !iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

const DAYS = 14;

/**
 * Read-only RSVP analytics for the dashboard overview, derived entirely from the
 * already-loaded guest list — no extra fetch, no dependencies. The parent only
 * renders this once `rsvps.length > 0`, so the date-based timeline never runs
 * during SSR (avoids hydration mismatch on the day labels).
 */
export default function RsvpAnalytics({ rsvps }: RsvpAnalyticsProps) {
    const stats = useMemo(() => {
        const total = rsvps.length;
        const attending = rsvps.filter((r) => r.status === 'attending').length;
        const declined = rsvps.filter((r) => r.status === 'declined').length;
        const pending = rsvps.filter((r) => r.status === 'pending').length;
        const responded = attending + declined;
        const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
        const acceptanceRate = responded > 0 ? Math.round((attending / responded) * 100) : 0;
        const attendingPax = rsvps
            .filter((r) => r.status === 'attending')
            .reduce((sum, r) => sum + Math.max(1, r.pax || 1), 0);

        // Responses over the trailing DAYS window, bucketed by updatedAt for
        // guests who have actually responded (updatedAt ~= their RSVP time).
        const now = new Date();
        const days = Array.from({ length: DAYS }, (_, i) => {
            const d = new Date(now);
            d.setDate(now.getDate() - (DAYS - 1 - i));
            return { key: d.toISOString().slice(0, 10), label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 };
        });
        const idxByKey = new Map(days.map((d, i) => [d.key, i]));
        for (const r of rsvps) {
            if (r.status === 'pending') continue;
            const key = toDayKey(r.updatedAt);
            if (key && idxByKey.has(key)) days[idxByKey.get(key)!].count += 1;
        }
        const peak = Math.max(1, ...days.map((d) => d.count));
        const recentResponses = days.reduce((sum, d) => sum + d.count, 0);

        const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
        return {
            total, attending, declined, pending, responded, responseRate, acceptanceRate,
            attendingPax, days, peak, recentResponses,
            attendingPctWidth: pct(attending), declinedPctWidth: pct(declined), pendingPctWidth: pct(pending),
        };
    }, [rsvps]);

    return (
        <section aria-label="RSVP analytics" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Response progress */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100 lg:col-span-1">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-stone-700">Response rate</h3>
                    <span className="text-2xl font-serif text-stone-900">{stats.responseRate}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-stone-100 overflow-hidden flex" role="img"
                    aria-label={`${stats.attending} attending, ${stats.declined} declined, ${stats.pending} awaiting reply`}>
                    <div className="h-full bg-emerald-500" style={{ width: `${stats.attendingPctWidth}%` }} />
                    <div className="h-full bg-rose-400" style={{ width: `${stats.declinedPctWidth}%` }} />
                    <div className="h-full bg-amber-300" style={{ width: `${stats.pendingPctWidth}%` }} />
                </div>
                <dl className="mt-4 space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                        <dt className="flex items-center gap-2 text-stone-500"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Attending</dt>
                        <dd className="text-stone-800 font-medium">{stats.attending}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                        <dt className="flex items-center gap-2 text-stone-500"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" />Declined</dt>
                        <dd className="text-stone-800 font-medium">{stats.declined}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                        <dt className="flex items-center gap-2 text-stone-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-300" />Awaiting reply</dt>
                        <dd className="text-stone-800 font-medium">{stats.pending}</dd>
                    </div>
                </dl>
            </div>

            {/* Headcount + acceptance */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100 lg:col-span-1 flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-stone-500">Confirmed headcount</p>
                        <p className="text-3xl font-serif text-stone-900 mt-1">{stats.attendingPax}</p>
                        <p className="text-xs text-stone-400 mt-1">total guests attending (incl. companions)</p>
                    </div>
                    <div className="p-3 rounded-full bg-emerald-50"><Users className="w-6 h-6 text-emerald-600" /></div>
                </div>
                <div className="pt-4 border-t border-stone-100">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-stone-500">Acceptance among replies</span>
                        <span className="font-medium text-stone-800">{stats.acceptanceRate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1.5">
                        <span className="text-stone-500">Still awaiting</span>
                        <span className="font-medium text-stone-800">{stats.pending}</span>
                    </div>
                </div>
            </div>

            {/* Responses over time */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100 lg:col-span-1">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-stone-700">Responses (last {DAYS} days)</h3>
                    <span className="flex items-center gap-1 text-xs text-stone-400"><TrendingUp className="w-3.5 h-3.5" />{stats.recentResponses}</span>
                </div>
                <div className="flex items-end gap-1 h-24" aria-hidden>
                    {stats.days.map((d) => (
                        <div key={d.key} className="flex-1 flex flex-col justify-end" title={`${d.label}: ${d.count}`}>
                            <div
                                className="w-full rounded-t bg-emerald-400/80 min-h-[2px] transition-[height]"
                                style={{ height: `${(d.count / stats.peak) * 100}%` }}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-stone-400">
                    <span>{stats.days[0]?.label}</span>
                    <span>{stats.days[stats.days.length - 1]?.label}</span>
                </div>
            </div>
        </section>
    );
}
