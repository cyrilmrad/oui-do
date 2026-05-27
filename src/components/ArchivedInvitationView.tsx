"use client";

import React from 'react';
import type { InvitationData, Theme } from '@/components/InvitationPreview';
import InvitationGifts from '@/components/InvitationGifts';

interface ArchivedInvitationViewProps {
    data: InvitationData;
}

function resolveTheme(theme?: Theme | null): { accent: string; background: string } {
    const fallback = { accent: 'text-emerald-700', background: 'bg-stone-50' };
    if (!theme) return fallback;
    return {
        accent: theme.accent || fallback.accent,
        background: theme.background || fallback.background
    };
}

/**
 * Public memorial view shown when `invitations.is_archived === true`.
 *
 * Minimal "thank you" hero + gifts/registry block. Everything else from the live
 * invitation (RSVP, schedule, houses, navigation, custom sections, formal invitation,
 * pre-ceremony media, reception details) is intentionally hidden.
 */
export default function ArchivedInvitationView({ data }: ArchivedInvitationViewProps) {
    const cleanTheme = resolveTheme(data.theme);
    const heroSrc = data.heroImage || '';

    return (
        <main className={`min-h-screen ${cleanTheme.background}`}>
            {/* Hero band — softened photo with thank-you title */}
            <section className="relative w-full overflow-hidden" style={{ minHeight: '70vh' }}>
                {heroSrc && (
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${heroSrc})`, filter: 'grayscale(1) brightness(0.75) blur(2px)', opacity: 0.6 }}
                    />
                )}
                <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-32 @md:py-40 max-w-3xl mx-auto">
                    <div className={`text-lg tracking-[0.5em] mb-10 ${cleanTheme.accent}`}>·  ·  ·  &amp;  ·  ·  ·</div>
                    <h1 className="font-serif text-6xl @md:text-8xl text-stone-900 leading-tight mb-8">Thank You.</h1>
                    <p className="font-serif text-lg @md:text-xl text-stone-700 leading-relaxed max-w-xl">
                        With gratitude for every guest who celebrated with us{data.date ? <> on <span className="italic">{data.date}</span></> : null}.
                    </p>
                    <p className="font-serif text-base @md:text-lg text-stone-600 mt-10 italic">
                        — {data.bride} &amp; {data.groom}
                    </p>
                </div>
            </section>

            {/* Gifts & registry — preserved if any options exist */}
            <InvitationGifts
                giftMessage={data.giftMessage}
                giftOptions={data.giftOptions || []}
                accentClass={cleanTheme.accent}
                headerLabel="Gifts & Registry"
                tagline="Your generosity is still welcome."
            />

            {/* Footnote */}
            {data.footnote && (
                <footer className="py-12 text-center text-xs text-stone-400 font-sans tracking-widest uppercase">
                    {data.footnote}
                </footer>
            )}
        </main>
    );
}
