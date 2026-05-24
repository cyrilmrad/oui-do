'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScheduleItem {
    id: string;
    type: 'event' | 'separator';
    time?: string;
    title: string;
    notes?: string[];
    supplier?: string;
}

interface WeddingScheduleData {
    id: string;
    slug: string;
    title: string;
    weddingDate?: string;
    backgroundColor: string;
    backgroundImageUrl?: string;
    accentColor: string;
    textColor: string;
    items: ScheduleItem[];
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

/**
 * Parse a time string to minutes-since-midnight.
 * Accepts: "08:30", "8:30", "8H30", "08H30", etc.
 */
function parseTimeStr(t: string): number | null {
    if (!t) return null;
    const m = t.match(/^(\d{1,2})[hH:](\d{2})$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/**
 * Wedding schedules often run past midnight (e.g. "01:30").
 * Treat times before 05:00 as next-day (+1440 min).
 */
function weddingMinutes(raw: number): number {
    return raw < 5 * 60 ? raw + 1440 : raw;
}

/** Current time in wedding-adjusted minutes. */
function nowInMinutes(): number {
    const d = new Date();
    return weddingMinutes(d.getHours() * 60 + d.getMinutes());
}

/**
 * Convert a 24-h "HH:MM" string to "h:MM AM/PM".
 * Returns the original string if it cannot be parsed.
 */
function toAmPm(timeStr: string): string {
    const parsed = parseTimeStr(timeStr);
    if (parsed === null) return timeStr;
    // Normalise to 0–1439 for display (we only add 1440 for comparison, not display)
    const mins = parsed % 1440;
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Format a Date to "h:MM AM/PM". */
function fmtClock(d: Date): string {
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SchedulePage() {
    const params = useParams<{ slug: string }>();
    const slug = params.slug;

    const [schedule, setSchedule] = useState<WeddingScheduleData | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const activeRef = useRef<HTMLDivElement>(null);
    const didScroll = useRef(false);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!slug) return;
        fetch(`/api/schedule/${slug}`)
            .then(r => {
                if (r.status === 404 || !r.ok) { setNotFound(true); return null; }
                return r.json() as Promise<WeddingScheduleData>;
            })
            .then(data => { if (data) setSchedule(data); })
            .catch(() => setNotFound(true));
    }, [slug]);

    // ── Clock (tick every 30 s) ───────────────────────────────────────────────
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(id);
    }, []);

    // ── Auto-scroll to active item once ───────────────────────────────────────
    useEffect(() => {
        if (schedule && activeRef.current && !didScroll.current) {
            didScroll.current = true;
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [schedule]);

    // ── Derive progress and active index ──────────────────────────────────────
    const currentMin = nowInMinutes();

    const timedItems = schedule
        ? schedule.items
            .map((item, idx) => ({
                item, idx,
                min: item.time ? weddingMinutes(parseTimeStr(item.time) ?? -1) : -1,
            }))
            .filter(x => x.min >= 0)
        : [];

    const startMin = timedItems[0]?.min ?? 0;
    const endMin = timedItems[timedItems.length - 1]?.min ?? 0;

    const progress = timedItems.length < 2 ? 0
        : Math.min(100, Math.max(0, ((currentMin - startMin) / (endMin - startMin)) * 100));

    // Active = last timed item whose time <= now
    let activeIdx = -1;
    for (const t of timedItems) {
        if (t.min <= currentMin) activeIdx = t.idx;
    }

    // ── Not found ─────────────────────────────────────────────────────────────
    if (notFound) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <div className="text-center space-y-3 px-6">
                    <p className="text-4xl">📋</p>
                    <h1 className="text-xl font-semibold text-stone-700">Schedule not found</h1>
                    <p className="text-stone-400 text-sm">
                        This schedule hasn&apos;t been published yet. Check back on the wedding day!
                    </p>
                </div>
            </div>
        );
    }

