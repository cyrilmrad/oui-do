'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Search, Loader2, MapPin, Armchair } from 'lucide-react';
import type { SeatFinderSettings } from '@/lib/seatFinder';

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
    heroLogoUrl?: string;
    heroImage?: string;
    seatFinderSettings?: SeatFinderSettings;
}

const SHAPE_LABEL: Record<string, string> = {
    round: 'Round table',
    rectangular: 'Rectangular table',
    square: 'Square table',
    curve: 'Curved table',
};

const SCRIPT = 'var(--font-great-vibes, "Great Vibes", cursive)';
const SERIF = 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)';

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
                    heroLogoUrl: data.heroLogoUrl || undefined,
                    heroImage: data.heroImage || undefined,
                    seatFinderSettings: data.seatFinderSettings
                        ? (data.seatFinderSettings as SeatFinderSettings)
                        : undefined,
                });
            })
            .catch(() => setNotFound(true));
    }, [slug]);

    async function handleSearch(e?: React.FormEvent) {
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
    }

    function onQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
        setQuery(e.target.value);
        if (searched) {
            setResults([]);
            setSearched(false);
            setError(null);
        }
    }

    const accent = info?.accent || '#047857';
    const bg = info?.background || '#fafaf9';

    // Derive image treatment from seatFinderSettings
    const sf = info?.seatFinderSettings;
    const bgImageUrl: string | undefined = (() => {
        if (!sf) return undefined;
        if (sf.imageMode === 'hero') return info?.heroImage;
        if (sf.imageMode === 'custom') return sf.customImageUrl;
        return undefined;
    })();
    const logoImageUrl: string | undefined = sf?.imageMode === 'logo' ? info?.heroLogoUrl : undefined;
    // hasBg drives the entire dark/frosted-glass visual mode
    const hasBg = !!bgImageUrl;

    if (notFound) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bg }}>
                <div className="text-center px-8 space-y-3">
                    <Armchair className="mx-auto w-10 h-10 text-stone-300" />
                    <h1 style={{ fontFamily: SERIF, color: accent }} className="text-2xl italic font-light">
                        Seating chart not found
                    </h1>
                    <p className="text-stone-400 text-sm">This link doesn&apos;t point to a valid event.</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="relative min-h-screen flex flex-col items-center px-5 py-12 sm:py-16"
            style={!hasBg ? { background: `linear-gradient(180deg, #ffffff 0%, ${bg} 100%)` } : undefined}
        >
            {/* ── Blurred full-page background (hero / custom mode) ── */}
            {hasBg && (
                <>
                    <div
                        className="fixed inset-0 -z-10"
                        style={{
                            backgroundImage: `url(${bgImageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'blur(24px)',
                            transform: 'scale(1.15)',
                        }}
                    />
                    <div className="fixed inset-0 -z-10" style={{ backgroundColor: 'rgba(0,0,0,0.52)' }} />
                </>
            )}

            <div className="w-full max-w-md">

                {/* ── Header ── */}
                <header className="text-center mb-8">

                    {/* Logo medallion — only for imageMode === 'logo' */}
                    {logoImageUrl && (
                        <img
                            src={logoImageUrl}
                            alt=""
                            className="w-20 h-20 mx-auto mb-6 rounded-full object-cover shadow-lg border-2"
                            style={{ borderColor: `${accent}30` }}
                        />
                    )}

                    <span
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-[10px] tracking-[0.2em] uppercase font-medium mb-6"
                        style={hasBg
                            ? { color: 'white', borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)' }
                            : { color: accent, borderColor: `${accent}30`, backgroundColor: `${accent}08` }
                        }
                    >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                        </svg>
                        Find your seat
                    </span>

                    {info ? (
                        <h1
                            style={{ fontFamily: SCRIPT, color: hasBg ? 'white' : accent }}
                            className="text-5xl sm:text-6xl leading-none mb-2"
                        >
                            {info.bride} &amp; {info.groom}
                        </h1>
                    ) : (
                        <div className={`h-14 w-3/4 mx-auto rounded-lg animate-pulse mb-2 ${hasBg ? 'bg-white/20' : 'bg-stone-200'}`} />
                    )}

                    <p
                        style={{ fontFamily: SERIF, color: hasBg ? 'rgba(255,255,255,0.75)' : accent }}
                        className="text-base italic font-light mb-5"
                    >
                        {info?.seatFinderSettings?.welcomeMessage || "We're so glad you're here"}
                    </p>

                    <div className="flex items-center justify-center gap-3">
                        <div className="h-px w-10" style={{ backgroundColor: hasBg ? 'rgba(255,255,255,0.2)' : `${accent}30` }} />
                        <span className="text-sm" style={{ color: hasBg ? 'rgba(255,255,255,0.35)' : `${accent}60` }} aria-hidden="true">✦</span>
                        <div className="h-px w-10" style={{ backgroundColor: hasBg ? 'rgba(255,255,255,0.2)' : `${accent}30` }} />
                    </div>
                </header>

                {/* ── Search card ── */}
                <div
                    className={`rounded-2xl p-5 mb-5 border ${hasBg
                        ? 'backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
                        : 'bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)]'
                    }`}
                    style={hasBg
                        ? { backgroundColor: 'rgba(255,255,255,0.1)' }
                        : { borderColor: `${accent}20` }
                    }
                >
                    <p
                        className="text-[10px] tracking-[0.2em] uppercase font-medium mb-3"
                        style={{ color: hasBg ? 'rgba(255,255,255,0.55)' : accent }}
                    >
                        Your name on the invitation
                    </p>
                    <form onSubmit={handleSearch} className="space-y-3">
                        <div className="relative">
                            <Search
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                style={{ color: hasBg ? 'rgba(255,255,255,0.45)' : `${accent}80` }}
                            />
                            <input
                                type="text"
                                value={query}
                                onChange={onQueryChange}
                                placeholder="Enter your full name"
                                autoFocus
                                className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-[15px] outline-none transition-shadow min-h-[44px] ${hasBg
                                    ? 'text-white placeholder:text-white/35'
                                    : 'text-stone-800'
                                }`}
                                style={hasBg
                                    ? { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }
                                    : { borderColor: `${accent}30`, backgroundColor: `${accent}05` }
                                }
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="w-full min-h-[44px] rounded-xl text-white text-sm font-semibold tracking-wide disabled:opacity-50 transition-opacity cursor-pointer flex items-center justify-center gap-2"
                            style={{
                                background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                                boxShadow: `0 4px 16px ${accent}40`,
                            }}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find My Seat'}
                        </button>
                    </form>
                </div>

                {/* ── Error ── */}
                {error && (
                    <p className={`text-center text-sm mb-4 ${hasBg ? 'text-rose-300' : 'text-rose-500'}`}>{error}</p>
                )}

                {/* ── No match ── */}
                {searched && !loading && results.length === 0 && !error && (
                    <div
                        className={`rounded-2xl p-8 text-center border ${hasBg
                            ? 'backdrop-blur-md border-white/20'
                            : 'bg-white shadow-sm'
                        }`}
                        style={hasBg
                            ? { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)' }
                            : { borderColor: `${accent}15` }
                        }
                    >
                        <p
                            style={{ fontFamily: SERIF, color: hasBg ? 'rgba(255,255,255,0.9)' : accent }}
                            className="text-xl italic font-light mb-2"
                        >
                            No match found
                        </p>
                        <p className={`text-xs leading-relaxed ${hasBg ? 'text-white/50' : 'text-stone-400'}`}>
                            Try your name as it appears on your invitation,<br />or ask a host for help.
                        </p>
                    </div>
                )}

                {/* ── Results ── */}
                <div className="space-y-4">
                    {results.map((r, i) => (
                        <div
                            key={`${r.guestName}-${i}`}
                            className={`rounded-2xl overflow-hidden border animate-in fade-in slide-in-from-bottom-2 duration-500 ${hasBg
                                ? 'backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
                                : 'bg-white shadow-[0_8px_32px_rgba(0,0,0,0.07)]'
                            }`}
                            style={hasBg
                                ? { backgroundColor: 'rgba(255,255,255,0.1)' }
                                : { borderColor: `${accent}20` }
                            }
                        >
                            {/* Gradient header */}
                            <div
                                className="px-6 py-4"
                                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
                            >
                                <p className="text-[9px] tracking-[0.25em] uppercase font-medium text-white/70 mb-1">
                                    Your seat
                                </p>
                                <p style={{ fontFamily: SERIF }} className="text-[22px] font-light text-white tracking-wide">
                                    {r.guestName}
                                </p>
                            </div>

                            {/* Card body */}
                            <div className="px-6 py-5">
                                {r.table ? (
                                    <>
                                        <p
                                            style={{ fontFamily: SCRIPT, color: hasBg ? 'white' : accent }}
                                            className="text-5xl leading-none mb-1"
                                        >
                                            {r.table.name}
                                        </p>
                                        <p
                                            className="text-[10px] tracking-[0.15em] uppercase font-medium opacity-50 mb-4"
                                            style={{ color: hasBg ? 'white' : accent }}
                                        >
                                            {r.table.shape ? (SHAPE_LABEL[r.table.shape] || r.table.shape) : 'Your table'}
                                        </p>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasBg ? 'bg-white/10' : 'bg-stone-50'}`}>
                                            <MapPin className={`w-4 h-4 ${hasBg ? 'text-white/40' : 'text-stone-300'}`} />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-medium ${hasBg ? 'text-white/80' : 'text-stone-600'}`}>Seat not assigned yet</p>
                                            <p className={`text-xs mt-0.5 ${hasBg ? 'text-white/50' : 'text-stone-400'}`}>Please check with a host on arrival.</p>
                                        </div>
                                    </div>
                                )}

                                {r.tablemates.length > 0 && (
                                    <div
                                        className="pt-4 border-t"
                                        style={{ borderColor: hasBg ? 'rgba(255,255,255,0.1)' : `${accent}15` }}
                                    >
                                        <p
                                            className="text-[9px] tracking-[0.2em] uppercase font-medium mb-3 opacity-50"
                                            style={{ color: hasBg ? 'white' : accent }}
                                        >
                                            You&apos;ll be seated with
                                        </p>
                                        <div className="space-y-1.5">
                                            {r.tablemates.map((name, ni) => (
                                                <p
                                                    key={ni}
                                                    style={{ fontFamily: SERIF, color: hasBg ? 'rgba(255,255,255,0.85)' : accent }}
                                                    className="text-[15px] font-light italic"
                                                >
                                                    &mdash; {name}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Footer ── */}
                <div className="mt-16 text-center">
                    <p
                        className="text-[9px] tracking-[0.3em] uppercase font-light"
                        style={{ color: hasBg ? 'rgba(255,255,255,0.2)' : `${accent}40` }}
                    >
                        Oui by Patricia Ghazara
                    </p>
                </div>

            </div>
        </div>
    );
}
