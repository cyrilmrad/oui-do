'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Search, Armchair, Users, Loader2, MapPin } from 'lucide-react';

interface MatchResult {
    guestName: string;
    pax: number;
    table: { name: string; shape: string | null } | null;
    tablemates: string[];
}

interface InvitationInfo {
    bride: string;
    groom: string;
    accent?: string;
    background?: string;
}

const SHAPE_LABEL: Record<string, string> = {
    round: 'Round table',
    rectangular: 'Rectangular table',
    square: 'Square table',
    curve: 'Curved table',
};

export default function SeatFinderPage() {
    const params = useParams<{ slug: string }>();
    const slug = params.slug;

    const [info, setInfo] = useState<InvitationInfo | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [results, setResults] = useState<MatchResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;
        fetch(`/api/invitation?slug=${slug}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!data) { setNotFound(true); return; }
                const theme = data.theme || {};
                setInfo({
                    bride: data.bride,
                    groom: data.groom,
                    accent: theme.rawAccent,
                    background: theme.rawBackground,
                });
            })
            .catch(() => setNotFound(true));
    }, [slug]);

    const handleSearch = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim() || !slug) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/seating/lookup?slug=${encodeURIComponent(slug)}&q=${encodeURIComponent(query.trim())}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong');
            setResults(data.results || []);
            setSearched(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, [query, slug]);

    const accent = info?.accent || '#047857';
    const background = info?.background || '#fafaf9';

    if (notFound) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <div className="text-center space-y-3 px-6">
                    <p className="text-4xl">💺</p>
                    <h1 className="text-xl font-semibold text-stone-700">Seating chart not found</h1>
                    <p className="text-stone-400 text-sm">This link doesn&apos;t point to a valid event.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center px-5 py-12 sm:py-16" style={{ backgroundColor: background }}>
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-10">
                    <p className="text-[0.65rem] tracking-[0.3em] uppercase font-light mb-3" style={{ color: accent, opacity: 0.7 }}>
                        Find your seat
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-serif leading-tight text-stone-800">
                        {info ? `${info.bride} & ${info.groom}` : <span className="opacity-0">.</span>}
                    </h1>
                    <div className="flex items-center justify-center gap-3 mt-5">
                        <div className="h-px w-12 opacity-25" style={{ backgroundColor: accent }} />
                        <div className="w-1.5 h-1.5 rounded-full opacity-40" style={{ backgroundColor: accent }} />
                        <div className="h-px w-12 opacity-25" style={{ backgroundColor: accent }} />
                    </div>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter your full name"
                        autoFocus
                        className="w-full pl-11 pr-28 py-3.5 rounded-full bg-white border border-stone-200 text-stone-800 text-sm shadow-sm outline-none focus:ring-2 transition-all"
                        style={{ ['--tw-ring-color' as string]: `${accent}55` }}
                    />
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-5 py-2 rounded-full text-white text-xs font-semibold tracking-wide disabled:opacity-50 transition-opacity flex items-center gap-1.5"
                        style={{ backgroundColor: accent }}
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Find'}
                    </button>
                </form>

                {error && (
                    <p className="text-center text-sm text-rose-500 mb-6">{error}</p>
                )}

                {/* Results */}
                {searched && !loading && results.length === 0 && !error && (
                    <div className="text-center py-10 px-6 rounded-2xl bg-white border border-stone-100 shadow-sm">
                        <p className="text-2xl mb-3">🔍</p>
                        <p className="text-sm font-medium text-stone-600">No match found</p>
                        <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                            Try your name as it appears on your invitation, or ask a host for help.
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    {results.map((r, i) => (
                        <div
                            key={`${r.guestName}-${i}`}
                            className="rounded-2xl bg-white border border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500"
                        >
                            <div className="px-6 pt-5 pb-4 border-b border-stone-100">
                                <p className="text-[0.6rem] tracking-[0.2em] uppercase font-semibold text-stone-400">Guest</p>
                                <h2 className="text-lg font-serif text-stone-800 mt-1">{r.guestName}</h2>
                            </div>
                            <div className="px-6 py-5">
                                {r.table ? (
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: `${accent}14`, color: accent }}
                                        >
                                            <Armchair className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xl font-semibold text-stone-800 leading-tight">{r.table.name}</p>
                                            <p className="text-xs text-stone-400 mt-0.5">
                                                {r.table.shape ? (SHAPE_LABEL[r.table.shape] || r.table.shape) : 'Your table'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 text-stone-500">
                                        <div className="w-11 h-11 rounded-xl bg-stone-50 flex items-center justify-center shrink-0">
                                            <MapPin className="w-5 h-5 text-stone-300" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-stone-600">Seat not assigned yet</p>
                                            <p className="text-xs text-stone-400 mt-0.5">Please check with a host on arrival.</p>
                                        </div>
                                    </div>
                                )}

                                {r.tablemates.length > 0 && (
                                    <div className="mt-5 pt-4 border-t border-stone-100">
                                        <div className="flex items-center gap-1.5 mb-2.5">
                                            <Users className="w-3.5 h-3.5 text-stone-400" />
                                            <p className="text-[0.6rem] tracking-[0.2em] uppercase font-semibold text-stone-400">
                                                Seated with you
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {r.tablemates.map((name, ni) => (
                                                <span
                                                    key={ni}
                                                    className="px-2.5 py-1 rounded-full bg-stone-50 text-xs text-stone-600 border border-stone-100"
                                                >
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-16 text-center">
                    <p className="text-[0.6rem] tracking-[0.3em] uppercase font-light opacity-30" style={{ color: accent }}>
                        OUI BY PATRICIA GHAZARA
                    </p>
                </div>
            </div>
        </div>
    );
}