    // ── Loading ───────────────────────────────────────────────────────────────
    if (!schedule) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#cfe8e0' }}>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#00150f', borderTopColor: 'transparent' }} />
                    <p className="text-sm opacity-60" style={{ color: '#00150f' }}>Loading schedule&hellip;</p>
                </div>
            </div>
        );
    }

    const { backgroundColor, backgroundImageUrl, accentColor, textColor } = schedule;

    return (
        <div
            className="min-h-screen relative"
            style={{
                backgroundColor,
                color: textColor,
                ...(backgroundImageUrl && {
                    backgroundImage: `url(${backgroundImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundAttachment: 'fixed',
                }),
            }}
        >
            {/* Overlay when background image is set */}
            {backgroundImageUrl && (
                <div className="fixed inset-0 pointer-events-none" style={{ backgroundColor: `${backgroundColor}cc` }} />
            )}

            {/* ── Progress bar — always visible once items exist ───────────── */}
            {timedItems.length > 0 && (
                <div
                    className="fixed top-0 left-0 right-0 z-50 h-1.5"
                    style={{ backgroundColor: `${accentColor}22` }}
                >
                    <div
                        className="h-full transition-all duration-[1500ms] ease-in-out"
                        style={{ width: `${progress}%`, backgroundColor: accentColor }}
                    />
                </div>
            )}

            {/* ── Sticky clock ─────────────────────────────────────────────── */}
            <div className="fixed top-3 right-4 z-50">
                <span
                    className="text-xs font-mono px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm"
                    style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                >
                    {fmtClock(now)}
                </span>
            </div>

            {/* ── Content ──────────────────────────────────────────────────── */}
            <div className="relative z-10 max-w-xl mx-auto px-6 pt-16 pb-24">

                {/* Title */}
                <div className="text-center mb-12 pt-4">
                    <h1
                        className="text-5xl sm:text-6xl font-headline leading-tight mb-3"
                        style={{ color: accentColor }}
                    >
                        {schedule.title || slug}
                    </h1>
                    {schedule.weddingDate && (
                        <p className="text-sm font-light tracking-[0.18em] uppercase opacity-60" style={{ color: textColor }}>
                            {new Date(schedule.weddingDate + 'T12:00:00').toLocaleDateString('en-US', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                            })}
                        </p>
                    )}
                    <div className="flex items-center justify-center gap-3 mt-6">
                        <div className="h-px w-16 opacity-25" style={{ backgroundColor: accentColor }} />
                        <div className="w-1.5 h-1.5 rounded-full opacity-40" style={{ backgroundColor: accentColor }} />
                        <div className="h-px w-16 opacity-25" style={{ backgroundColor: accentColor }} />
                    </div>
                </div>

                {/* Progress label */}
                {timedItems.length > 1 && (
                    <div className="flex items-center justify-between mb-6 opacity-50">
                        <span className="text-[0.65rem] tracking-widest uppercase font-light">
                            {toAmPm(timedItems[0].item.time!)}
                        </span>
                        <span className="text-[0.65rem] tracking-widest uppercase font-light">
                            {Math.round(progress)}%
                        </span>
                        <span className="text-[0.65rem] tracking-widest uppercase font-light">
                            {toAmPm(timedItems[timedItems.length - 1].item.time!)}
                        </span>
                    </div>
                )}

                {/* Schedule items */}
                <div className="space-y-0.5">
                    {schedule.items.map((item, idx) => {
                        const isActive = idx === activeIdx;
                        const isPast = (() => {
                            if (item.type === 'separator') return false;
                            const parsed = item.time ? parseTimeStr(item.time) : null;
                            if (parsed === null) return false;
                            return weddingMinutes(parsed) < currentMin;
                        })();

                        if (item.type === 'separator') {
                            return (
                                <div key={item.id} className="py-6 flex items-center gap-4">
                                    <div className="h-px flex-1 opacity-20" style={{ backgroundColor: accentColor }} />
                                    {item.title && (
                                        <span className="text-[0.65rem] font-light tracking-[0.25em] uppercase opacity-50 shrink-0" style={{ color: accentColor }}>
                                            {item.title}
                                        </span>
                                    )}
                                    <div className="h-px flex-1 opacity-20" style={{ backgroundColor: accentColor }} />
                                </div>
                            );
                        }

                        return (
                            <div
                                key={item.id}
                                ref={isActive ? activeRef : undefined}
                                className="relative rounded-2xl transition-all duration-500"
                                style={{
                                    opacity: isPast && !isActive ? 0.4 : 1,
                                    backgroundColor: isActive ? `${accentColor}12` : 'transparent',
                                    padding: isActive ? '0.9rem 1.1rem 0.9rem 1.25rem' : '0.5rem 1.1rem 0.5rem 1.25rem',
                                }}
                            >
                                {/* Active left accent bar */}
                                {isActive && (
                                    <div
                                        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                                        style={{ backgroundColor: accentColor }}
                                    />
                                )}

                                <div className="flex items-start gap-4">
                                    {/* Time column — AM/PM format */}
                                    <div className="w-20 shrink-0 text-right pt-0.5">
                                        {item.time ? (
                                            <span
                                                className="text-xs font-mono font-semibold tabular-nums leading-tight whitespace-nowrap"
                                                style={{ color: isActive ? accentColor : textColor, opacity: isActive ? 1 : 0.65 }}
                                            >
                                                {toAmPm(item.time)}
                                            </span>
                                        ) : (
                                            <span className="text-sm opacity-20" style={{ color: textColor }}>—</span>
                                        )}
                                    </div>

                                    {/* Content column */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3
                                                className="text-[0.875rem] font-semibold tracking-wide uppercase leading-snug"
                                                style={{ color: isActive ? accentColor : textColor }}
                                            >
                                                {item.title}
                                            </h3>
                                            {isActive && (
                                                <span
                                                    className="text-[0.55rem] font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: accentColor, color: backgroundColor }}
                                                >
                                                    NOW
                                                </span>
                                            )}
                                        </div>

                                        {item.notes && item.notes.length > 0 && (
                                            <ul className="mt-1.5 space-y-0.5">
                                                {item.notes.map((note, ni) => (
                                                    <li
                                                        key={ni}
                                                        className="text-[0.775rem] font-light tracking-wide leading-snug"
                                                        style={{ color: textColor, opacity: 0.65 }}
                                                    >
                                                        {note}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {item.supplier && (
                                            <p className="mt-1.5 text-[0.65rem] tracking-widest uppercase font-medium opacity-50" style={{ color: accentColor }}>
                                                {item.supplier}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="mt-20 text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="h-px w-12 opacity-20" style={{ backgroundColor: accentColor }} />
                        <div className="w-1 h-1 rounded-full opacity-30" style={{ backgroundColor: accentColor }} />
                        <div className="h-px w-12 opacity-20" style={{ backgroundColor: accentColor }} />
                    </div>
                    <p className="text-[0.6rem] tracking-[0.3em] uppercase font-light opacity-30" style={{ color: accentColor }}>
                        OUI BY PATRICIA GHAZARA
                    </p>
                </div>
            </div>
        </div>
    );
}
